/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================
// ADMIN PORTAL - TYPE DEFINITIONS
// ============================================
// Định nghĩa TypeScript interfaces cho Admin Portal
// Based on: admin-portal-spec.md

// ============================================
// DASHBOARD TYPES (ADM-01) — NEW (mirrors BE DTOs in MV.DomainLayer/DTO/ResponseModel/Admin)
// ============================================

// --- GET /api/admin/dashboard/stats ---
export interface DashboardPlatformOverview {
  totalUsers: number;
  totalActiveTutors: number;
  totalParents: number;
  totalStudents: number;
  pendingTutorApprovals: number;
  suspendedUsers: number;
}

export interface DashboardBookingSummary {
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  gmvThisMonth: number;
  platformRevenueThisMonth: number;
}

export interface DashboardClassSessionSummary {
  classSessionsToday: number;
  completionRatePercent: number | null;
  noShowRatePercent: number | null;
}

export interface DashboardPendingActions {
  pendingWithdrawals: number;
  pendingWithdrawalAmount: number;
  openDisputes: number;
  pendingWarnings: number;
  pendingCertificates: number;
}

export interface AdminDashboardStats {
  platformOverview: DashboardPlatformOverview;
  bookingSummary: DashboardBookingSummary;
  classSessionSummary: DashboardClassSessionSummary;
  pendingActions: DashboardPendingActions;
}

// --- GET /api/admin/dashboard/users ---
export interface UserStatsByRole {
  totalTutors: number;
  totalParents: number;
  totalStudents: number;
  totalStaff: number;
}

export interface UserStatsTutorFunnel {
  draft: number;
  pendingApproval: number;
  active: number;
  rejected: number;
  publicTutors: number;
}

export interface UserStatsGrowth {
  newTutors: number;
  newParents: number;
  newStudents: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface UserStatsModeration {
  activeSuspensions: number;
  totalWarnings: number;
  usersWithWarnings: number;
}

export interface AdminUserStats {
  byRole: UserStatsByRole;
  tutorFunnel: UserStatsTutorFunnel;
  growth: UserStatsGrowth;
  moderation: UserStatsModeration;
  filterFrom: string | null;
  filterTo: string | null;
}

// --- GET /api/admin/dashboard/tutor-performance ---
export interface TutorPerformanceItem {
  tutorId: string;
  fullName: string;
  avatarUrl: string | null;
  averageRating: number | null;
  totalFeedbacks: number;
  lessonsCompleted: number;
  lessonsCancelled: number;
  noShows: number;
  completionRatePercent: number | null;
  totalRevenue: number;
  subscriptionType: string | null;
}

export interface RatingDistributionItem {
  rating: number;
  count: number;
}

export interface TutorFeedbackSummary {
  totalFeedbacks: number;
  averageRating: number | null;
  ratingDistribution: RatingDistributionItem[];
  parentSatisfactionRate: number | null;
}

export interface AdminTutorPerformance {
  platformAverageRating: number | null;
  platformAvgCompletionRate: number | null;
  topByRating: TutorPerformanceItem[];
  topByLessonsCompleted: TutorPerformanceItem[];
  topByRevenue: TutorPerformanceItem[];
  feedbackSummary: TutorFeedbackSummary;
  filterFrom: string | null;
  filterTo: string | null;
}

// --- GET /api/admin/dashboard/disputes ---
export interface DisputeStatsOverview {
  totalDisputes: number;
  pending: number;
  investigating: number;
  resolved: number;
  closed: number;
  resolutionRatePercent: number | null;
  avgResolutionDays: number | null;
}

export interface DisputeStatsFinancial {
  totalRefundAmount: number;
  refundsThisPeriod: number;
  refundAmountThisPeriod: number;
}

export interface DisputeTypeCount {
  type: string;
  count: number;
}

export interface DisputeTrendItem {
  month: string;
  count: number;
  refundAmount: number;
}

export interface AdminDisputeStats {
  overview: DisputeStatsOverview;
  financial: DisputeStatsFinancial;
  byType: DisputeTypeCount[];
  trend: DisputeTrendItem[];
  filterFrom: string | null;
  filterTo: string | null;
}

// --- GET /api/admin/dashboard/summary ---
// Một KPI số kèm % thay đổi so với kỳ trước cùng độ dài (null khi kỳ trước = 0).
export interface MetricWithChange {
  value: number;
  changePercent: number | null;
}

export interface SummaryBookings {
  active: number;
  newInPeriod: number;
  completedInPeriod: number;
}

export interface SummaryPendingActions {
  total: number;
  tutorApprovals: number;
  pendingCertificates: number;
  withdrawalReviews: number;
  openDisputes: number;
  unresolvedAlerts: number;
  overdueCount: number;
}

export interface AdminDashboardSummary {
  /** Tiền phụ huynh trả (GMV). Cùng con số với `summary.gmv` của báo cáo doanh thu. */
  gmv: MetricWithChange;
  /** Doanh thu TẠM TÍNH — cùng con số với `summary.commissionSold` của báo cáo doanh thu. */
  platformRevenue: MetricWithChange;
  /** Doanh thu ĐÃ GHI NHẬN — cùng con số với `summary.recognisedRevenue` của báo cáo. */
  recognisedRevenue: MetricWithChange;
  bookings: SummaryBookings;
  pendingActions: SummaryPendingActions;
  filterFrom: string;
  filterTo: string;
}

// --- GET /api/admin/dashboard/trends ---
export interface FinancialTrendPoint {
  label: string;
  gmv: number;
  platformRevenue: number;
}

export interface ClassSessionTrendPoint {
  label: string;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface ClassSessionRates {
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
}

export interface DashboardTrend {
  from: string;
  to: string;
  bucket: string;
  financialTrend: FinancialTrendPoint[];
  classSessionTrend: ClassSessionTrendPoint[];
  classSessionRates: ClassSessionRates;
}

// ============================================
// VETTING TYPES (ADM-02)
// ============================================

export type ProfileStatus = 'onboarding_incomplete' | 'pending_review' | 'approved' | 'rejected' | 'suspended';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

// Interface cho API response từ /api/Tutor/pending
// Nested sections structure matching actual API response

export interface PendingTutorSubject {
  subjectId: number;
  subjectName: string;
  gradeLevels: string; // JSON string e.g. '["grade_12"]'
  tags: string; // JSON string e.g. '["Kiên nhẫn"]'
}

export interface PendingTutorCertificate {
  certificateId: string;
  certificateName: string;
  certificateType: string;
  issuingOrganization: string;
  yearIssued: number;
  credentialId: string | null;
  credentialUrl: string | null;
  certificateFileUrl: string | null;
  createdAt: string;
  verificationStatus: string;
  verificationNote: string | null;
}

export interface PendingTutorSections {
  video?: {
    videoUrl: string | null;
    status: string;
    updatedAt: string | null;
  };
  basicInfo?: {
    avatarUrl: string | null;
    headline: string | null;
    teachingAreaCity: string | null;
    teachingAreaDistrict: string | null;
    teachingMode: string | null;
    subjects?: PendingTutorSubject[];
    status: string;
    updatedAt: string | null;
  };
  introduction?: {
    bio: string | null;
    degree: string | null;
    education: string | null;
    gpa: number | null;
    gpaScale: number | null;
    experience: string | null;
    status: string;
    updatedAt: string | null;
  };
  certificates?: {
    totalCount: number;
    certificates: PendingTutorCertificate[];
    status: string;
    updatedAt: string | null;
  };
  identityCard?: {
    identityNumberMasked?: string | null;
    fullName?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    permanentAddress?: string | null;
    portraitImageUrl?: string | null;
    frontImageUrl?: string | null;
    backImageUrl?: string | null;
    isVerified: boolean;
    status: string;
    updatedAt: string | null;
  };
  pricing?: {
    hourlyRate: number | null;
    trialLessonPrice: number | null;
    allowPriceNegotiation: boolean;
    status: string;
    updatedAt: string;
  };
}

export interface PendingTutorFromAPI {
  userid: string;
  username: string | null;
  fullname: string;
  email: string;
  phone: string;
  avatarurl: string | null;
  birthdate: string | null;
  gender: string | null;
  address: string | null;
  status: number;
  createdat: string;
  profileStatus: string;
  rejectionNote: string | null;
  profileCreatedAt: string;
  profileUpdatedAt: string;
  sections: PendingTutorSections;
}

export interface PendingTutorsAPIResponse {
  content: PendingTutorFromAPI[];
  statusCode: number;
  message: string;
  error: string | null;
}

// Interface cho API approve/reject - PUT /tutors/{id}/approval
export interface TutorApprovalRequest {
  isApproved: boolean;
  reason?: string;
}

// 1 dòng giá theo môn + lớp — khớp TutorSubjectGradePriceResponse (BE).
export interface SubjectGradePriceItem {
  id?: number;
  subjectId: number;
  subjectName: string | null;
  gradeLevelId: number;
  gradeLevelName: string | null;
  pricePerHour: number;
  durationMinutesPerSession: number;
  sessionsPerWeek: number;
  currency: string;
  isActive: boolean;
  subjectIsActive: boolean;
  gradeLevelIsActive: boolean;
}

// Bản chỉnh sửa hồ sơ (của tutor đã Active) đang chờ Admin duyệt.
// GET /api/admin/tutor-profile-update-requests
export interface ProfileUpdateRequestFromAPI {
  tutorId: string;
  tutorFullName: string | null;
  tutorEmail: string | null;
  tutorAvatarUrl: string | null;
  submittedAt: string;

  currentHeadline: string | null;
  proposedHeadline: string | null;
  currentTeachingAreaCity: string | null;
  proposedTeachingAreaCity: string | null;
  currentTeachingAreaDistrict: string | null;
  proposedTeachingAreaDistrict: string | null;
  currentBio: string | null;
  proposedBio: string | null;
  currentDegree: string | null;
  proposedDegree: string | null;
  currentEducation: string | null;
  proposedEducation: string | null;
  currentExperience: string | null;
  proposedExperience: string | null;
  currentVideoIntroUrl: string | null;
  proposedVideoIntroUrl: string | null;
  hasProposedSubjectGradePrices: boolean;
  currentSubjectGradePrices: SubjectGradePriceItem[];
  proposedSubjectGradePrices: SubjectGradePriceItem[];
}

export interface ProfileUpdateRequestsAPIResponse {
  content: ProfileUpdateRequestFromAPI[];
  statusCode: number;
  message: string;
  error: string | null;
}

// PUT /api/admin/tutor-profile-update-requests/{tutorId}/review
export interface ReviewProfileUpdateRequestBody {
  isApproved: boolean;
  note?: string;
}

// Một chứng chỉ chờ duyệt (cert-centric) kèm thông tin gia sư tối thiểu.
// Khớp với endpoint đề xuất GET /api/admin/certificates/pending; cũng là shape
// mà FE dựng tạm (derived) từ danh sách pending tutors cho tới khi BE ship.
export interface PendingCertificate {
  certificateId: string;
  certificateName: string;
  certificateType: string | null;
  issuingOrganization: string;
  yearIssued: number | null;
  credentialId: string | null;
  credentialUrl: string | null;
  verificationStatus: string; // "pending_review" | "verified" | "rejected"
  certificateFileUrl: string | null;
  createdAt: string | null;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
  tutorAvatarUrl: string | null;
}

export interface PendingCertificatesResponse {
  content: PendingCertificate[];
  total: number; // tổng theo header X-Pagination (toàn bộ trang)
}

// Response cho API duyệt/từ chối từng chứng chỉ
// PUT /api/admin/tutors/{tutorId}/certificates/{certId}/verify
export interface AdminVerifyCertificateResponse {
  certificateId: string;
  tutorId: string;
  certificateName: string;
  verificationStatus: string; // "verified" | "rejected"
  verificationNote: string | null;
  isProfileActivated: boolean; // true nếu duyệt cert này khiến hồ sơ được kích hoạt
}

export interface EKYCContent {
  id: string; // CCCD number
  name: string; // Full name from CCCD
  dob: string; // DD/MM/YYYY
  home: string; // Hometown
  address: string;
  type_new: string; // Card type
  sex: string; // "NAM" | "NỮ"
  id_prob: string; // Confidence score
}

export interface UserInfo {
  userid: string;
  fullname: string;
  email: string;
  phone: string;
  birthdate: string | null;
  address: string | null;
  gender: string | null;
  identitynumber: string | null;
  idcardfronturl: string | null;
  idcardbackurl: string | null;
  isidentityverified: boolean;
  ekycRawData: string | null; // JSON string to parse
}

export interface TutorProfileInfo {
  tutorid: string;
  headline: string;
  bio: string;
  hourlyrate: number;
  experience: number; // Years
  education: string;
  gpa: string | null;
  timezone: string;
  teachingareacity: string | null;
  teachingareadistrict: string | null;
  teachingmode: string | null; // 'online', 'offline', 'both'
  profilestatus: ProfileStatus;
  verificationstatus: VerificationStatus;
  certificateurl: any; // JSONB array
  videointrourl: string | null;
  verifiedat: string | null;
  verifiedby: string | null;
  rejectionnote: string | null;
}

export interface TutorSubject {
  subjectid: string;
  subjectname: string;
  gradelevels: string; // Comma-separated or JSON
  specialization: string | null;
}

export interface TutorAvailability {
  availabilityid: string;
  dayofweek: number; // 0-6 (Sunday to Saturday)
  starttime: string; // HH:MM format
  endtime: string; // HH:MM format
  isavailable: boolean;
}

// ============================================
// DISPUTES TYPES (ADM-03)
// ============================================

export type DisputeType = 'no_show' | 'quality' | 'payment' | 'other';

export type DisputeStatus = 'pending' | 'investigating' | 'confirmed_no_show' | 'resolved' | 'closed';

export type DisputePriority = 'low' | 'medium' | 'high';

// ---- Backend-compatible types (matching DisputeListDto) ----

export interface DisputeForAdmin {
  disputeId: number;
  classSessionId: number | null;
  bookingId: number | null;
  disputeType: string | null;
  status: string | null;
  reason: string | null;
  createdByName: string | null;
  tutorName: string | null;
  classSessionPrice: number | null;
  createdAt: string | null;
  disputeTypeDisplay: string;
  statusDisplay: string;
  statusColor: string;
  /** AI-classified priority — null until the background classification job has run. */
  priority: DisputePriority | null;
  priorityReason: string | null;
  priorityDisplay: string;
}

/** Cũ nhất trước / mới nhất trước, theo thời gian tạo. Khớp BE `ListSortDirection`. */
export type ListSortDirection = 'asc' | 'desc';

export interface DisputeQueryParams {
  status?: DisputeStatus;
  disputeType?: DisputeType;
  /** Tìm theo mã hồ sơ, booking, buổi học, người dùng hoặc nội dung phản ánh. */
  search?: string;
  startDate?: string;
  endDate?: string;
  /** Chỉ lấy phản ánh về buổi học này. */
  classSessionId?: number;
  /** Mặc định BE là 'desc' (mới nhất trước). */
  sortDirection?: ListSortDirection;
  page?: number;
  pageSize?: number;
}

/** Nội dung phân trang ổn định của GET /api/admin/disputes. */
export interface DisputeListPageResponse {
  items: DisputeForAdmin[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface DisputeStatsDto {
  totalPending: number;
  totalInvestigating: number;
  resolvedThisMonth: number;
  totalRefundedThisMonth: number;
}

// ---- Backend-compatible types (matching DisputeDetailDto) ----

export interface DisputeUserDto {
  userId: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

export interface DisputeScheduleChangeAuditDto {
  scheduleChangeId: number;
  status: 'pending' | 'approved' | 'applied' | 'rejected' | 'expired';
  originalScheduledStart: string;
  originalScheduledEnd: string;
  adjustedScheduledStart: string | null;
  adjustedScheduledEnd: string | null;
  learnerApproverRole: 'Student' | 'Parent';
  tutorConfirmedByName: string | null;
  tutorConfirmedAt: string | null;
  learnerConfirmedByName: string | null;
  learnerConfirmedAt: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  appliedAt: string | null;
}
export interface DisputeClassSessionDto {
  classSessionId: number;
  scheduledStart: string;
  scheduledEnd: string;
  status: string | null;
  classSessionPrice: number | null;
  classSessionContent: string | null;
  homework: string | null;
  isTutorPresent: boolean | null;
  isStudentPresent: boolean | null;
  scheduleChanges?: DisputeScheduleChangeAuditDto[];
}

export interface DisputeTutorDto {
  tutorId: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  warningCount: number;
  averageRating: number | null;
}

export interface DisputeDetail {
  disputeId: number;
  bookingId: number | null;
  classSessionId: number | null;
  disputeType: string | null;
  reason: string | null;
  status: string | null;
  evidence: string[] | null;
  createdAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  refundAmount: number | null;
  refundPercentage: number | null;
  /** False khi chuỗi buổi (bù/phụ/học lại) chứa buổi này đã học lại tối đa số lần cho phép — CMS
   * phải khoá lựa chọn "Học lại buổi này" trong modal đóng phản ánh, chỉ còn hoàn tiền. */
  relearnAvailable: boolean;
  tutorResponse: string | null;
  tutorRespondedAt: string | null;
  /** Phản hồi của phụ huynh/học sinh khi dispute do GIA SƯ tạo (chiều ngược với tutorResponse). */
  respondentResponse: string | null;
  respondentRespondedAt: string | null;
  additionalEvidence: DisputeEvidenceItemDto[] | null;
  noShowConfirmedAt: string | null;
  noShowConfirmedBy: string | null;
  createdBy: DisputeUserDto | null;
  resolvedBy: DisputeUserDto | null;
  classSession: DisputeClassSessionDto | null;
  tutor: DisputeTutorDto | null;
  timeSinceCreation: string | null;
  /** Earliest time admin can Investigate without forceEarly (createdAt + 48h). */
  tutorResponseDeadline: string | null;
  /** AI-classified priority — null until the background classification job has run. */
  priority: DisputePriority | null;
  priorityReason: string | null;
  priorityDisplay: string;
}

// ── Session log (Agora attendance evidence) ─────────────────────────────────
// Independent, server-side record of who was in the lesson room and when. Backend:
// GET /api/admin/class-sessions/{classSessionId}/session-log

export interface SessionLogInterval {
  start: string;
  end: string;
}

export interface SessionLogDisconnect {
  at: string;
  reason: number | null;
  reasonLabel: string;
  /** True when the connection failed on them rather than them choosing to leave. */
  involuntary: boolean;
  sessionDurationSeconds: number | null;
}

export type SessionLogRole = 'tutor' | 'student' | 'parent' | 'recorder' | 'unknown';

export interface SessionLogParticipant {
  appUserId: string | null;
  role: SessionLogRole;
  displayName: string | null;
  agoraUid: string | null;
  /** 'exact' matched our account id, 'correlated' matched by admission time, 'unmatched' failed. */
  identityConfidence: 'exact' | 'correlated' | 'unmatched';
  firstJoinAt: string | null;
  lastLeaveAt: string | null;
  totalSeconds: number;
  joinCount: number;
  dropCount: number;
  platform: string | null;
  /** True only for an interval that is still open at summary.snapshotAt. */
  isCurrentlyPresent: boolean;
  intervals: SessionLogInterval[];
  disconnects: SessionLogDisconnect[];
}

export interface SessionLogEvent {
  eventAt: string;
  receivedAt: string;
  eventType: number;
  eventLabel: string;
  agoraUid: string | null;
  agoraAccount: string | null;
  appUserId: string | null;
  role: SessionLogRole | null;
  displayName: string | null;
  platform: number | null;
  platformLabel: string | null;
  reason: number | null;
  reasonLabel: string | null;
  durationSeconds: number | null;
  clientSequence: number | null;
  clientType: number | null;
}

export interface SessionLogSummary {
  /** UTC timestamp at which this snapshot was calculated. */
  snapshotAt: string;
  isOngoing: boolean;
  /** False when identity or event gaps make an attendance/refund conclusion unsafe. */
  isEvidenceConclusive: boolean;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledSeconds: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  firstEventAt: string | null;
  lastEventAt: string | null;
  tutorSeconds: number;
  studentSeconds: number;
  /** Time both sides were in the room together — the figure most disputes turn on. */
  overlapSeconds: number;
  overlapRatio: number;
  suggestedRefundPercentage: number | null;
  eventCount: number;
  maxIngestLagSeconds: number;

  // Cross-check against our own classroom heartbeat, reported separately from the Agora figures
  // above so a disagreement between the two sources stays visible.
  tutorHeartbeatSeconds: number;
  studentHeartbeatSeconds: number;
  heartbeatOverlapSeconds: number;
  heartbeatOverlapRatio: number;
  heartbeatCount: number;

  /** Seconds late past the grace period. Null when no arrival could be established. */
  tutorLateSeconds: number | null;
  /** Seconds the tutor left before the scheduled end, past the grace period. */
  tutorEarlyLeaveSeconds: number | null;
  /** Which source the two numbers above came from. */
  punctualitySource: 'agora' | 'heartbeat' | null;
}

/** One run of consecutive heartbeats, with no silence longer than the presence window. */
export interface SessionLogHeartbeatRun {
  startedAt: string;
  lastBeatAt: string;
  beatCount: number;
  reportedBeats: number;
  micOnBeats: number;
  cameraOnBeats: number;
  idleBeats: number;
  closedReason: string | null;
  closedReasonLabel: string | null;
}

/**
 * The heartbeat chain for one user. Weaker than Agora's own events — the client reports it — but
 * it is the only source that separates a lesson being taught from a room left open.
 */
export interface SessionLogHeartbeat {
  appUserId: string;
  role: SessionLogRole;
  displayName: string | null;
  firstBeatAt: string | null;
  lastBeatAt: string | null;
  totalSeconds: number;
  beatCount: number;
  runCount: number;
  gapCount: number;
  isCurrentlyBeating: boolean;
  /** Beats that carried activity fields. 0 means unknown activity, never "was idle". */
  reportedBeats: number;
  micOnBeats: number;
  cameraOnBeats: number;
  idleBeats: number;
  /** Null when nothing was reported, so unknown never renders as 0%. */
  idleRatio: number | null;
  runs: SessionLogHeartbeatRun[];
}

/** A network and device one participant was admitted from during the lesson. */
export interface SessionLogDeviceUse {
  appUserId: string;
  role: SessionLogRole;
  displayName: string | null;
  ipAddress: string;
  deviceLabel: string;
  userAgent: string;
  firstSeenAt: string;
  lastSeenAt: string;
  admissionCount: number;
}

export interface SessionLogLobbyVisit {
  enteredAt: string;
  lastSeenAt: string;
  leftAt: string | null;
  beatCount: number;
  closedReason: string | null;
  closedReasonLabel: string | null;
}

/** Authenticated lobby visits made by one application account. */
export interface SessionLogLobbyParticipant {
  appUserId: string;
  role: SessionLogRole;
  displayName: string | null;
  firstEnteredAt: string;
  lastSeenAt: string;
  lastLeftAt: string | null;
  totalSeconds: number;
  visitCount: number;
  beatCount: number;
  disconnectCount: number;
  isCurrentlyWaiting: boolean;
  /** True when the account later appears in Tutora's room-admission registry. */
  wasAdmittedToRoom: boolean;
  visits: SessionLogLobbyVisit[];
}

/** Server-side evidence captured before either side is allowed into the media room. */
export interface SessionLogLobbyEvidence {
  hasAnyRecord: boolean;
  tutorRecorded: boolean;
  studentSideRecorded: boolean;
  bothSidesRecorded: boolean;
  participants: SessionLogLobbyParticipant[];
}

export interface SessionLog {
  classSessionId: number;
  summary: SessionLogSummary;
  participants: SessionLogParticipant[];
  timeline: SessionLogEvent[];
  heartbeats: SessionLogHeartbeat[];
  devices: SessionLogDeviceUse[];
  lobby: SessionLogLobbyEvidence;
  flags: string[];
}

// ── Tutor reliability ───────────────────────────────────────────────────────
// Backend: GET /api/admin/tutors/{tutorUserId}/reliability?from=&to=

export interface TutorReliabilitySession {
  classSessionId: number;
  scheduledStart: string;
  scheduledEnd: string;
  status: string | null;
  lateSeconds: number | null;
  earlyLeaveSeconds: number | null;
  overlapSeconds: number;
  overlapRatio: number;
  isNoShow: boolean;
  /** False when this lesson was excluded from every rate for lack of usable evidence. */
  isMeasured: boolean;
  punctualitySource: 'agora' | 'heartbeat' | null;
  flags: string[];
}

export interface TutorReliability {
  tutorUserId: string;
  tutorName: string | null;
  fromDate: string;
  toDate: string;
  sessionsInRange: number;
  /** Denominator of every rate below — never the whole range. */
  sessionsMeasured: number;
  sessionsWithoutEvidence: number;
  lateCount: number;
  lateRate: number | null;
  averageLateSeconds: number | null;
  worstLateSeconds: number | null;
  earlyLeaveCount: number;
  earlyLeaveRate: number | null;
  averageEarlyLeaveSeconds: number | null;
  worstEarlyLeaveSeconds: number | null;
  noShowCount: number;
  noShowRate: number | null;
  idlePresenceCount: number;
  multipleNetworkCount: number;
  multipleDeviceCount: number;
  averageOverlapRatio: number | null;
  sessions: TutorReliabilitySession[];
}

// ── Agora webhook diagnostics ───────────────────────────────────────────────
// Backend: GET /api/admin/agora/ncs-diagnostics

export interface AgoraNcsDiagnostics {
  sampledEvents: number;
  sampleLimit: number;
  distinctSessions: number;
  participantEvents: number;
  /** The number that decides whether identities bind exactly or only by timing. */
  eventsWithAccount: number;
  eventsWithUid: number;
  numericUidEvents: number;
  stringUidEvents: number;
  unreadablePayloads: number;
  payloadKeys: string[];
  firstEventAt: string | null;
  lastEventAt: string | null;
  lastReceivedAt: string | null;
  verdict: string;
}

export interface DisputeEvidenceItemDto {
  disputeEvidenceId: number;
  fileUrl: string | null;
  fileType: string | null;
  description: string | null;
  createdAt: string | null;
  source: 'learner' | 'tutor' | 'unknown';
  uploadedByName: string | null;
}

export type ResolutionType = 'refund_100' | 'refund_50' | 'release' | 'custom' | 'cancel_course';

export interface ResolveDisputeRequest {
  resolutionType: ResolutionType;
  /** Required when resolutionType = 'custom' (0-100). Ignored otherwise. */
  customRefundPercentage?: number;
  resolutionNote: string;
  createTutorWarning?: boolean;
  warningLevel?: number;
}

/**
 * Buổi học về trạng thái nào khi đóng phản ánh do hai bên hoà giải.
 * - 'completed': vẫn tính là đã dạy, quyết toán cho gia sư như bình thường.
 * - 'reschedule': hai bên thống nhất học lại — buổi gốc chuyển 'cancelled' (giữ nguyên dữ liệu,
 *   không xoá), tạo 1 buổi học lại MỚI (Link 3) ở giờ do Admin/Staff chọn (relearnScheduledStart).
 * - 'keep_scheduled': bỏ phản ánh, buổi về lại 'scheduled' và học như bình thường. Dành cho khiếu
 *   nại nhầm hoặc khiếu nại vào buổi chưa diễn ra — hai lựa chọn trên đều sai trong ca đó:
 *   'completed' trả tiền cho buổi chưa dạy, 'reschedule' đổi giờ hai bên đã hẹn và đốt một suất
 *   trong hạn mức học lại của chuỗi.
 */
export type CloseDisputeOutcome = 'completed' | 'reschedule' | 'keep_scheduled';

export interface CloseDisputeRequest {
  classSessionOutcome: CloseDisputeOutcome;
  note: string;
  /** Giờ học lại do Admin/Staff chọn — bắt buộc khi classSessionOutcome = 'reschedule'. ISO string, phải ở tương lai. */
  relearnScheduledStart?: string;
}

// Legacy types kept for backward compatibility
export interface DisputeListItem {
  disputeid: string;
  disputetype: string;
  createdby: string;
  creatorName: string;
  creatorRole: 'student' | 'tutor' | 'parent';
  bookingid: string;
  createdat: string;
  status: DisputeStatus;
  escrowAmount: number;
  priority: DisputePriority;
  isUrgent: boolean;
}

export interface BookingInfo {
  bookingid: string;
  studentid: string;
  studentName: string;
  studentAvatar: string | null;
  tutorid: string;
  tutorName: string;
  tutorAvatar: string | null;
  subjectid: string;
  subjectname: string;
  sessioncount: number;
  finalprice: number;
  platformfee: number;
  paymentstatus: string;
  escrowstatus: string;
  bookingdate: string;
  status: string;
}

export interface LessonInfo {
  lessonid: string;
  scheduledstart: string;
  scheduledend: string;
  actualstart: string | null;
  actualend: string | null;
  checkintime: string | null;
  istutorpresent: boolean | null;
  isstudentpresent: boolean | null;
  status: string;
  notes: string | null;
}

export interface TutorWarning {
  warningid: string;
  warninglevel: number;
  reason: string;
  createdat: string;
  issuedby: string;
  issuedByName: string;
  relatedbookingid: string | null;
}

// ============================================
// FINANCIALS TYPES (ADM-04)
// ============================================

// Real backend transaction type values — Tutora-Backend/MV.DomainLayer/Constants/TransactionType.cs
export type WalletTransactionType =
  | 'Deposit'
  | 'Payment'
  | 'EscrowCredit'
  | 'EscrowRelease'
  | 'EscrowReversal'
  | 'Withdrawal'
  | 'Refund'
  | 'DepositPayment'
  | 'RemainingPayment'
  | 'BankVerification';

export interface RevenueOverviewMetrics {
  totalPlatformRevenue: number;
  totalGrossVolume: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  monthOverMonthGrowthPercent: number | null;
  currentYearRevenue: number;
  totalEscrowed: number;
}

export interface BookingMetrics {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  pendingTutor: number;
  newThisPeriod: number;
  byStatus: { status: string; count: number }[];
  byTeachingMode: { mode: string; count: number }[];
}

export interface ClassSessionMetrics {
  totalCompleted: number;
  totalScheduled: number;
  totalNoShow: number;
  totalCancelled: number;
  totalDisputed: number;
  completionRatePercent: number | null;
  noShowRatePercent: number | null;
  totalClassSessionRevenue: number;
}

export interface UserGrowthMetrics {
  totalTutors: number;
  totalParents: number;
  totalStudents: number;
  activeTutors: number;
  newTutorsThisMonth: number;
  newParentsThisMonth: number;
  averageTutorRating: number | null;
}

export interface WithdrawalMetrics {
  totalPending: number;
  totalPendingAmount: number;
  totalApproved: number;
  totalApprovedAmount: number;
  totalRejected: number;
  totalRejectedAmount: number;
  totalCancelled: number;
  totalCancelledAmount: number;
  processedThisMonth: number;
  processedAmountThisMonth: number;
}

export interface EscrowMetrics {
  totalFrozenBalance: number;
  totalReleasedToTutors: number;
  totalRefundedToParents: number;
}

export interface RevenueTrendItem {
  label: string;
  platformRevenue: number;
  grossVolume: number;
  bookingCount: number;
  classSessionsCompleted: number;
}

export interface TopSubjectItem {
  subjectId: number;
  subjectName: string;
  bookingCount: number;
  totalRevenue: number;
}

export interface FinancialMetrics {
  revenue: RevenueOverviewMetrics;
  bookings: BookingMetrics;
  classSessions: ClassSessionMetrics;
  users: UserGrowthMetrics;
  withdrawals: WithdrawalMetrics;
  escrow: EscrowMetrics;
  revenueTrend: RevenueTrendItem[];
  topSubjects: TopSubjectItem[];
  filterFrom: string | null;
  filterTo: string | null;
  period: string;
}

// ---- GET /admin/financials/transactions (AdminTransactionListResponse) ----
export interface AdminTransactionItem {
  transactionId: number;
  walletId: number | null;
  userId: string | null;
  userFullName: string | null;
  userEmail: string | null;
  userRole: string | null;
  amount: number | null;
  transactionType: string | null;
  description: string | null;
  referenceId: number | null;
  referenceTable: string | null;
  orderCode: number | null;
  createdAt: string | null;
}

export interface AdminTransactionListResponse {
  items: AdminTransactionItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalAmount: number;
}

export interface TransactionListResponse {
  items: AdminTransactionItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalAmount: number;
}

// Matches AdminFinancialController's GET /admin/financials/transactions query params exactly —
// deliberately not the generic PaginationParams/FilterParams, whose field names (limit/offset,
// startDate/endDate) don't match what this endpoint actually reads (pageSize, from/to).
export interface AdminTransactionQueryParams {
  page?: number;
  pageSize?: number;
  type?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
}

// ============================================
// USER MANAGEMENT TYPES (ADM-05)
// ============================================

export type UserRole = 'student' | 'tutor' | 'parent' | 'admin' | 'staff';

export type UserStatus = 'active' | 'inactive' | 'blocked' | 'suspended';

export interface UserListItem {
  userid: string;
  fullname: string;
  email: string;
  phone: string;
  primaryrole: UserRole;
  status: UserStatus;
  createdat: string;
  lastloginat: string | null;
  avatarurl: string | null;
  rating?: number; // For tutors
  totalClasses?: number; // For tutors
  warningsCount?: number;
  suspensionsCount?: number;
}

export interface WalletInfo {
  walletid: string;
  availablebalance: number;
  escrowbalance: number;
  frozenbalance: number;
  totalearnings: number;
}

export interface UserWarning {
  warningid: string;
  warninglevel: number;
  reason: string;
  issuedat: string;
  issuedby: string;
  issuedByName: string;
  relatedbookingid: string | null;
}

export interface UserSuspension {
  suspensionid: string;
  suspensiontype: string;
  reason: string;
  startdate: string;
  enddate: string | null;
  isactive: boolean;
  createdby: string;
  createdByName: string;
}

/**
 * One row of a user's warning history.
 * Mirrors BE `WarningHistoryResponse` (serialized camelCase).
 * `warningLevel`: 1 = Thấp, 2 = Trung bình, 3 = Cao.
 */
export interface AdminWarningHistoryItem {
  warningId: number;
  warningLevel: number;
  reason?: string | null;
  relatedBookingId?: number | null;
  createdAt?: string | null;
  /** Null for warnings raised by the system rather than an admin. */
  issuedByName?: string | null;
  warningLevelDisplay?: string;
  warningLevelColor?: string;
}

/**
 * Warning summary + full history for a single user.
 * Mirrors BE `UserWarningSummaryResponse`.
 *
 * Note: the suspension fields describe the *current* suspension only — BE has
 * no per-user suspension history endpoint yet.
 */
export interface AdminUserWarningSummary {
  userId?: string | null;
  fullName?: string | null;
  email?: string | null;
  totalWarnings: number;
  level1Warnings: number;
  level2Warnings: number;
  warningsLast30Days: number;
  isSuspended: boolean;
  suspensionType?: string | null;
  suspensionEndDate?: string | null;
  warnings: AdminWarningHistoryItem[];
}

/**
 * One row of a user's suspension history (active or already ended).
 * Mirrors BE `SuspensionListResponse`.
 *
 * `endDate` is null for permanent suspensions. `isActive` reflects the stored
 * flag — a temporary suspension whose `endDate` has passed can still be flagged
 * active until the hourly auto-unsuspend job flips it, so treat `isActive`
 * together with `endDate` when labelling status.
 */
export interface AdminSuspensionHistoryItem {
  suspensionId: number;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  suspensionType: string;
  reason?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
  /** Null for suspensions applied automatically by the system. */
  createdByName?: string | null;
  timeRemainingDisplay?: string | null;
  suspensionTypeDisplay?: string;
}

export interface AdminLinkedUser {
  userId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  studentProfileId: string | null;
  hasAccount: boolean;
}

export interface AdminUserRelationships {
  parent: AdminLinkedUser | null;
  students: AdminLinkedUser[];
}

export interface AdminUserDetail {
  user: {
    userid: string;
    username?: string | null;
    fullname: string;
    email: string;
    phone: string | null;
    role: string;
    status: number | null;
    isidentityverified: boolean | null;
    createdat: string | null;
    lastLoginAt: string | null;
    avatarurl: string | null;
  };
  relationships: AdminUserRelationships;
}

/** Link xem ảnh CCCD của người dùng (Tutor/Student) — signed URL, hết hạn sau ~15 phút. */
export interface AdminUserCccdUrls {
  userId: string;
  userFullName?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  isIdentityVerified: boolean;
}

export interface IssueWarningRequest {
  userid: string;
  warninglevel: number; // 1 = Thấp, 2 = Trung bình, 3 = Cao (tạm ngưng ngay)
  reason: string;
  relatedbookingid?: string;
}

export interface SuspendUserRequest {
  userid: string;
  /**
   * BE vocabulary (SuspensionType.cs). 'permanent' is the only value that leaves the end date
   * open, so it is what an indefinite hold has to send. The older 'hidden_1_week'/'account_locked'
   * pair stays accepted for rows written before the CMS switched over.
   */
  suspensiontype: 'temporary' | 'permanent' | 'hidden_1_week' | 'account_locked';
  reason: string;
  durationDays?: number;
}

// ============================================
// SETTINGS TYPES (ADM-06)
// ============================================

export interface Subject {
  subjectid: string;
  subjectname: string;
  description: string | null;
  gradelevels: string[]; // Array of grade levels
  isactive: boolean;
  createdat: string;
  updatedat: string;
}

export interface PlatformConfig {
  configid?: string;
  platformfee_parent_percent: number; // 0-100
  platformfee_tutor_percent: number; // 0-100
  minwithdrawalamount: number;
  escrowperioddays: number;
  vatenabled: boolean;
  vatrate: number;
  cancellationdeadlinehours: number;
  graceperiodhours: number;
  warningthreshold_level1: number;
  warningthreshold_level2: number;
  suspensiondurationdays: number;
  updatedat: string;
}

export interface CancellationPolicy {
  timeWindowHours: number;
  refundPercentage: number;
  penaltyPercentage: number;
}

// ============================================
// COMMON TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface FilterParams {
  status?: string;
  role?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}
