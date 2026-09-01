export interface RevenueSummary {
    /**
     * DOANH THU ĐÃ GHI NHẬN — doanh thu kế toán của kỳ, và là con số dashboard hiển thị.
     *
     * Phí phụ huynh chín trong kỳ (neo theo ngày buổi ĐẦU dạy xong) cộng phí gia sư của các
     * buổi đã dạy trong kỳ (neo theo NGÀY DẠY), cộng phần chốt thêm khi đóng sổ, cộng tiền
     * bán gói AI. Khác mốc với `commissionEarned` — số kia neo theo ngày ĐẶT lịch — nên hai
     * con số không bằng nhau và không được cộng vào nhau.
     */
    recognisedRevenue: number;
    recognisedPrevious: number;
    /** Doanh thu tạm tính + tiền bán gói AI, quy về ngày đặt lịch. */
    contractedRevenue: number;
    contractedPrevious: number;
    /** Đã thu tiền nhưng chưa dạy — nợ dịch vụ */
    deferredRevenue: number;
    deferredPrevious: number;
    gmv: number;
    gmvPrevious: number;
    cashCollected: number;
    cashPrevious: number;

    // Bộ số cho khối chia tiền — cùng phạm vi "booking tạo trong kỳ" nên cộng khớp:
    //   gmv = tutorReceivable + commissionSold
    //   commissionSold = commissionEarned + commissionLost + phần còn chờ
    /** Học phí gốc — mẫu số của mức phí sàn 10%. KHÔNG phải gmv (gmv đã cộng 5% phí phụ huynh). */
    baseAmount: number;
    /** Tiền gia sư nhận từ booking tạo trong kỳ. */
    tutorReceivable: number;
    /** DOANH THU TẠM TÍNH: phí sàn 10% của booking tạo trong kỳ, không gồm gói AI. */
    commissionSold: number;
    /** Cùng định nghĩa, của kỳ liền trước — dashboard dùng để tính % thay đổi. */
    commissionSoldPrevious: number;
    /**
     * "Đã thu được": phần doanh thu tạm tính đã thành tiền thật. Khoá đang chạy: phí phụ huynh
     * của các đợt đã thanh toán — nhưng CHỈ sau khi buổi đầu đã dạy xong, vì trước đó huỷ là
     * hoàn 100% kể cả phí — cộng phí gia sư của các buổi ĐÃ dạy. Khoá đã đóng sổ: số Tutora
     * thực giữ theo sổ ví (gồm cả phí dịch vụ không hoàn của những buổi bị huỷ).
     *
     * Luỹ kế tới hôm nay trên các lịch ĐẶT trong kỳ — khác mốc với `recognisedRevenue`.
     */
    commissionEarned: number;
    /** "Không thu được": đã bán nhưng vĩnh viễn mất — khoá bị huỷ, hoặc khách bỏ dở sau đợt 1. */
    commissionLost: number;
    /** Đối soát sổ ví: tổng Tutora giữ được từ các khoá bị HUỶ đóng sổ trong kỳ. Số luỹ kế cả
     *  đời khoá, quy về ngày huỷ — KHÔNG cộng vào bất kỳ tổng nào, sẽ tính hai lần. */
    commissionFromCancelled: number;
}

export interface RevenueTrendPoint {
    month: string;
    recognised: number;
    contracted: number;
    aiRevenue: number;
    gmv: number;
}

/** Cặp tên–giá trị cho biểu đồ tròn. Chỉ còn dùng ở `concentration` của tab Gia sư. */
export interface NamedValue {
    name: string;
    value: number;
}

export interface RevenueOverviewResponse {
    summary: RevenueSummary;
    trend: RevenueTrendPoint[];
    // `revenueMix` và `bookingFunnel` đã bỏ khỏi API 31/08/2026 — không màn hình nào đọc.
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
    /** Doanh thu tạm tính của toàn bộ buổi đã bán chưa dạy */
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
    /** Doanh thu TẠM TÍNH của booking (phí phụ huynh + phí sàn gia sư), chốt lúc đặt lịch.
     *  0 với lịch chết chưa có đồng nào chạy qua. Xem tách 2 nguồn ở trang chi tiết:
     *  /admin-portal/bookings/:id */
    contractedFee: number;
    /** Phần ĐÃ THU ĐƯỢC của số trên: phí phụ huynh (chỉ sau buổi đầu) + phí gia sư của buổi
     *  đã dạy. Hiệu hai trường là phần còn chờ (`closed` = false) hoặc mất hẳn (`closed` = true)
     *  — hai nghĩa khác nhau, đừng gộp thành một cột. */
    recognisedFee: number;
    /** Tiền phụ huynh đã thực trả — chỉ đợt 1 nếu chưa trả nốt, nên khác `finalPrice`. */
    cashCollected: number;
    /** Đã hoàn lại cho phụ huynh, lấy từ sổ ví. */
    refundedAmount: number;
    /** Khoá đã chốt sổ. Không suy được từ `status`: hai luồng đóng khoá giữa chừng vẫn để
     *  status `completed` trong khi escrow đã chốt. */
    closed: boolean;
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
    /** Doanh thu đến TỪ GIA SƯ này: 5% cắt từ tiền gia sư của các buổi họ đã dạy trong kỳ.
     *  KHÔNG gồm 5% phí dịch vụ phụ huynh trả — nửa đó ở tab Khách hàng. */
    tutorFeeRevenue: number;
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
    /** Tổng doanh thu từ phí gia sư trong kỳ — không gồm phí dịch vụ phụ huynh. */
    totalTutorFeeRevenue: number;
    /** Escrow toàn sàn hiện tại, không lọc kỳ */
    totalEscrowHeld: number;
}

// Khách hàng
export interface CustomerSummary {
    /** Phí dịch vụ 5% ĐÃ ghi nhận từ các lịch đặt trong kỳ — tiền thật. */
    serviceFeeRecognised: number;
    /** Phí dịch vụ 5% còn ĐỢI ghi nhận từ các lịch đặt trong kỳ. */
    serviceFeePending: number;
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
    /** Phí dịch vụ 5% ĐÃ ghi nhận từ nhóm này — khoá đã qua buổi đầu, tiền thật. */
    serviceFeeRecognised: number;
    /** Phí dịch vụ 5% còn ĐỢI ghi nhận: chưa trả, hoặc đã trả mà chưa qua buổi đầu. */
    serviceFeePending: number;
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
    /** Phí dịch vụ 5% khách này đã trả và ĐÃ ghi nhận. BE tính, không suy ra ở FE. */
    serviceFeeRecognised: number;
    /** Phí dịch vụ 5% còn ĐỢI ghi nhận. Cộng hai trường ra tổng phí dịch vụ của khách. */
    serviceFeePending: number;
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
