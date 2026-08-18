/**
 * Admin payout dashboard overview
 */
export interface PayoutOverview {
    todayStats: TodayStats;
    processingStats: ProcessingStats;
    financialStats: FinancialStats;
    decisionBreakdown: DecisionBreakdown;
    recentAlertsCount: number;
}

export interface TodayStats {
    totalRequests: number;
    autoApproved: number;
    delayed: number;
    manualReview: number;
    rejected: number;
}

export interface ProcessingStats {
    avgProcessingTime: number;
    successRate: number;
    pendingCount: number;
}

export interface FinancialStats {
    totalPayoutToday: number;
    totalPayoutThisMonth: number;
}

export interface DecisionBreakdown {
    totalRequests: number;
    autoApprove: number;
    delayed: number;
    manualReview: number;
    rejected: number;
}

/**
 * Summary for the admin payout dashboard (UI usage)
 */
export interface AdminPayoutSummary {
    totalRequests: number;
    pendingRequests: number;
    totalPendingAmount: number;
    totalPaidThisMonth: number;
}

/**
 * Payout request item flagged for manual review
 */
export interface PendingReviewItem {
    withdrawalId: number;
    tutorId: string;
    tutorName: string;
    tutorEmail: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    status: string;
    requestedAt: string;
}

export interface PendingReviewResponse {
    items: PendingReviewItem[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Withdrawal request item with tutor info (for admin list)
 */
export interface WithdrawalRequestItem {
    withdrawalId: number;
    tutorId: string;
    tutorName: string;
    tutorEmail: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    requestedAt: string;
    status: string;
}

export interface WithdrawalRequestListResponse {
    items: WithdrawalRequestItem[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Comprehensive withdrawal request detail for admin
 */
export interface AdminWithdrawalDetail {
    requestInfo: RequestInfo;
    tutorInfo: TutorInfo;
    previousWithdrawals: PreviousWithdrawal[];
    walletInfo: WalletInfo;
    timeline: TimelineEvent[];
}

export interface RequestInfo {
    withdrawalId: number;
    amount: number;
    status: string;
    decision: string | null;
    bankName: string | null;
    accountNumber: string | null;
    accountHolderName: string | null;
    createdAt: string;
    processedAt: string | null;
    processedBy: string | null;
    /** Tên nhân sự đã duyệt — UI luôn hiển thị tên này, không bao giờ hiện user id. */
    processedByName: string | null;
    completionNote: string | null;
    claimedBy: string | null;
    claimedByName: string | null;
    claimedAt: string | null;
    rejectionReason: string | null;
    transactionId: string | null;
    paidAt: string | null;
    proofImageUrl: string | null;
}

export interface TutorInfo {
    tutorId: string;
    name: string;
    email: string | null;
    phone: string | null;
    accountAgeDays: number;
    completedClassSessions: number;
    totalEarnings: number;
    joinedAt: string;
}

export interface PreviousWithdrawal {
    withdrawalId: number;
    amount: number;
    status: string;
    requestedAt: string;
}

export interface WalletInfo {
    balance: number;
    frozenBalance: number;
    availableBalance: number;
}

export interface TimelineEvent {
    timestamp: string;
    event: string;
    details: string | null;
}

/**
 * System alert for payout integrity
 */
export interface SystemAlertItem {
    alertId: number;
    type: string;
    severity: string;
    message: string;
    resolved: boolean;
    resolvedAt: string | null;
    resolvedBy: string | null;
    createdAt: string;
}

export interface SystemAlertResponse {
    items: SystemAlertItem[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Decision results
 */
export interface ApproveResult {
    success: boolean;
    message: string;
}

export interface ApprovePayoutRequest {
    paidAt: string;
    note: string;
    proofImage: File;
}

export interface RejectResult {
    success: boolean;
    message: string;
}

/**
 * Chuyển tiền chủ động — cộng thẳng vào ví người nhận, không gắn với yêu cầu rút tiền nào.
 * Khác payout: không có bước duyệt thứ hai, không cần thông tin ngân hàng hay ảnh biên lai.
 */
export interface AdminWalletTransferRequest {
    recipientUserId: string;
    amount: number;
    reason: string;
}

export interface AdminWalletTransferResult {
    transferId: number;
    recipientUserId: string;
    recipientName?: string;
    recipientRole?: string;
    amount: number;
    reason: string;
    createdBy: string;
    createdByName?: string;
    createdAt: string;
    recipientNewBalance?: number;
}

export interface AdminWalletTransferListResponse {
    items: AdminWalletTransferResult[];
    totalCount: number;
    page: number;
    pageSize: number;
}

/**
 * Quỹ hệ thống — nguồn duy nhất "Chuyển tiền chủ động" được phép trừ vào.
 */
export interface SystemFund {
    balance: number;
    updatedAt: string;
}

export interface SystemFundTopupRequest {
    amount: number;
    reason: string;
    proofImage: File;
}

export interface SystemFundTopupResult {
    topupId: number;
    amount: number;
    reason: string;
    proofImageUrl?: string;
    createdBy: string;
    createdByName?: string;
    createdAt: string;
    fundBalanceAfter?: number;
}

export interface SystemFundTopupListResponse {
    items: SystemFundTopupResult[];
    totalCount: number;
    page: number;
    pageSize: number;
}
