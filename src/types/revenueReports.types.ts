export interface RevenueSummary {
    /** Phí của buổi đã dạy xong */
    recognisedRevenue: number;
    recognisedPrevious: number;
    /** Toàn bộ phí tính tại ngày thực hiện booking */
    contractedRevenue: number;
    contractedPrevious: number;
    /** Đã thu tiền nhưng chưa dạy — nợ dịch vụ */
    deferredRevenue: number;
    deferredPrevious: number;
    gmv: number;
    gmvPrevious: number;
    cashCollected: number;
    cashPrevious: number;
}

export interface RevenueTrendPoint {
    month: string;
    recognised: number;
    contracted: number;
    aiRevenue: number;
    gmv: number;
}

export interface NamedValue {
    name: string;
    value: number;
}

export interface FunnelStep {
    stage: string;
    label: string;
    count: number;
}

export interface RevenueOverviewResponse {
    summary: RevenueSummary;
    trend: RevenueTrendPoint[];
    revenueMix: NamedValue[];
    bookingFunnel: FunnelStep[];
}

// Ghi nhận doanh thu
export interface DeferredAgingBucket {
    bucket: string;
    amount: number;
    bookings: number;
}

export interface StalledBookingStats {
    count: number;
    countPrevious: number;
    contractedFeeAtRisk: number;
    dropOffRate: number;
    dropOffPrevious: number;
}

/** Đã trả đợt 1 nhưng chưa học buổi nào, tồn quá 14 ngày. */
export interface NeverStartedStats {
    count: number;
    countPrevious: number;
    /** Hoa hồng của toàn bộ buổi đã bán chưa dạy */
    feeAtRisk: number;
    /** Tiền khách đã trả đang nằm im (GMV) */
    cashHeld: number;
}

export interface StalledTrendPoint {
    month: string;
    stalled: number;
    converted: number;
}

export interface BookingProgressRow {
    bookingId: number;
    parentName: string;
    tutorName: string;
    subject: string;
    totalSessions: number;
    deliveredSessions: number;
    /** Tổng doanh thu nền tảng của booking (phí phụ huynh + phí sàn gia sư). Xem tách 2 nguồn
     *  ở trang chi tiết: /admin-portal/bookings/:id */
    contractedFee: number;
    /** Phần doanh thu đã thực hiện: phí/buổi × số buổi đã quyết toán. */
    recognisedFee: number;
    createdAt: string | null;
    status: string;
}

export interface RefundStats {
    amount: number;
    amountPrevious: number;
    count: number;
    countPrevious: number;
    rateOfCash: number;
}

export interface RefundTrendPoint {
    month: string;
    amount: number;
    count: number;
}

export interface RevenueRecognitionResponse {
    summary: RevenueSummary;
    deferredAging: DeferredAgingBucket[];
    stalled: StalledBookingStats;
    neverStarted: NeverStartedStats;
    stalledTrend: StalledTrendPoint[];
    refunds: RefundStats;
    refundTrend: RefundTrendPoint[];
    bookingProgress: BookingProgressRow[];
}

// Gia sư
export interface TutorRevenueRow {
    tutorId: string;
    tutorName: string;
    subject: string;
    gmv: number;
    platformRevenue: number;
    /** % nền tảng giữ lại trên GMV — so sánh tương đối giữa gia sư */
    takeRate: number;
    tutorEarnings: number;
    escrowHeld: number;
    sessionsDelivered: number;
    revenuePerSession: number;
    cancelRate: number;
    disputeCount: number;
    rating: number;
}

export interface TutorRevenueResponse {
    /** Đã cắt còn top dòng — không dùng .length làm số liệu */
    tutors: TutorRevenueRow[];
    /** Số gia sư dạy xong ít nhất 1 buổi trong kỳ */
    tutorsWithRevenue: number;
    /** Số gia sư có buổi trong kỳ, kể cả huỷ hết */
    activeTutors: number;
    concentration: NamedValue[];
    totalPlatformRevenue: number;
    /** Escrow toàn sàn hiện tại, không lọc kỳ */
    totalEscrowHeld: number;
}

// Khách hàng
export interface CustomerSummary {
    activeParents: number;
    repeatRate: number;
    repeatRatePrevious: number;
    avgBookingValue: number;
    avgBookingValuePrevious: number;
    ltv: number;
}

/** Phân khúc người chi tiền: phụ huynh đặt cho con vs học sinh tự đặt. */
export interface CustomerSegment {
    segment: string;
    customers: number;
    bookings: number;
    /** Tiền khách trả (GMV) */
    totalSpent: number;
    /** Hoa hồng nền tảng thực nhận */
    platformRevenue: number;
    ltv: number;
    avgBookingValue: number;
    repeatRate: number;
}

export interface ParentRevenueRow {
    /** Phụ huynh, hoặc học sinh nếu tự đặt lịch */
    parentId: string;
    parentName: string;
    /** 'Phụ huynh' | 'Học sinh' */
    customerType: string;
    studentName: string;
    totalSpent: number;
    bookingCount: number;
    sessionsPurchased: number;
    sessionsCompleted: number;
    /** Hoa hồng buổi đã mua chưa học. BE tính, không suy ra ở FE. */
    deferredRevenue: number;
    firstBookingAt: string | null;
    lastBookingAt: string | null;
}

export interface ArpuPoint {
    month: string;
    arpu: number;
    activeParents: number;
}

export interface NewVsReturningPoint {
    month: string;
    newCustomers: number;
    returning: number;
}

export interface BookingValueBucket {
    range: string;
    count: number;
}

export interface CohortRow {
    cohort: string;
    size: number;
    /** % còn hoạt động ở tháng thứ 0..N; null = chưa tới kỳ đó */
    retention: (number | null)[];
}

export interface CustomerRevenueResponse {
    summary: CustomerSummary;
    segments: CustomerSegment[];
    parents: ParentRevenueRow[];
    arpuTrend: ArpuPoint[];
    newVsReturning: NewVsReturningPoint[];
    bookingValueDistribution: BookingValueBucket[];
    cohorts: CohortRow[];
}

// Môn học & khối lớp
export interface SubjectRevenueRow {
    subjectId: number;
    subjectName: string;
    gmv: number;
    platformRevenue: number;
    deferredRevenue: number;
    bookings: number;
    sessionsDelivered: number;
    avgPricePerSession: number;
    completionRate: number;
}

export interface GradeRevenueRow {
    gradeId: number;
    gradeName: string;
    gmv: number;
    platformRevenue: number;
    bookings: number;
}

export interface SubjectGradeCell {
    subject: string;
    grade: string;
    revenue: number;
}

export interface SubjectRevenueResponse {
    subjects: SubjectRevenueRow[];
    grades: GradeRevenueRow[];
    matrix: SubjectGradeCell[];
    /** Mỗi phần tử: { month: '07/2026', 'Toán': 9800000, ... } */
    subjectTrend: Record<string, string | number>[];
}

// AI credit
export interface AiSummary {
    revenue: number;
    revenuePrevious: number;
    packagesSold: number;
    packagesSoldPrevious: number;
    /** Tổng lượt đã cấp (tặng Free + mua gói) */
    creditsSold: number;
    /** Tổng lượt đã hỏi */
    creditsConsumed: number;
    /** Lượt còn lại trong các tài khoản. */
    creditsOutstanding: number;

    /** Số tài khoản được cấp lượt AI */
    totalUsers: number;
    /** Số tài khoản đã hỏi ít nhất một lượt */
    activatedUsers: number;
    /** Lượt đã cấp cho riêng nhóm đã kích hoạt */
    activatedCreditsGranted: number;
    /** Lượt đã dùng của riêng nhóm đã kích hoạt */
    activatedCreditsConsumed: number;
}

export interface AiPackageRow {
    packageId: number;
    name: string;
    price: number;
    creditAmount: number;
    unitsSold: number;
    revenue: number;
}

export interface AiCreditFlowPoint {
    month: string;
    granted: number;
    consumed: number;
}

export interface AiTopUserRow {
    userId: string;
    userName: string;
    role: string;
    creditsConsumed: number;
    creditsPurchased: number;
    amountPaid: number;
}

export interface AiRevenueResponse {
    summary: AiSummary;
    packages: AiPackageRow[];
    creditFlow: AiCreditFlowPoint[];
    topUsers: AiTopUserRow[];
    trend: RevenueTrendPoint[];
}
