import { describe, expect, it } from 'vitest';
import {
    computeDashboardRange,
    describeDashboardRange,
    formatDashboardAmount,
    formatDashboardCurrency,
    parseDashboardRange,
    resolveDashboardRange,
    serializeDashboardRange,
    summarizePendingActions,
} from '../pages/AdminDashboard/dashboardDisplay';

describe('admin dashboard exact money display', () => {
    it('keeps every digit instead of abbreviating values with K or M', () => {
        expect(formatDashboardCurrency(2_887_500)).toBe('2,887,500 ₫');
        expect(formatDashboardCurrency(275_000)).toBe('275,000 ₫');
        expect(formatDashboardCurrency(1_000_000_000)).toBe('1,000,000,000 ₫');
        expect(formatDashboardAmount(1_600_000)).toBe('1,600,000');
        expect(formatDashboardCurrency(2_887_500)).toMatch(/^\d{1,3}(,\d{3})* ₫$/);
        expect(formatDashboardCurrency(2_887_500)).not.toContain('.');
    });

    it('shows a real zero but keeps unavailable data distinct', () => {
        expect(formatDashboardCurrency(0)).toBe('0 ₫');
        expect(formatDashboardCurrency(undefined)).toBe('—');
        expect(formatDashboardCurrency(Number.NaN)).toBe('—');
    });
});

describe('admin dashboard calendar ranges', () => {
    const now = new Date(2026, 7, 17, 16, 30, 0);

    it('uses exactly seven inclusive calendar days', () => {
        const { from, to } = computeDashboardRange('7d', now);
        expect(from).toEqual(new Date(2026, 7, 11, 0, 0, 0, 0));
        expect(to).toEqual(now);
    });

    it('uses exactly thirty inclusive calendar days', () => {
        const { from, to } = computeDashboardRange('30d', now);
        expect(from).toEqual(new Date(2026, 6, 19, 0, 0, 0, 0));
        expect(to).toEqual(now);
    });

    it('starts today at midnight', () => {
        const { from } = computeDashboardRange('today', now);
        expect(from).toEqual(new Date(2026, 7, 17, 0, 0, 0, 0));
    });

    it('keeps the day of month when stepping back by whole months', () => {
        expect(computeDashboardRange('3m', now).from).toEqual(new Date(2026, 4, 17, 0, 0, 0, 0));
        expect(computeDashboardRange('6m', now).from).toEqual(new Date(2026, 1, 17, 0, 0, 0, 0));
        expect(computeDashboardRange('12m', now).from).toEqual(new Date(2025, 7, 17, 0, 0, 0, 0));
    });

    it('clamps to the last valid day instead of overflowing into the next month', () => {
        // 31/08 lùi 6 tháng rơi vào 31/02 — phải kẹp về 28/02, không nhảy sang tháng 3.
        const endOfAugust = new Date(2026, 7, 31, 9, 0, 0);
        expect(computeDashboardRange('6m', endOfAugust).from).toEqual(new Date(2026, 1, 28, 0, 0, 0, 0));
    });
});

describe('admin dashboard range selection', () => {
    const now = new Date(2026, 7, 17, 16, 30, 0);

    it('round-trips every selection kind through the url param', () => {
        const cases = [
            { kind: 'preset', preset: '6m' },
            { kind: 'month', year: 2026, month: 7 },
            { kind: 'week', start: '2026-07-13' },
            { kind: 'custom', from: '2026-01-01', to: '2026-03-31' },
        ] as const;

        for (const selection of cases) {
            expect(parseDashboardRange(serializeDashboardRange(selection))).toEqual(selection);
        }
    });

    it('falls back to 30 days for missing or malformed params', () => {
        const fallback = { kind: 'preset', preset: '30d' };

        expect(parseDashboardRange(null)).toEqual(fallback);
        expect(parseDashboardRange('')).toEqual(fallback);
        expect(parseDashboardRange('rác')).toEqual(fallback);
        expect(parseDashboardRange('2026-13')).toEqual(fallback);
        expect(parseDashboardRange('w2026-02-30')).toEqual(fallback);
        expect(parseDashboardRange('2026-03-31..2026-01-01')).toEqual(fallback);
    });

    it('normalises any day of a week back to its monday', () => {
        // 16/07/2026 là thứ Năm; link phải mở đúng tuần bắt đầu 13/07.
        expect(parseDashboardRange('w2026-07-16')).toEqual({ kind: 'week', start: '2026-07-13' });
    });

    it('covers a chosen month in full so the backend compares it with the previous month', () => {
        const { from, to } = resolveDashboardRange({ kind: 'month', year: 2026, month: 7 }, now);
        expect(from).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0));
        expect(to).toEqual(new Date(2026, 6, 31, 23, 59, 59, 999));
    });

    it('covers a chosen week from monday to sunday', () => {
        const { from, to } = resolveDashboardRange({ kind: 'week', start: '2026-07-13' }, now);
        expect(from).toEqual(new Date(2026, 6, 13, 0, 0, 0, 0));
        expect(to).toEqual(new Date(2026, 6, 19, 23, 59, 59, 999));
    });

    it('includes the whole last day of a custom range', () => {
        const { from, to } = resolveDashboardRange({ kind: 'custom', from: '2026-01-01', to: '2026-03-31' }, now);
        expect(from).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
        expect(to).toEqual(new Date(2026, 2, 31, 23, 59, 59, 999));
    });

    it('labels each selection the way it is shown on the header', () => {
        expect(describeDashboardRange({ kind: 'preset', preset: '3m' })).toBe('3 tháng qua');
        expect(describeDashboardRange({ kind: 'month', year: 2026, month: 7 })).toBe('Tháng 7/2026');
        expect(describeDashboardRange({ kind: 'week', start: '2026-07-13' })).toBe('Tuần 13/07 – 19/07/2026');
        expect(describeDashboardRange({ kind: 'custom', from: '2026-01-01', to: '2026-03-31' })).toBe(
            '01/01/2026 – 31/03/2026'
        );
    });
});

describe('admin dashboard pending action summary', () => {
    it('includes every category shown in the detail list', () => {
        const summary = summarizePendingActions({
            tutorApprovals: 5,
            pendingCertificates: 1,
            withdrawalReviews: 0,
            overdueCount: 0,
            openDisputes: 2,
            unresolvedAlerts: 0,
        });

        expect(summary).toEqual({
            verification: 6,
            withdrawals: 0,
            disputes: 2,
            alerts: 0,
            total: 8,
        });
    });
});
