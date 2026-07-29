import { describe, expect, it } from 'vitest';
import { getLessonStatusDisplay } from '../pages/AdminBookings/bookingDisplay';
import { parseIdFilter } from '../utils/idFilter';

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

describe('admin booking id filters', () => {
    it('reads a plain id', () => {
        expect(parseIdFilter('88')).toBe(88);
    });

    it('tolerates surrounding whitespace from a paste', () => {
        expect(parseIdFilter('  12345  ')).toBe(12345);
    });

    it('treats an empty box as no filter rather than as id zero', () => {
        expect(parseIdFilter('')).toBeUndefined();
        expect(parseIdFilter('   ')).toBeUndefined();
    });

    it('rejects ids the database can never hold, instead of sending a guaranteed 400', () => {
        expect(parseIdFilter('0')).toBeUndefined();
        expect(parseIdFilter('-5')).toBeUndefined();
    });

    it('rejects input that Number() would silently accept as a number', () => {
        // Number('12.5') === 12.5 va Number('1e3') === 1000: ca hai deu khong phai
        // id nguoi dung dinh nhap, dung tu lam tron ho ma bo loc luon.
        expect(parseIdFilter('12.5')).toBeUndefined();
        expect(parseIdFilter('1e3')).toBeUndefined();
        expect(parseIdFilter('12abc')).toBeUndefined();
        expect(parseIdFilter('abc')).toBeUndefined();
    });

    it('rejects a value beyond safe integer range', () => {
        expect(parseIdFilter('99999999999999999999')).toBeUndefined();
    });
});
