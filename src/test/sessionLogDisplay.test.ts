import { describe, expect, it } from 'vitest';
import {
    countDistinctSources,
    formatPunctuality,
    getActivityDisplay,
    getParticipantPresenceState,
    getRefundDisplay,
} from '../components/shared/SessionLogPanel/sessionLogDisplay';

describe('session log decision display', () => {
    it('never presents a refund conclusion while the session is ongoing', () => {
        expect(getRefundDisplay({
            isOngoing: true,
            isEvidenceConclusive: true,
            suggestedRefundPercentage: 100,
        }).value).toBe('Chưa thể kết luận');
    });

    it('never presents a refund conclusion when evidence is inconclusive', () => {
        expect(getRefundDisplay({
            isOngoing: false,
            isEvidenceConclusive: false,
            suggestedRefundPercentage: null,
        }).value).toBe('Chưa thể kết luận');
    });

    it('shows the backend percentage only for a final, conclusive snapshot', () => {
        expect(getRefundDisplay({
            isOngoing: false,
            isEvidenceConclusive: true,
            suggestedRefundPercentage: 50,
        }).value).toBe('50%');
    });
});

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
        const display = getActivityDisplay({
            reportedBeats: 0,
            micOnBeats: 0,
            cameraOnBeats: 0,
            idleRatio: null,
        });

        expect(display.tone).toBe('unknown');
        expect(display.label).toBe('Không rõ');
    });

    it('flags a room left open once most reported beats had nothing publishing', () => {
        const display = getActivityDisplay({
            reportedBeats: 10,
            micOnBeats: 1,
            cameraOnBeats: 0,
            idleRatio: 0.9,
        });

        expect(display.tone).toBe('warning');
        expect(display.label).toContain('90%');
    });

    it('treats teaching by voice with the camera off as ordinary activity', () => {
        const display = getActivityDisplay({
            reportedBeats: 10,
            micOnBeats: 10,
            cameraOnBeats: 0,
            idleRatio: 0,
        });

        expect(display.tone).toBe('ok');
        expect(display.detail).toContain('Mic bật 100%');
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
