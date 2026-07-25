import { describe, expect, it } from 'vitest';
import { getLessonStatusDisplay } from '../pages/AdminBookings/bookingDisplay';

describe('admin booking lesson status display', () => {
    it('shows an in-progress lesson without an end time as ongoing', () => {
        expect(getLessonStatusDisplay('in_progress')).toEqual({
            label: 'Đang diễn ra',
            variant: 'warning',
        });
    });

    it('shows a checked-out in-progress lesson as awaiting the tutor report', () => {
        expect(getLessonStatusDisplay('in_progress', '2026-07-23T20:14:00+07:00')).toEqual({
            label: 'Chờ gửi báo cáo',
            variant: 'warning',
        });
        expect(getLessonStatusDisplay('IN_PROGRESS', '2026-07-23T20:14:00+07:00')).toEqual({
            label: 'Chờ gửi báo cáo',
            variant: 'warning',
        });
    });

    it('does not override a final status just because an end time exists', () => {
        expect(getLessonStatusDisplay('completed', '2026-07-23T20:14:00+07:00')).toEqual({
            label: 'Hoàn thành',
            variant: 'success',
        });
        expect(getLessonStatusDisplay('pending_confirmation', '2026-07-23T20:14:00+07:00')).toEqual({
            label: 'Chờ xác nhận',
            variant: 'warning',
        });
    });

    it('keeps the existing fallback for a missing status', () => {
        expect(getLessonStatusDisplay(undefined, '2026-07-23T20:14:00+07:00')).toEqual({
            label: '—',
            variant: 'neutral',
        });
    });
});
