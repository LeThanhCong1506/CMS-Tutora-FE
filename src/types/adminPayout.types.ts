/**
 * Admin payout dashboard overview
 */
export interface PayoutOverview {
    todayStats: TodayStats;
    processingStats: ProcessingStats;
    financialStats: FinancialStats;
    decisionBreakdown: DecisionBreakdown;
    payOSBalance: PayOSBalance | null;
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
    autoApprove: number;
    delayed: number;
    manualReview: number;
    rejected: number;
}

export interface PayOSBalance {
    balance: number;
    lastChecked: string;
    alertLevel: 'normal' | 'warning' | 'critical';
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
    amount: number;
    trustScore: number | null;
    topFraudFlags: string[];
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
    scoreBreakdown: ScoreBreakdown | null;
    fraudFlags: string[];
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
    payosTransactionId: string | null;
    payosStatus: string | null;
}

export interface TutorInfo {
    tutorId: string;
    name: string;
    email: string | null;
    phone: string | null;
    accountAgeDays: number;
    completedLessons: number;
    totalEarnings: number;
    joinedAt: string;
}

export interface ScoreBreakdown {
    baseScore: number;
    positiveFactors: string[];
    negativeFactors: string[];
    totalScore: number;
    decision: string;
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
 * Fraud log entry
 */
export interface FraudLogItem {
    logId: number;
    tutorId: string;
    tutorName: string;
    withdrawalRequestId: number | null;
    ruleName: string;
    passed: boolean;
    isFlagged: boolean;
    message: string | null;
    checkedAt: string;
}

export interface FraudLogResponse {
    items: FraudLogItem[];
    total: number;
    page: number;
    pageSize: number;
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

export interface RejectResult {
    success: boolean;
    message: string;
}
