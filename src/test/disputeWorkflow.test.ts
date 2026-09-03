import { describe, expect, it } from 'vitest';
import {
    getDisputeStatusLabel,
    getDisputeStatusVariant,
    getPriorityVariant,
    getVerdictSuggestion,
    getWarningLevelFromSeverity,
    isBeforeTutorResponseDeadline,
    isImageEvidence,
    MIN_RESOLUTION_NOTE_LENGTH,
    TUTOR_ACTION_PERMISSIONS,
    validateResolution,
    isDisputeSettled,
} from '../pages/AdminDisputes/disputeWorkflow';
import type { SessionLogSummary } from '../types/admin.types';

/**
 * Bản ghi điểm danh tối thiểu. Chỉ những field mà gợi ý phán quyết thực sự đọc mới
 * đáng quan tâm; phần còn lại để giá trị trung tính cho khỏi gây nhiễu ý định test.
 */
const buildSummary = (overrides: Partial<SessionLogSummary> = {}): SessionLogSummary => ({
    snapshotAt: '2026-07-30T10:00:00Z',
    isOngoing: false,
    isEvidenceConclusive: true,
    scheduledStart: '2026-07-30T09:00:00Z',
    scheduledEnd: '2026-07-30T10:00:00Z',
    scheduledSeconds: 3600,
    checkInTime: '2026-07-30T09:00:00Z',
    checkOutTime: '2026-07-30T10:00:00Z',
    firstEventAt: '2026-07-30T09:00:00Z',
    lastEventAt: '2026-07-30T10:00:00Z',
    tutorSeconds: 3600,
    studentSeconds: 3600,
    overlapSeconds: 3600,
    overlapRatio: 1,
    suggestedRefundPercentage: 0,
    eventCount: 12,
    maxIngestLagSeconds: 1,
    tutorHeartbeatSeconds: 3600,
    studentHeartbeatSeconds: 3600,
    heartbeatOverlapSeconds: 3600,
    heartbeatOverlapRatio: 1,
    heartbeatCount: 60,
    tutorLateSeconds: 0,
    tutorEarlyLeaveSeconds: 0,
    punctualitySource: 'agora',
    ...overrides,
});

// ── Luồng: xem bằng chứng ───────────────────────────────────────────────────

describe('dispute evidence review', () => {
    it('treats a signed storage image URL as an image even though a token follows the extension', () => {
        // URL đã ký của storage luôn kèm query; bỏ sót case này thì mọi ảnh bằng
        // chứng đều bị hiển thị thành thẻ tài liệu, admin phải mở tab mới để xem.
        expect(isImageEvidence('https://storage.googleapis.com/b/evidence.jpg?X-Goog-Signature=abc123')).toBe(true);
    });

    it('accepts every image extension the evidence uploader allows, regardless of case', () => {
        for (const url of [
            'a.jpg',
            'a.jpeg',
            'a.PNG',
            'a.gif',
            'a.webp',
        ]) {
            expect(isImageEvidence(url)).toBe(true);
        }
    });

    it('treats documents as documents so they are not rendered as broken thumbnails', () => {
        for (const url of ['report.pdf', 'notes.docx', 'clip.mp4', 'archive.zip']) {
            expect(isImageEvidence(url)).toBe(false);
        }
    });

    it('does not mistake a path segment that merely mentions an image type for an image file', () => {
        expect(isImageEvidence('https://cdn.example.com/png/report.pdf')).toBe(false);
    });
});

// ── Luồng: nhật ký hoạt động → gợi ý hoàn tiền ──────────────────────────────

describe('dispute refund suggestion from the activity log', () => {
    it('offers no suggestion when the log declines to conclude', () => {
        // suggestedRefundPercentage = null là cách bản ghi nói "chứng cứ chưa đủ".
        // Gợi ý bất kỳ phương án nào lúc này trông như hệ thống đang bảo đảm cho nó.
        expect(getVerdictSuggestion(buildSummary({ suggestedRefundPercentage: null }))).toBeNull();
    });

    it('offers no suggestion when there is no log at all', () => {
        expect(getVerdictSuggestion(null)).toBeNull();
    });

    it('suggests a full refund when the log points at a no-show', () => {
        const suggestion = getVerdictSuggestion(
            buildSummary({ suggestedRefundPercentage: 100, overlapSeconds: 0, overlapRatio: 0 }),
        );
        expect(suggestion?.resolution).toBe('refund_100');
    });

    it('suggests splitting the money when attendance was partial', () => {
        const suggestion = getVerdictSuggestion(
            buildSummary({ suggestedRefundPercentage: 50, overlapSeconds: 1800, overlapRatio: 0.5 }),
        );
        expect(suggestion?.resolution).toBe('refund_50');
    });

    it('suggests releasing the money to the tutor when the lesson ran in full', () => {
        const suggestion = getVerdictSuggestion(buildSummary({ suggestedRefundPercentage: 0 }));
        expect(suggestion?.resolution).toBe('release');
    });

    it('ignores a percentage the resolution options cannot express', () => {
        // BE chỉ có refund_100 / refund_50 / release. Một con số như 75 không map
        // được sang lựa chọn nào, nên đừng đoán bừa sang mức gần nhất.
        expect(getVerdictSuggestion(buildSummary({ suggestedRefundPercentage: 75 }))).toBeNull();
    });

    it('reports the attendance figures it based the suggestion on', () => {
        // Gợi ý phải kèm số liệu, vì admin cần kiểm tra được thay vì tin suông.
        const suggestion = getVerdictSuggestion(
            buildSummary({ suggestedRefundPercentage: 50, overlapSeconds: 1800, overlapRatio: 0.5 }),
        );
        expect(suggestion?.detail).toContain('30 phút');
        expect(suggestion?.detail).toContain('50%');
    });

    it('always frames the suggestion as advisory, never as the decision', () => {
        for (const percentage of [0, 50, 100]) {
            const suggestion = getVerdictSuggestion(buildSummary({ suggestedRefundPercentage: percentage }));
            expect(suggestion?.detail).toContain('quyết định vẫn thuộc về bạn');
        }
    });
});

// ── Luồng: chốt phương án ───────────────────────────────────────────────────

describe('dispute resolution validation', () => {
    it('refuses a resolution with no real explanation, since the note is the only audit trail', () => {
        const result = validateResolution({ verdict: 'refund_100', notes: 'ngắn', customPercentage: 50 });
        expect(result.ok).toBe(false);
    });

    it('does not let whitespace pass as an explanation', () => {
        const result = validateResolution({
            verdict: 'refund_100',
            notes: ' '.repeat(MIN_RESOLUTION_NOTE_LENGTH + 5),
            customPercentage: 50,
        });
        expect(result.ok).toBe(false);
    });

    it('accepts a resolution once it is explained', () => {
        const result = validateResolution({
            verdict: 'refund_100',
            notes: 'Gia sư vắng mặt toàn bộ buổi học, hoàn tiền cho phụ huynh.',
            customPercentage: 50,
        });
        expect(result.ok).toBe(true);
    });

    it('rejects a custom percentage outside 0-100', () => {
        const explained = 'Chia theo thời lượng thực tế đã dạy được.';
        expect(validateResolution({ verdict: 'custom', notes: explained, customPercentage: -1 }).ok).toBe(false);
        expect(validateResolution({ verdict: 'custom', notes: explained, customPercentage: 101 }).ok).toBe(false);
    });

    it('accepts the boundary percentages, which are both legitimate outcomes', () => {
        const explained = 'Chia theo thời lượng thực tế đã dạy được.';
        expect(validateResolution({ verdict: 'custom', notes: explained, customPercentage: 0 }).ok).toBe(true);
        expect(validateResolution({ verdict: 'custom', notes: explained, customPercentage: 100 }).ok).toBe(true);
    });

    it('ignores an out-of-range percentage when the verdict is not a custom split', () => {
        // Ô phần trăm vẫn giữ giá trị cũ khi admin đổi sang phương án khác; nó không
        // được gửi lên BE nữa nên đừng chặn người ta vì một field không còn dùng.
        const result = validateResolution({
            verdict: 'refund_100',
            notes: 'Gia sư vắng mặt toàn bộ buổi học, hoàn tiền cho phụ huynh.',
            customPercentage: 999,
        });
        expect(result.ok).toBe(true);
    });
});

// ── Luồng: hạn phản hồi của gia sư ──────────────────────────────────────────

describe('tutor response deadline', () => {
    const now = new Date('2026-07-30T12:00:00Z').getTime();

    it('flags that the tutor still has time, so reviewing early needs a confirmation', () => {
        expect(isBeforeTutorResponseDeadline('2026-07-30T18:00:00Z', now)).toBe(true);
    });

    it('does not flag a deadline that has already passed', () => {
        expect(isBeforeTutorResponseDeadline('2026-07-30T06:00:00Z', now)).toBe(false);
    });

    it('treats a missing deadline as nothing left to wait for', () => {
        expect(isBeforeTutorResponseDeadline(null, now)).toBe(false);
        expect(isBeforeTutorResponseDeadline(undefined, now)).toBe(false);
    });

    it('treats an unparseable deadline as nothing left to wait for rather than blocking review', () => {
        expect(isBeforeTutorResponseDeadline('not-a-date', now)).toBe(false);
    });
});

// ── Luồng: nhắc nhở / cảnh cáo gia sư ───────────────────────────────────────

describe('tutor reminder severity', () => {
    it('maps each severity to the matching backend warning level', () => {
        expect(getWarningLevelFromSeverity('low')).toBe(1);
        expect(getWarningLevelFromSeverity('medium')).toBe(2);
    });

    it('sends the highest severity as level 3, the only level that suspends immediately', () => {
        // Trước đây "high" bị gộp xuống 2, nên lựa chọn nặng nhất trên UI không làm
        // gì khác "trung bình" và luật tạm ngưng ngay của BE không bao giờ chạy.
        expect(getWarningLevelFromSeverity('high')).toBe(3);
    });

    it('falls back to the middle level for an unrecognised severity', () => {
        // Không im lặng bỏ qua, cũng không tự động khóa tài khoản vì một giá trị lạ.
        expect(getWarningLevelFromSeverity('urgent')).toBe(2);
        expect(getWarningLevelFromSeverity('')).toBe(2);
    });
});

// ── Luồng: quyền cho các hành động lên gia sư ───────────────────────────────

describe('tutor action permissions', () => {
    it('gates each tutor action behind the permission its backend endpoint requires', () => {
        // Nút bấm và endpoint phải cùng một quyền, nếu không staff sẽ thấy nút rồi
        // ăn 403, hoặc tệ hơn là làm được việc mà đáng ra không được phép.
        expect(TUTOR_ACTION_PERMISSIONS.reminder).toBe('warning.create');
        expect(TUTOR_ACTION_PERMISSIONS.suspension).toBe('suspension.manage');
        expect(TUTOR_ACTION_PERMISSIONS.accessRemoval).toBe('user.deactivate');
    });

    it('keeps access removal on a different permission from a mere reminder', () => {
        expect(TUTOR_ACTION_PERMISSIONS.accessRemoval).not.toBe(TUTOR_ACTION_PERMISSIONS.reminder);
    });
});

// ── Hiển thị trạng thái hồ sơ ───────────────────────────────────────────────

describe('dispute status display', () => {
    it('labels every status the workflow can reach', () => {
        expect(getDisputeStatusLabel('pending')).toBe('Chờ tiếp nhận');
        expect(getDisputeStatusLabel('investigating')).toBe('Đang xem xét');
        expect(getDisputeStatusLabel('confirmed_no_show')).toBe('Đã xác nhận vắng mặt');
        expect(getDisputeStatusLabel('resolved')).toBe('Đã hoàn tất');
        expect(getDisputeStatusLabel('closed')).toBe('Đã đóng');
    });

    it('shows an unknown status verbatim instead of hiding it behind a guess', () => {
        expect(getDisputeStatusLabel('escalated_to_legal')).toBe('escalated_to_legal');
        expect(getDisputeStatusLabel(null)).toBe('N/A');
        expect(getDisputeStatusLabel(undefined)).toBe('N/A');
    });

    it('keeps unresolved work visually distinct from finished work', () => {
        expect(getDisputeStatusVariant('pending')).toBe('warning');
        expect(getDisputeStatusVariant('investigating')).toBe('info');
        expect(getDisputeStatusVariant('resolved')).toBe('success');
        expect(getDisputeStatusVariant('closed')).toBe('neutral');
    });

    it('escalates priority colour with priority', () => {
        expect(getPriorityVariant('high')).toBe('error');
        expect(getPriorityVariant('medium')).toBe('warning');
        expect(getPriorityVariant('low')).toBe('success');
        expect(getPriorityVariant(null)).toBe('neutral');
    });
});

describe('isDisputeSettled', () => {
    // Hoà giải ("hai bên học tiếp") đóng hồ sơ bằng 'closed', không phải 'resolved'. Chỉ xét
    // 'resolved' khiến trang chi tiết vẫn hiện form "Hủy khóa học & hoàn tiền" trên hồ sơ đã đóng
    // — admin bấm được và tiền đi lần hai. Đây là lỗi đã gặp thật ở phản ánh #155.
    it('coi ca resolved lan closed la da chot xong', () => {
        expect(isDisputeSettled('resolved')).toBe(true);
        expect(isDisputeSettled('closed')).toBe(true);
    });

    it('van cho phan xu khi ho so con mo', () => {
        expect(isDisputeSettled('pending')).toBe(false);
        expect(isDisputeSettled('investigating')).toBe(false);
        expect(isDisputeSettled('confirmed_no_show')).toBe(false);
        expect(isDisputeSettled(null)).toBe(false);
        expect(isDisputeSettled(undefined)).toBe(false);
    });
});
