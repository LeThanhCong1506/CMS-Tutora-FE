/**
 * TypeScript types mirroring BE DTOs:
 * - MV.DomainLayer/DTO/ResponseModel/Admin/AdminBookingListResponse.cs
 * - MV.DomainLayer/DTO/ResponseModel/Admin/AdminBookingDetailResponse.cs
 *
 * BE branch: Feature/ChangeTime (chưa merge develop tại thời điểm code).
 * Endpoint:
 *   GET  /api/admin/bookings                 → AdminBookingListResponse
 *   GET  /api/admin/bookings/{id}            → AdminBookingDetailResponse
 */

// ───── LIST ──────────────────────────────────────────────────────────────────

export interface AdminBookingListItem {
    bookingId: number;
    status?: string;
    paymentStatus?: string;
    teachingMode?: string;
    paymentCode?: string;

    // Parties
    tutorId?: string;
    tutorName?: string;
    tutorAvatarUrl?: string;

    parentId?: string;
    parentName?: string;
    parentEmail?: string;

    studentId?: string;
    studentName?: string;
    gradeLevel?: string;

    // Subject
    subjectId?: number;
    subjectName?: string;

    // Financial summary
    price?: number;
    discountApplied?: number;
    finalPrice?: number;
    platformFee?: number;

    // Progress
    sessionCount?: number;
    sessionsRemaining?: number;
    lessonsCompleted: number;
    lessonsTotal: number;

    // Dates
    startDate?: string;
    createdAt?: string;

    // Cancellation
    cancelledAt?: string;
    cancellationReason?: string;
}

export interface AdminBookingListResponse {
    items: AdminBookingListItem[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export interface AdminBookingListParams {
    page?: number;
    pageSize?: number;
    status?: string;
    teachingMode?: string;
    tutorId?: string;
    parentId?: string;
    subjectId?: number;
    from?: string; // ISO date
    to?: string;   // ISO date
    search?: string;
}

// ───── DETAIL ────────────────────────────────────────────────────────────────

export interface AdminBookingPartyInfo {
    id?: string;
    name?: string;
    avatarUrl?: string;
    email?: string;
}

export interface AdminBookingStudentInfo {
    id?: string;
    name?: string;
    gradeLevel?: string;
}

export interface AdminBookingSubjectInfo {
    id?: number;
    name?: string;
}

export interface AdminBookingFinancials {
    price?: number;
    discountApplied?: number;
    finalPrice?: number;
    paymentStatus?: string;
}

export interface AdminBookingProgress {
    totalSessions?: number;
    completedSessions: number;
    startDate?: string;
}

export interface AdminBookingCancellation {
    isCancelled: boolean;
    cancelledAt?: string;
    reason?: string;
}

export interface AdminBookingDetailResponse {
    bookingId: number;
    status?: string;
    teachingMode?: string;
    paymentCode?: string;
    location?: string;

    tutor: AdminBookingPartyInfo;
    parent?: AdminBookingPartyInfo;
    student?: AdminBookingStudentInfo;
    subject?: AdminBookingSubjectInfo;

    financials: AdminBookingFinancials;
    progress: AdminBookingProgress;
    cancellation: AdminBookingCancellation;

    createdAt?: string;
    updatedAt?: string;

    // ───── Phase 2 fields (BE Feature/ChangeTime) ──────────────────────────
    timeline: BookingTimelineEvent[];
    classSessions: AdminBookingClassSessionItem[];
    paymentBreakdown: AdminBookingPaymentBreakdown;
}

// ───── Timeline ──────────────────────────────────────────────────────────────

export interface BookingTimelineEvent {
    /** Human-readable label, e.g. "Booking created" */
    label: string;
    /** Booking status at this point in time */
    status?: string;
    occurredAt: string;
}

// ───── Class sessions ────────────────────────────────────────────────────────
// Field names mirror AdminBookingClassSessionItem on the backend. They used to be called
// `lesson*` here, which silently produced `undefined` and crashed the booking detail page.

export interface AdminBookingClassSessionItem {
    classSessionId: number;
    classSessionNumber: number;
    status?: string;
    scheduledStart: string;
    scheduledEnd: string;
    realStart?: string;
    realEnd?: string;
    classSessionPrice?: number;
    isSettled?: boolean;
    isMakeup?: boolean;
    tutorNotes?: string;
    meetingLink?: string;
    // TODO: BE chưa trả 2 field attendance — đã yêu cầu Công bổ sung:
    //   isStudentPresent?: boolean;
    //   isTutorPresent?: boolean;
}

// ───── Payment Breakdown ─────────────────────────────────────────────────────

export interface AdminBookingPaymentBreakdown {
    originalPrice?: number;
    discountApplied?: number;
    finalPrice?: number;
    depositAmount?: number;
    depositPaidAt?: string;
    remainingAmount?: number;
    remainingPaidAt?: string;
    platformFee?: number;
    tutorFee?: number;
    parentFee?: number;
    escrowStatus?: string;
    refundAmount?: number;
    refundStatus?: string;
    paymentStatus?: string;
    paymentDueAt?: string;
}
