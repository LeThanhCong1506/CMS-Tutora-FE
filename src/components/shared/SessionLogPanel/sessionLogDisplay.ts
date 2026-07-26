import type {
    SessionLogDeviceUse,
    SessionLogHeartbeat,
    SessionLogParticipant,
    SessionLogSummary,
} from '../../../types/admin.types';

export type RefundDisplay = {
    value: string;
    hint: string;
};

export const getRefundDisplay = (
    summary: Pick<
        SessionLogSummary,
        'isOngoing' | 'isEvidenceConclusive' | 'suggestedRefundPercentage'
    >,
): RefundDisplay => {
    if (summary.isOngoing) {
        return {
            value: 'Chưa thể kết luận',
            hint: 'Buổi học đang diễn ra; số liệu sẽ tiếp tục được cập nhật.',
        };
    }

    if (!summary.isEvidenceConclusive || summary.suggestedRefundPercentage === null) {
        return {
            value: 'Chưa thể kết luận',
            hint: 'Chưa có đề xuất hoàn tiền.',
        };
    }

    return {
        value: `${summary.suggestedRefundPercentage}%`,
        hint: 'Tham khảo, quyết định vẫn thuộc về bạn.',
    };
};

export type ParticipantPresenceState =
    | 'currently-present'
    | 'recorded'
    | 'unverified-absence'
    | 'no-recorded-entry';

export const getParticipantPresenceState = (
    participant: Pick<
        SessionLogParticipant,
        'appUserId' | 'displayName' | 'identityConfidence' | 'isCurrentlyPresent' | 'joinCount'
    >,
    isEvidenceConclusive: boolean,
): ParticipantPresenceState => {
    if (participant.isCurrentlyPresent) return 'currently-present';
    if (participant.joinCount > 0) return 'recorded';

    const isKnownParticipant = Boolean(participant.appUserId || participant.displayName);
    if (
        isKnownParticipant
        && participant.identityConfidence === 'unmatched'
        && !isEvidenceConclusive
    ) {
        return 'unverified-absence';
    }

    return 'no-recorded-entry';
};

// ── Heartbeat chain ─────────────────────────────────────────────────────────

export type ActivityDisplay = {
    label: string;
    detail: string;
    tone: 'ok' | 'warning' | 'unknown';
};

/**
 * How to describe what a participant's client reported doing.
 *
 * "Unknown" and "idle" must never look alike: a client too old to report anything has to read as
 * missing data, not as a tutor who left the room open.
 */
export const getActivityDisplay = (
    heartbeat: Pick<SessionLogHeartbeat, 'reportedBeats' | 'micOnBeats' | 'cameraOnBeats' | 'idleRatio'>,
    idleThreshold = 0.8,
): ActivityDisplay => {
    if (heartbeat.reportedBeats === 0 || heartbeat.idleRatio === null) {
        return {
            label: 'Không rõ',
            detail: 'Client không gửi trạng thái mic/camera — thiếu dữ liệu, không phải bằng chứng bỏ lớp.',
            tone: 'unknown',
        };
    }

    const micPercent = Math.round((heartbeat.micOnBeats / heartbeat.reportedBeats) * 100);
    const camPercent = Math.round((heartbeat.cameraOnBeats / heartbeat.reportedBeats) * 100);
    const detail = `Mic bật ${micPercent}% · Camera bật ${camPercent}% số nhịp`;

    if (heartbeat.idleRatio >= idleThreshold) {
        return {
            label: `Phòng gần như bỏ trống (${Math.round(heartbeat.idleRatio * 100)}% số nhịp)`,
            detail: `${detail}. Client tự khai — cần đối chiếu thêm trước khi kết luận.`,
            tone: 'warning',
        };
    }

    return { label: 'Có hoạt động', detail, tone: 'ok' };
};

/** Số mạng và số thiết bị khác nhau của một tài khoản trong buổi học. */
export const countDistinctSources = (
    devices: Pick<SessionLogDeviceUse, 'appUserId' | 'ipAddress'>[],
    appUserId: string,
): { networks: number; rows: number } => {
    const mine = devices.filter((device) => device.appUserId === appUserId);
    // Bản ghi không lấy được IP lưu chuỗi rỗng; nó là dữ liệu thiếu, không phải một mạng khác.
    const networks = new Set(mine.map((device) => device.ipAddress).filter(Boolean));
    return { networks: networks.size, rows: mine.length };
};

// ── Punctuality ─────────────────────────────────────────────────────────────

export const formatPunctuality = (
    lateSeconds: number | null,
    earlyLeaveSeconds: number | null,
    source: 'agora' | 'heartbeat' | null,
): { text: string; sourceNote: string | null } => {
    if (source === null) {
        return { text: 'Chưa xác định được giờ vào/ra của gia sư', sourceNote: null };
    }

    const sourceNote = source === 'agora'
        ? 'Theo mốc thời gian máy chủ Agora'
        : 'Theo nhịp heartbeat của client (Agora không có dữ liệu) — bằng chứng yếu hơn';

    const parts: string[] = [];
    if (lateSeconds !== null && lateSeconds > 0) parts.push(`vào trễ ${Math.round(lateSeconds / 60)} phút`);
    if (earlyLeaveSeconds !== null && earlyLeaveSeconds > 0) {
        parts.push(`rời sớm ${Math.round(earlyLeaveSeconds / 60)} phút`);
    }

    return {
        text: parts.length === 0 ? 'Đúng giờ' : `Gia sư ${parts.join(', ')}`,
        sourceNote,
    };
};
