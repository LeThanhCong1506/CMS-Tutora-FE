import { describe, expect, it } from 'vitest';
import {
    buildPersonRows,
    countDistinctSources,
    formatPunctuality,
    getActivityDisplay,
    getParticipantPresenceState,
    getSessionVerdict,
    getStaffWarnings,
} from '../components/shared/SessionLogPanel/sessionLogDisplay';
import type {
    SessionLogHeartbeat,
    SessionLogParticipant,
} from '../types/admin.types';

describe('session log participant display', () => {
    it('does not call a known participant a definite no-show when no Agora UID was matched', () => {
        expect(getParticipantPresenceState({
            appUserId: 'tutor-1',
            displayName: 'Gia sư',
            identityConfidence: 'unmatched',
            isCurrentlyPresent: false,
            joinCount: 0,
        }, false)).toBe('unverified-absence');
    });

    it('allows a final conclusive snapshot to report no recorded entry', () => {
        expect(getParticipantPresenceState({
            appUserId: 'tutor-1',
            displayName: 'Gia sư',
            identityConfidence: 'unmatched',
            isCurrentlyPresent: false,
            joinCount: 0,
        }, true)).toBe('no-recorded-entry');
    });

    it('prioritizes current presence over historical join counts', () => {
        expect(getParticipantPresenceState({
            appUserId: null,
            displayName: null,
            identityConfidence: 'unmatched',
            isCurrentlyPresent: true,
            joinCount: 1,
        }, false)).toBe('currently-present');
    });
});

describe('client-reported activity display', () => {
    it('reads a client that reported nothing as unknown, never as an empty room', () => {
        const display = getActivityDisplay({ reportedBeats: 0, idleRatio: null });

        expect(display.tone).toBe('unknown');
        expect(display.label).toBe('Không rõ hoạt động');
    });

    it('flags a room left open once most reported beats had nothing publishing', () => {
        const display = getActivityDisplay({ reportedBeats: 10, idleRatio: 0.9 });

        expect(display.tone).toBe('warning');
        expect(display.label).toContain('90%');
    });

    it('says nothing extra about an ordinary lesson, and never names mic or camera', () => {
        const display = getActivityDisplay({ reportedBeats: 10, idleRatio: 0 });

        expect(display.tone).toBe('ok');
        expect(display.detail).toBe('');
        expect(display.label).not.toMatch(/[Mm]ic|[Cc]amera/);
    });
});

describe('device and network counting', () => {
    const devices = [
        { appUserId: 'tutor-1', ipAddress: '203.0.113.7' },
        { appUserId: 'tutor-1', ipAddress: '' },
        { appUserId: 'student-1', ipAddress: '198.51.100.4' },
    ];

    it('does not count a failed address capture as a second network', () => {
        expect(countDistinctSources(devices, 'tutor-1')).toEqual({ networks: 1, rows: 2 });
    });

    it('counts only the rows belonging to the account asked about', () => {
        expect(countDistinctSources(devices, 'student-1')).toEqual({ networks: 1, rows: 1 });
    });
});

describe('punctuality display', () => {
    it('says nothing rather than "on time" when no arrival could be established', () => {
        const display = formatPunctuality(null, null, null);

        expect(display.sourceNote).toBeNull();
        expect(display.text).toContain('Chưa xác định');
    });

    it('labels a heartbeat-derived measurement as the weaker source', () => {
        const display = formatPunctuality(900, null, 'heartbeat');

        expect(display.text).toBe('Gia sư vào trễ 15 phút');
        expect(display.sourceNote).toContain('yếu hơn');
    });

    it('reports on time when both numbers are inside the grace period', () => {
        expect(formatPunctuality(0, 0, 'agora').text).toBe('Đúng giờ');
    });
});

// ── Chế độ rút gọn ──────────────────────────────────────────────────────────

const conclusiveSummary = {
    isOngoing: false,
    isEvidenceConclusive: true,
    overlapSeconds: 3300,
    overlapRatio: 0.9167,
    eventCount: 12,
    heartbeatCount: 240,
};

describe('session verdict', () => {
    it('refuses to conclude while the lesson is still running, however good the numbers look', () => {
        const verdict = getSessionVerdict({ ...conclusiveSummary, isOngoing: true }, []);

        expect(verdict.tone).toBe('pending');
        expect(verdict.headline).toBe('Buổi học đang diễn ra');
    });

    it('reads a session with no signal at all as missing data, not as an absence', () => {
        const verdict = getSessionVerdict(
            { ...conclusiveSummary, overlapSeconds: 0, overlapRatio: 0, eventCount: 0, heartbeatCount: 0 },
            ['no_agora_data'],
        );

        expect(verdict.tone).toBe('unknown');
        expect(verdict.detail).toContain('không phải bằng chứng');
    });

    it('never reports a no-show off inconclusive evidence, and says why it will not', () => {
        const verdict = getSessionVerdict(
            { ...conclusiveSummary, isEvidenceConclusive: false, overlapSeconds: 0, overlapRatio: 0 },
            ['identity_uncertain', 'tutor_never_joined'],
        );

        expect(verdict.tone).toBe('unknown');
        expect(verdict.headline).toBe('Chưa đủ căn cứ để kết luận');
        expect(verdict.blockers).toHaveLength(1);
        expect(verdict.blockers[0]).toContain('danh tính');
    });

    it('collapses "Agora empty, client still beating" into one sentence naming the fallback source', () => {
        const verdict = getSessionVerdict(
            { ...conclusiveSummary, isEvidenceConclusive: false, overlapSeconds: 0, overlapRatio: 0, eventCount: 3 },
            ['no_agora_data', 'presence_without_agora'],
        );

        expect(verdict.blockers).toHaveLength(1);
        expect(verdict.blockers[0]).toContain('trình duyệt');
        expect(verdict.blockers[0]).toContain('Agora');
        // Không được nói "webhook" hay các thuật ngữ kỹ thuật khác với admin.
        expect(verdict.blockers[0]).not.toContain('webhook');
    });

    it('only surfaces the single most severe reason when several flags match at once', () => {
        const verdict = getSessionVerdict(
            { ...conclusiveSummary, isEvidenceConclusive: false, overlapSeconds: 0, overlapRatio: 0, eventCount: 3 },
            ['no_agora_data', 'presence_without_agora', 'identity_uncertain', 'unclosed_interval'],
        );

        expect(verdict.blockers).toHaveLength(1);
    });

    it('states a no-show plainly once the backend has vouched for the evidence', () => {
        const verdict = getSessionVerdict(
            { ...conclusiveSummary, overlapSeconds: 0, overlapRatio: 0 },
            ['tutor_never_joined', 'zero_overlap'],
        );

        expect(verdict.tone).toBe('negative');
        expect(verdict.headline).toBe('Gia sư không vào phòng học');
    });

    it('separates a full lesson from a partial one at the refund threshold', () => {
        expect(getSessionVerdict(conclusiveSummary, []).tone).toBe('positive');
        expect(getSessionVerdict({ ...conclusiveSummary, overlapRatio: 0.5 }, []).tone).toBe('partial');
    });
});

describe('staff warnings', () => {
    it('keeps a fixed priority order rather than the order the backend emitted flags', () => {
        const warnings = getStaffWarnings(['token_error', 'idle_presence', 'multiple_devices']);

        expect(warnings.map((warning) => warning.flag)).toEqual([
            'idle_presence',
            'multiple_devices',
            'token_error',
        ]);
    });

    it('drops flags that tell staff nothing actionable', () => {
        expect(getStaffWarnings(['recorder_present', 'no_participant_registry', 'no_device_record'])).toEqual([]);
    });
});

describe('one row per person', () => {
    const participant = (over: Partial<SessionLogParticipant>): SessionLogParticipant => ({
        appUserId: 'tutor-1',
        role: 'tutor',
        displayName: 'Gia sư A',
        agoraUid: '101',
        identityConfidence: 'exact',
        firstJoinAt: '2026-07-28T12:00:00Z',
        lastLeaveAt: '2026-07-28T13:00:00Z',
        totalSeconds: 3600,
        joinCount: 1,
        dropCount: 0,
        platform: 'Web',
        isCurrentlyPresent: false,
        intervals: [],
        disconnects: [],
        ...over,
    });

    const heartbeat = (over: Partial<SessionLogHeartbeat>): SessionLogHeartbeat => ({
        appUserId: 'tutor-1',
        role: 'tutor',
        displayName: 'Gia sư A',
        firstBeatAt: '2026-07-28T12:00:00Z',
        lastBeatAt: '2026-07-28T13:00:00Z',
        totalSeconds: 3600,
        beatCount: 180,
        runCount: 1,
        gapCount: 0,
        isCurrentlyBeating: false,
        reportedBeats: 0,
        micOnBeats: 0,
        cameraOnBeats: 0,
        idleBeats: 0,
        idleRatio: null,
        runs: [],
        ...over,
    });

    it('leaves the Agora recorder out — it is equipment, not a participant', () => {
        const rows = buildPersonRows([participant({ role: 'recorder', appUserId: null })], [], true);

        expect(rows).toEqual([]);
    });

    it('prefers Agora and does not label the row with a weaker source', () => {
        const rows = buildPersonRows([participant({})], [heartbeat({})], true);

        expect(rows).toHaveLength(1);
        expect(rows[0].source).toBe('agora');
        expect(rows[0].state).toBe('attended');
    });

    it('falls back to the heartbeat chain only when Agora saw nothing, and says so', () => {
        const rows = buildPersonRows(
            [participant({ joinCount: 0, totalSeconds: 0, agoraUid: null, identityConfidence: 'unmatched' })],
            [heartbeat({})],
            true,
        );

        expect(rows[0].source).toBe('heartbeat');
        expect(rows[0].totalSeconds).toBe(3600);
    });

    it('will not call anyone absent until the evidence is conclusive', () => {
        const absent = participant({
            joinCount: 0,
            totalSeconds: 0,
            agoraUid: null,
            identityConfidence: 'unmatched',
            firstJoinAt: null,
            lastLeaveAt: null,
        });

        expect(buildPersonRows([absent], [], false)[0].state).toBe('unverified');
        expect(buildPersonRows([absent], [], true)[0].state).toBe('absent');
    });

    it('surfaces who was idle, which the session-level flag cannot say', () => {
        const rows = buildPersonRows(
            [participant({})],
            [heartbeat({ reportedBeats: 100, idleRatio: 0.92 })],
            true,
        );

        expect(rows[0].note).toContain('92%');
    });

    it('folds the parent into the student row instead of tracking them separately', () => {
        const rows = buildPersonRows(
            [
                participant({ appUserId: 'student-1', role: 'student', displayName: 'Lê Minh A' }),
                participant({
                    appUserId: 'parent-1',
                    role: 'parent',
                    displayName: 'Phan Gia Nam',
                    joinCount: 0,
                    totalSeconds: 0,
                    agoraUid: null,
                    identityConfidence: 'unmatched',
                }),
            ],
            [],
            true,
        );

        expect(rows).toHaveLength(1);
        expect(rows[0].role).toBe('student');
        expect(rows[0].parentName).toBe('Phan Gia Nam');
    });

    it('keeps the parent as their own row when the student has no account of their own', () => {
        // Backend chỉ sinh dòng học viên khi học viên có tài khoản riêng. Không có dòng đó nghĩa là
        // phụ huynh chính là người ngồi học — gộp đi sẽ xoá mất bằng chứng có mặt của phía học viên.
        const rows = buildPersonRows(
            [
                participant({ appUserId: 'tutor-1', role: 'tutor' }),
                participant({ appUserId: 'parent-1', role: 'parent', displayName: 'Phan Gia Nam' }),
            ],
            [],
            true,
        );

        expect(rows).toHaveLength(2);
        expect(rows.some((row) => row.role === 'parent')).toBe(true);
        expect(rows.every((row) => row.parentName === undefined)).toBe(true);
    });
});
