/**
 * ⚠️ TEMP MOCK FALLBACK — for local UI preview only, while the backend
 * (Tutora-Backend) isn't running so the real /admin/financials/* endpoints
 * return nothing. Used ONLY as a catch-block fallback in AdminFinancialsPage
 * so the "old" page has comparable data to the new AdminTax module.
 * Delete this file and the two `catch` fallbacks in AdminFinancialsPage.tsx
 * once done comparing (search for "TEMP: mock fallback").
 */
import type { AdminTransactionItem, FinancialMetrics } from '../types/admin.types';
import type { WithdrawalRequestItem } from '../types/adminPayout.types';

export const mockFinancialMetrics: FinancialMetrics = {
    revenue: {
        totalPlatformRevenue: 1_284_000_000,
        totalGrossVolume: 12_840_000_000,
        currentMonthRevenue: 28_540_000,
        previousMonthRevenue: 26_040_000,
        monthOverMonthGrowthPercent: 9.6,
        currentYearRevenue: 168_400_000,
        totalEscrowed: 64_200_000,
    },
    bookings: {
        total: 4820,
        active: 213,
        completed: 4390,
        cancelled: 217,
        pendingTutor: 12,
        newThisPeriod: 186,
        byStatus: [
            { status: 'completed', count: 4390 },
            { status: 'active', count: 213 },
            { status: 'cancelled', count: 217 },
        ],
        byTeachingMode: [
            { mode: 'online', count: 3210 },
            { mode: 'offline', count: 1610 },
        ],
    },
    classSessions: {
        totalCompleted: 15420,
        totalScheduled: 480,
        totalNoShow: 62,
        totalCancelled: 140,
        totalDisputed: 18,
        completionRatePercent: 96.4,
        noShowRatePercent: 0.4,
        totalClassSessionRevenue: 201_800_000,
    },
    users: {
        totalTutors: 618,
        totalParents: 2140,
        totalStudents: 2540,
        activeTutors: 512,
        newTutorsThisMonth: 24,
        newParentsThisMonth: 96,
        averageTutorRating: 4.7,
    },
    withdrawals: {
        totalPending: 18,
        totalPendingAmount: 42_600_000,
        totalApproved: 214,
        totalApprovedAmount: 486_200_000,
        totalRejected: 9,
        totalRejectedAmount: 6_400_000,
        totalCancelled: 4,
        totalCancelledAmount: 1_100_000,
        processedThisMonth: 62,
        processedAmountThisMonth: 201_800_000,
    },
    escrow: {
        totalFrozenBalance: 64_200_000,
        totalReleasedToTutors: 201_800_000,
        totalRefundedToParents: 12_600_000,
    },
    revenueTrend: [
        { label: 'T2', platformRevenue: 18_000_000, grossVolume: 180_000_000, bookingCount: 640, classSessionsCompleted: 2280 },
        { label: 'T3', platformRevenue: 21_000_000, grossVolume: 210_000_000, bookingCount: 710, classSessionsCompleted: 2410 },
        { label: 'T4', platformRevenue: 19_500_000, grossVolume: 195_000_000, bookingCount: 680, classSessionsCompleted: 2350 },
        { label: 'T5', platformRevenue: 24_000_000, grossVolume: 240_000_000, bookingCount: 790, classSessionsCompleted: 2600 },
        { label: 'T6', platformRevenue: 26_000_000, grossVolume: 260_000_000, bookingCount: 840, classSessionsCompleted: 2740 },
        { label: 'T7', platformRevenue: 28_500_000, grossVolume: 285_000_000, bookingCount: 880, classSessionsCompleted: 2840 },
    ],
    topSubjects: [
        { subjectId: 1, subjectName: 'Toán', bookingCount: 1240, totalRevenue: 62_000_000 },
        { subjectId: 2, subjectName: 'Tiếng Anh', bookingCount: 980, totalRevenue: 51_400_000 },
        { subjectId: 3, subjectName: 'Vật lý', bookingCount: 540, totalRevenue: 28_600_000 },
    ],
    filterFrom: null,
    filterTo: null,
    period: 'month',
};

export const mockLedgerTransactions: AdminTransactionItem[] = [
    { transactionId: 90213, walletId: 4021, userId: 'TUT-1042', userFullName: 'Nguyễn Văn An', userEmail: 'an.nguyen@tutora.vn', userRole: 'Tutor', amount: 1_350_000, transactionType: 'EscrowRelease', description: 'Giải ngân buổi học BK-88213', referenceId: 88213, referenceTable: 'Booking', orderCode: 88213, createdAt: '2026-07-27T02:14:00Z' },
    { transactionId: 90212, walletId: 5510, userId: 'PAR-2210', userFullName: 'Đỗ Thu Hà', userEmail: 'ha.do@tutora.vn', userRole: 'Parent', amount: 900_000, transactionType: 'Payment', description: 'Thanh toán buổi học', referenceId: 88214, referenceTable: 'Booking', orderCode: 88214, createdAt: '2026-07-27T01:52:00Z' },
    { transactionId: 90205, walletId: 4078, userId: 'TUT-1078', userFullName: 'Trần Thị Bích', userEmail: 'bich.tran@tutora.vn', userRole: 'Tutor', amount: 4_200_000, transactionType: 'Withdrawal', description: 'Yêu cầu rút tiền WD-10432', referenceId: 10432, referenceTable: 'Withdrawalrequest', orderCode: null, createdAt: '2026-07-26T14:30:00Z' },
    { transactionId: 90198, walletId: 5480, userId: 'PAR-2189', userFullName: 'Lê Minh Quân', userEmail: 'quan.le@tutora.vn', userRole: 'Parent', amount: 600_000, transactionType: 'Refund', description: 'Hoàn tiền hủy buổi học', referenceId: 88170, referenceTable: 'Booking', orderCode: 88170, createdAt: '2026-07-26T10:05:00Z' },
    { transactionId: 90180, walletId: 4103, userId: 'TUT-1103', userFullName: 'Lê Hoàng Nam', userEmail: 'nam.le@tutora.vn', userRole: 'Tutor', amount: 2_100_000, transactionType: 'EscrowRelease', description: 'Giải ngân buổi học BK-88204', referenceId: 88204, referenceTable: 'Booking', orderCode: 88204, createdAt: '2026-07-26T03:41:00Z' },
];

export const mockWithdrawalRequests: WithdrawalRequestItem[] = [
    { withdrawalId: 10432, tutorId: 'TUT-1078', tutorName: 'Trần Thị Bích', tutorEmail: 'bich.tran@tutora.vn', amount: 4_200_000, bankName: 'Vietcombank', accountNumber: '0071004471', requestedAt: '2026-07-26T09:12:00Z', status: 'pending' },
    { withdrawalId: 10431, tutorId: 'TUT-1042', tutorName: 'Nguyễn Văn An', tutorEmail: 'an.nguyen@tutora.vn', amount: 2_800_000, bankName: 'ACB', accountNumber: '2190219021', requestedAt: '2026-07-26T08:40:00Z', status: 'pending' },
    { withdrawalId: 10428, tutorId: 'TUT-1103', tutorName: 'Lê Hoàng Nam', tutorEmail: 'nam.le@tutora.vn', amount: 6_500_000, bankName: 'Techcombank', accountNumber: '19091187233', requestedAt: '2026-07-25T14:05:00Z', status: 'approved' },
    { withdrawalId: 10420, tutorId: 'TUT-1155', tutorName: 'Phạm Thu Trang', tutorEmail: 'trang.pham@tutora.vn', amount: 1_200_000, bankName: 'MB Bank', accountNumber: '0339045501', requestedAt: '2026-07-24T11:30:00Z', status: 'rejected' },
];
