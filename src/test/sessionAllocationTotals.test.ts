import { describe, expect, it } from 'vitest';
import { computeAllocationTotals } from '../pages/AdminDisputes/sessionAllocationTotals';
import type {
    CancelPreviewSessionRow,
    CourseCancelPreviewDto,
    SessionAllocation,
} from '../services/admin.service';

/**
 * Khóa mốc: 10 buổi, gốc 50.000đ/buổi, phí 5% mỗi bên.
 *     gia sư nhận 47.500đ/buổi · phụ huynh hoàn 50.000đ/buổi · phí mỗi bên 2.500đ/buổi
 */
const row = (id: number, over: Partial<CancelPreviewSessionRow> = {}): CancelPreviewSessionRow => ({
    classSessionId: id,
    sessionNumber: id,
    scheduledStart: '2026-09-04T02:00:00Z',
    status: 'scheduled',
    isDisputedSession: false,
    isAlreadySettled: false,
    isCancelled: false,
    isAllocatable: true,
    tutorSeconds: null,
    studentSeconds: null,
    overlapSeconds: null,
    hasAttendanceData: false,
    isEvidenceConclusive: false,
    tutorAmount: 47_500,
    parentAmount: 50_000,
    defaultAllocation: 'parent',
    ...over,
});

const preview = (sessions: CancelPreviewSessionRow[]): CourseCancelPreviewDto =>
    ({
        bookingId: 330,
        remainingSessionsCount: 7,
        parentRefundAmount: 350_000,
        deliveredSessionsCount: 0,
        tutorEscrowReleased: 0,
        tutorEscrowReversed: 0,
        tutorFrozenBalance: 475_000,
        warnings: [],
        sessions,
        refundIncludesServiceFee: false,
        tutorAmountPerSession: 47_500,
        parentAmountPerSession: 50_000,
        parentServiceFeePerSession: 2_500,
        tutorPlatformFeePerSession: 2_500,
        sessionsPaidByParent: 10,
        totalCollectedFromParent: 525_000,
    }) as CourseCancelPreviewDto;

const allocate = (entries: [number, SessionAllocation][]): Record<number, SessionAllocation> =>
    Object.fromEntries(entries);

describe('computeAllocationTotals', () => {
    it('theo dung o tick, khong theo so tu dong cua backend', () => {
        // Bug thật: preview nói remainingSessionsCount = 7 nhưng Admin/Staff tick 8 buổi cho phụ
        // huynh. Hộp xác nhận đọc số của backend nên hiện "7 buổi / 350.000đ" — sai với lựa chọn,
        // ngay tại bước không hoàn tác được.
        const sessions = Array.from({ length: 10 }, (_, i) => row(i + 1));
        const totals = computeAllocationTotals(
            preview(sessions),
            allocate(sessions.map((s, i) => [s.classSessionId, i < 8 ? 'parent' : 'tutor'])),
        );

        expect(totals.parentCount).toBe(8);
        expect(totals.parent).toBe(400_000); // 8 × 50.000, KHÔNG phải 350.000 của số tự động
        expect(totals.tutorCount).toBe(2);
        expect(totals.tutor).toBe(95_000);
        expect(totals.unassigned).toBe(0);
    });

    it('buoi da chot van tinh cho gia su du khong tick duoc', () => {
        const sessions = [row(1, { isAlreadySettled: true, isAllocatable: false }), row(2), row(3)];
        const totals = computeAllocationTotals(
            preview(sessions),
            allocate([
                [2, 'parent'],
                [3, 'parent'],
            ]),
        );

        expect(totals.tutorCount).toBe(1);
        expect(totals.tutor).toBe(47_500);
        expect(totals.parentCount).toBe(2);
        expect(totals.unassigned).toBe(0);
    });

    it('buoi da huy khong thuoc ve ben nao va khong bi doi tick', () => {
        const sessions = [row(1, { isCancelled: true, isAllocatable: false }), row(2)];
        const totals = computeAllocationTotals(preview(sessions), allocate([[2, 'tutor']]));

        expect(totals.parentCount).toBe(0);
        expect(totals.tutorCount).toBe(1);
        expect(totals.unassigned).toBe(0);
    });

    it('dem so buoi con chua chon de khoa nut xac nhan', () => {
        const sessions = [row(1), row(2), row(3)];
        const totals = computeAllocationTotals(preview(sessions), allocate([[1, 'tutor']]));

        expect(totals.unassigned).toBe(2);
    });

    it('da tra dot 2: phi dich vu o lai voi moi buoi', () => {
        const sessions = Array.from({ length: 10 }, (_, i) => row(i + 1));
        const totals = computeAllocationTotals(
            preview(sessions),
            allocate(sessions.map((s, i) => [s.classSessionId, i < 1 ? 'tutor' : 'parent'])),
        );

        // Hoàn theo giá gốc nên phí dịch vụ không bị hoàn: 10 × 2.500 + 1 buổi gia sư × 2.500
        expect(totals.revenue).toBe(27_500);
    });

    it('chua tra dot 2: buoi hoan cho phu huynh khong sinh doanh thu', () => {
        // Bug thật: khóa mới đóng cọc thì hoàn NGUYÊN 52.500đ gồm cả phí dịch vụ, nên nền tảng
        // không giữ lại đồng nào của buổi đó. Công thức cũ vẫn cộng 2.500đ vào doanh thu.
        const sessions = [row(1, { parentAmount: 52_500 })];
        const base = preview(sessions);
        const totals = computeAllocationTotals(
            { ...base, refundIncludesServiceFee: true, sessionsPaidByParent: 1 },
            allocate([[1, 'parent']]),
        );

        expect(totals.parent).toBe(52_500);
        expect(totals.revenue).toBe(0);
    });

    it('chua tra dot 2 nhung tick cho gia su: phi dich vu van o lai', () => {
        // Phụ huynh không được hoàn buổi đó nên phí dịch vụ không đi đâu cả, cộng thêm phí sàn.
        const sessions = [row(1, { parentAmount: 52_500 })];
        const base = preview(sessions);
        const totals = computeAllocationTotals(
            { ...base, refundIncludesServiceFee: true, sessionsPaidByParent: 1 },
            allocate([[1, 'tutor']]),
        );

        expect(totals.revenue).toBe(5_000); // 2.500 phí dịch vụ + 2.500 phí sàn
    });
});
