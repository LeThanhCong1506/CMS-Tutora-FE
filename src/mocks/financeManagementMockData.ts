/**
 * ⚠️ TEMP MOCK DATA — for UI preview/comparison only.
 * Covers the finance-management capabilities still missing/stubbed on the old
 * AdminFinancialsPage (commission config, escrow ops, refunds, reports) — see
 * docs/finance-tax-management-spec.md items A4/A5/A7/A9.
 * Delete this whole file (and its imports in src/pages/AdminFinanceNew/**) once
 * the real BE endpoints ship and the page is wired to a real service instead.
 *
 * NOTE (2026-07-28): A8 "bank account verification" was intentionally dropped —
 * the platform already had automated bank verification via PayOS and removed it
 * on purpose (migration V20260708__remove_payos_payout_and_bank_verification.sql),
 * switching to manual staff transfer + mandatory completion note at payout-approval
 * time instead. Re-adding a standalone "verification status" screen without a real
 * bank-side check would just duplicate what staff already do when approving a
 * withdrawal — see docs/finance-tax-management-spec.md mục E for the reasoning.
 */

// ===== A4: Commission config =====

export interface CommissionConfig {
    parentFeePercent: number;
    tutorFeePercent: number;
    effectiveFrom: string;
    history: { effectiveFrom: string; parentFeePercent: number; tutorFeePercent: number; updatedBy: string }[];
}

export const mockCommissionConfig: CommissionConfig = {
    parentFeePercent: 5,
    tutorFeePercent: 5,
    effectiveFrom: '2026-01-01',
    history: [
        { effectiveFrom: '01/01/2026', parentFeePercent: 5, tutorFeePercent: 5, updatedBy: 'AD Minh' },
        { effectiveFrom: '01/06/2025', parentFeePercent: 6, tutorFeePercent: 5, updatedBy: 'AD Hằng' },
    ],
};

// ===== A5: Escrow management =====

export type EscrowStatus = 'holding' | 'partially_released' | 'stuck';

export interface EscrowBooking {
    bookingCode: string;
    tutorName: string;
    parentName: string;
    amount: number;
    heldSinceDays: number;
    status: EscrowStatus;
}

export const mockEscrowBookings: EscrowBooking[] = [
    { bookingCode: 'BK-88301', tutorName: 'Nguyễn Văn An', parentName: 'Đỗ Thu Hà', amount: 3_600_000, heldSinceDays: 2, status: 'holding' },
    { bookingCode: 'BK-88276', tutorName: 'Lê Hoàng Nam', parentName: 'Vũ Kim Ngân', amount: 5_400_000, heldSinceDays: 5, status: 'partially_released' },
    { bookingCode: 'BK-88190', tutorName: 'Phạm Thu Trang', parentName: 'Lê Minh Quân', amount: 900_000, heldSinceDays: 9, status: 'stuck' },
    { bookingCode: 'BK-88142', tutorName: 'Trần Thị Bích', parentName: 'Ngô Anh Tuấn', amount: 2_200_000, heldSinceDays: 1, status: 'holding' },
];

// ===== A7: Refund management =====

export type RefundStatus = 'pending' | 'investigating' | 'approved' | 'rejected';

export interface RefundRequest {
    id: string;
    bookingCode: string;
    parentName: string;
    tutorName: string;
    amount: number;
    reason: string;
    requestedAt: string;
    status: RefundStatus;
}

export const mockRefundRequests: RefundRequest[] = [
    { id: 'RF-3021', bookingCode: 'BK-88190', parentName: 'Lê Minh Quân', tutorName: 'Phạm Thu Trang', amount: 600_000, reason: 'Gia sư vắng mặt không báo trước', requestedAt: '2026-07-26T10:05:00Z', status: 'investigating' },
    { id: 'RF-3018', bookingCode: 'BK-88055', parentName: 'Ngô Anh Tuấn', tutorName: 'Trần Thị Bích', amount: 450_000, reason: 'Huỷ buổi học trong hạn hoàn tiền', requestedAt: '2026-07-25T08:12:00Z', status: 'pending' },
    { id: 'RF-3002', bookingCode: 'BK-87920', parentName: 'Vũ Kim Ngân', tutorName: 'Lê Hoàng Nam', amount: 1_200_000, reason: 'Khiếu nại chất lượng buổi học', requestedAt: '2026-07-22T15:40:00Z', status: 'approved' },
];

// ===== A9: Financial reports =====

export interface ReportPreviewRow {
    label: string;
    grossVolume: number;
    platformRevenue: number;
    bookingCount: number;
}

export const mockReportPreview: ReportPreviewRow[] = [
    { label: 'Toán', grossVolume: 124_000_000, platformRevenue: 12_400_000, bookingCount: 1240 },
    { label: 'Tiếng Anh', grossVolume: 98_000_000, platformRevenue: 9_800_000, bookingCount: 980 },
    { label: 'Vật lý', grossVolume: 54_000_000, platformRevenue: 5_400_000, bookingCount: 540 },
    { label: 'Hoá học', grossVolume: 31_000_000, platformRevenue: 3_100_000, bookingCount: 310 },
];
