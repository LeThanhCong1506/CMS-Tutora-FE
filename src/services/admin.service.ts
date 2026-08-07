/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { getCurrentUser } from './auth.service';
import { setupAuthInterceptor } from './apiClient';
import type {
  // Vetting
  PendingTutorFromAPI,
  PendingTutorsAPIResponse,
  TutorApprovalRequest,
  ProfileUpdateRequestsAPIResponse,
  ProfileUpdateRequestFromAPI,
  ReviewProfileUpdateRequestBody,
  AdminVerifyCertificateResponse,
  PendingCertificate,
  PendingCertificatesResponse,
  // Disputes (backend-compatible)
  DisputePage,
  DisputeDetail,
  DisputeStatsDto,
  DisputeQueryParams,
  ResolveDisputeRequest,
  SessionLog,
  TutorReliability,
  AgoraNcsDiagnostics,
  IssueWarningRequest,
  SuspendUserRequest,
  // Legacy
  DisputeListItem,
  // Financials
  FinancialMetrics,
  TransactionListResponse,
  AdminTransactionListResponse,
  AdminTransactionQueryParams,
  // User Management
  UserListItem,
  AdminUserDetail,
  AdminUserWarningSummary,
  AdminSuspensionHistoryItem,
  // Settings
  Subject,
  PlatformConfig,
  // Common
  ApiResponse,
  FilterParams,
} from '../types/admin.types';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const user = getCurrentUser();
    if (user?.accessToken) {
      config.headers.Authorization = `Bearer ${user.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - Handle 401 (token expired)
setupAuthInterceptor(api);

// ============================================
// DASHBOARD APIs (ADM-01)
// ============================================
// Dashboard endpoints live in services/adminDashboard.service.ts (split into
// /stats, /users, /tutor-performance, /disputes — matches BE refactor).

// ============================================
// VETTING APIs (ADM-02)
// ============================================

/**
 * Get list of pending tutors for review
 * API: GET /api/admin/tutors/pending
 *
 * The response body only carries the current page slice (`content`); the true
 * total across all pages comes from the `X-Pagination` header (BE caps PageSize
 * at 50). We surface `total` so the UI can paginate and show an accurate count.
 */
export const getPendingTutors = async (
  pageNumber: number = 1,
  pageSize: number = 10,
  options?: { searchTerm?: string; orderBy?: string },
): Promise<{ content: PendingTutorFromAPI[]; total: number }> => {
  try {
    // BE searches Fullname/Email/Phone/Username server-side; OrderBy accepts
    // "createdat_asc" (oldest first — FIFO review queue) or defaults to newest.
    const params: Record<string, string | number> = {
      PageNumber: pageNumber,
      PageSize: pageSize,
    };
    if (options?.searchTerm) params.SearchTerm = options.searchTerm;
    if (options?.orderBy) params.OrderBy = options.orderBy;

    const response = await api.get<PendingTutorsAPIResponse>('/admin/tutors/pending', {
      params,
    });
    const content = response.data.content || [];

    let total = content.length;
    const paginationHeader = response.headers['x-pagination'];
    if (paginationHeader) {
      try {
        const pagination = JSON.parse(paginationHeader);
        total = pagination.TotalCount ?? total;
      } catch {
        /* malformed header — fall back to page length */
      }
    }

    return { content, total };
  } catch (error) {
    console.error('getPendingTutors error:', error);
    throw error;
  }
};

/**
 * Get single pending tutor (từ danh sách pending đã fetch)
 * Không cần API riêng vì data đã đầy đủ từ /api/tutors/pending
 */
export const getPendingTutorById = async (tutorId: string): Promise<PendingTutorFromAPI | null> => {
  try {
    const response = await getPendingTutors(1, 100);
    const tutor = response.content.find((t) => t.userid === tutorId);
    return tutor || null;
  } catch (error) {
    console.error('getPendingTutorById error:', error);
    throw error;
  }
};

/**
 * Approve or Reject tutor profile
 * API: PUT /tutors/{id}/approval
 * @param tutorId - User ID của tutor
 * @param isApproved - true = approve, false = reject
 * @param reason - Lý do (bắt buộc khi reject)
 */
export const updateTutorApproval = async (tutorId: string, isApproved: boolean, reason?: string): Promise<any> => {
  try {
    const requestBody: TutorApprovalRequest = {
      isApproved,
      reason: reason || '',
    };
    // AdminController has [Route("api/admin")], so endpoint is /api/admin/tutors/{id}/approval
    const { data } = await api.put(`/admin/tutors/${tutorId}/approval`, requestBody);
    return data;
  } catch (error) {
    console.error('updateTutorApproval error:', error);
    throw error;
  }
};

/**
 * Get list of profile update requests pending admin review — submitted by tutors who are
 * already Active. Tutorprofile itself is untouched until reviewed, so marketplace still
 * shows the old data; this list is the ONLY place the proposed changes are visible.
 * API: GET /api/admin/tutor-profile-update-requests
 */
export const getPendingProfileUpdateRequests = async (): Promise<ProfileUpdateRequestsAPIResponse> => {
  try {
    const { data } = await api.get<ProfileUpdateRequestsAPIResponse>('/admin/tutor-profile-update-requests');
    return data;
  } catch (error) {
    console.error('getPendingProfileUpdateRequests error:', error);
    throw error;
  }
};

/**
 * Get the LATEST version of a single tutor's pending profile update request. Call this right
 * before submitting Approve/Reject to check whether the tutor submitted something newer while
 * the admin was viewing the (non-real-time) list/modal — the screen does not auto-refresh.
 * API: GET /api/admin/tutor-profile-update-requests/{tutorId}
 * Returns content: null (via 404) if the request no longer exists (already resolved).
 */
export const getProfileUpdateRequestDetail = async (
  tutorId: string
): Promise<ProfileUpdateRequestFromAPI | null> => {
  try {
    const { data } = await api.get<{ content: ProfileUpdateRequestFromAPI }>(
      `/admin/tutor-profile-update-requests/${tutorId}`
    );
    return data.content;
  } catch (error) {
    const apiError = error as { response?: { status?: number } };
    if (apiError?.response?.status === 404) return null;
    console.error('getProfileUpdateRequestDetail error:', error);
    throw error;
  }
};

/**
 * Approve or reject a tutor's pending profile update request.
 * API: PUT /api/admin/tutor-profile-update-requests/{tutorId}/review
 */
export const reviewProfileUpdateRequest = async (
  tutorId: string,
  isApproved: boolean,
  note?: string
): Promise<any> => {
  try {
    const requestBody: ReviewProfileUpdateRequestBody = { isApproved, note };
    const { data } = await api.put(`/admin/tutor-profile-update-requests/${tutorId}/review`, requestBody);
    return data;
  } catch (error) {
    console.error('reviewProfileUpdateRequest error:', error);
    throw error;
  }
};

/**
 * Approve or reject a certificate after manual admin review.
 * API: PUT /api/admin/tutors/{tutorId}/certificates/{certId}/verify
 * @param isApproved - true = verified, false = rejected
 * @param note - Admin note; required by BE when rejecting
 * Returns the updated certificate; `isProfileActivated` is true when approving
 * this certificate made the whole tutor profile eligible and it went Active.
 */
export const adminVerifyCertificate = async (
  tutorId: string,
  certId: string,
  isApproved: boolean,
  note?: string,
): Promise<AdminVerifyCertificateResponse> => {
  try {
    const { data } = await api.put(`/admin/tutors/${tutorId}/certificates/${certId}/verify`, {
      isApproved,
      note: note || '',
    });
    return data.content;
  } catch (error) {
    console.error('adminVerifyCertificate error:', error);
    throw error;
  }
};

// Raw item shape returned by GET /api/admin/certificates/pending (BE camelCase).
interface RawPendingCertificate {
  certificateId: string;
  certificateName: string;
  certificateType: string | null;
  issuingOrganization: string;
  yearIssued: number | null;
  credentialId: string | null;
  credentialUrl: string | null;
  verificationStatus: string | null;
  certificateFileUrl: string | null;
  createdAt: string | null;
  tutorId: string;
  tutorFullName: string | null;
  tutorEmail: string | null;
  tutorAvatarUrl: string | null;
}

/**
 * List certificates for admin review (cert-centric, server-paginated).
 * API: GET /api/admin/certificates/pending
 *
 * Covers all certs in the chosen status — including those of already-Active
 * tutors. Search / sort / pagination are handled server-side; `total` comes from
 * the X-Pagination header.
 *
 * @param options.status  - "pending_review" (default) | "verified" | "rejected" | "all"
 * @param options.orderBy - "createdat_desc" (default) | "createdat_asc" | "tutorname_asc" | "tutorname_desc"
 */
export const getPendingCertificates = async (
  pageNumber: number = 1,
  pageSize: number = 15,
  options?: { searchTerm?: string; orderBy?: string; status?: string },
): Promise<PendingCertificatesResponse> => {
  try {
    const params: Record<string, string | number> = {
      PageNumber: pageNumber,
      PageSize: pageSize,
    };
    if (options?.searchTerm) params.SearchTerm = options.searchTerm;
    if (options?.orderBy) params.OrderBy = options.orderBy;
    if (options?.status) params.Status = options.status;

    const response = await api.get('/admin/certificates/pending', { params });

    const raw: RawPendingCertificate[] = response.data.content ?? [];
    const content: PendingCertificate[] = raw.map((r) => ({
      certificateId: r.certificateId,
      certificateName: r.certificateName,
      certificateType: r.certificateType?.trim() || null,
      issuingOrganization: r.issuingOrganization,
      yearIssued: r.yearIssued ?? null,
      credentialId: r.credentialId ?? null,
      credentialUrl: r.credentialUrl ?? null,
      verificationStatus: r.verificationStatus ?? 'pending_review',
      certificateFileUrl: r.certificateFileUrl ?? null,
      createdAt: r.createdAt ?? null,
      tutorId: r.tutorId,
      tutorName: r.tutorFullName ?? '',
      tutorEmail: r.tutorEmail ?? '',
      tutorAvatarUrl: r.tutorAvatarUrl ?? null,
    }));

    let total = content.length;
    const header = response.headers['x-pagination'];
    if (header) {
      try {
        total = JSON.parse(header).TotalCount ?? total;
      } catch {
        /* ignore */
      }
    }
    return { content, total };
  } catch (error) {
    console.error('getPendingCertificates error:', error);
    throw error;
  }
};

// ============================================
// DISPUTES APIs (ADM-03)
// ============================================

/**
 * Get list of disputes with optional filtering
 * Backend: GET /api/admin/disputes?status=&page=&pageSize=
 * Returns APIResponse<PagedList<DisputeListDto>>
 */
export const getDisputes = async (
  params?: DisputeQueryParams,
): Promise<DisputePage> => {
  try {
    const { data } = await api.get('/admin/disputes', { params });
    // BE trả APIResponse<DisputeListPageResponse> = { items, totalCount, page, pageSize }.
    // Trước đây hàm này gán thẳng `data.content` vào một mảng — sai kiểu, `items` không bao
    // giờ được bóc ra. Vẫn nhận cả dạng mảng phòng môi trường chạy bản BE cũ hơn.
    const content = data.content;
    if (Array.isArray(content)) {
      return { items: content, totalCount: content.length };
    }
    return {
      items: content?.items ?? [],
      totalCount: content?.totalCount ?? content?.items?.length ?? 0,
    };
  } catch (error) {
    console.error('getDisputes error:', error);
    throw error;
  }
};

/**
 * Get list of disputes (legacy wrapper using old types)
 */
export const getDisputesLegacy = async (filters?: FilterParams): Promise<DisputeListItem[]> => {
  try {
    const { data } = await api.get('/admin/disputes', { params: filters });
    return data.content || [];
  } catch (error) {
    console.error('getDisputesLegacy error:', error);
    throw error;
  }
};

/**
 * Get detailed dispute information
 * Backend: GET /api/admin/disputes/{disputeId}
 * Returns APIResponse<DisputeDetailDto>
 */
export const getDisputeDetail = async (disputeId: string | number): Promise<DisputeDetail> => {
  try {
    const { data } = await api.get(`/admin/disputes/${disputeId}`);
    return data.content;
  } catch (error) {
    console.error('getDisputeDetail error:', error);
    throw error;
  }
};

/** Confirm a tutor no-show after admin review without moving money or closing the dispute. */
export const confirmTutorNoShow = async (disputeId: string | number): Promise<DisputeDetail> => {
  try {
    const { data } = await api.put(`/admin/disputes/${disputeId}/confirm-no-show`);
    return data.content;
  } catch (error) {
    console.error('confirmTutorNoShow error:', error);
    throw error;
  }
};

/** (Re)run AI priority classification for a dispute — backfills older disputes or retries a failed run. */
export const classifyDispute = async (disputeId: string | number): Promise<DisputeDetail> => {
  try {
    const { data } = await api.put(`/admin/disputes/${disputeId}/classify`);
    return data.content;
  } catch (error) {
    console.error('classifyDispute error:', error);
    throw error;
  }
};
/**
 * Attendance evidence rebuilt from Agora channel notifications.
 * Backend: GET /api/admin/class-sessions/{classSessionId}/session-log
 * Returns APIResponse<SessionLogResponse>. Gated behind the dispute.view permission.
 */
export const getSessionLog = async (classSessionId: string | number): Promise<SessionLog> => {
  try {
    const { data } = await api.get(`/admin/class-sessions/${classSessionId}/session-log`);
    return data.content;
  } catch (error) {
    console.error('getSessionLog error:', error);
    throw error;
  }
};

/**
 * Punctuality and reliability of one tutor, aggregated from the same attendance evidence.
 * Backend: GET /api/admin/tutors/{tutorUserId}/reliability?from=&to=
 * Omitting the range asks the backend for its default window (last 90 days).
 */
export const getTutorReliability = async (
  tutorUserId: string,
  range?: { from?: string; to?: string },
): Promise<TutorReliability> => {
  try {
    const { data } = await api.get(`/admin/tutors/${tutorUserId}/reliability`, {
      params: { from: range?.from, to: range?.to },
    });
    return data.content;
  } catch (error) {
    console.error('getTutorReliability error:', error);
    throw error;
  }
};

/**
 * Whether Agora's notifications are actually usable as evidence — specifically whether they carry
 * the `account` field that lets a channel uid bind to a real user.
 * Backend: GET /api/admin/agora/ncs-diagnostics
 */
export const getAgoraNcsDiagnostics = async (): Promise<AgoraNcsDiagnostics> => {
  try {
    const { data } = await api.get('/admin/agora/ncs-diagnostics');
    return data.content;
  } catch (error) {
    console.error('getAgoraNcsDiagnostics error:', error);
    throw error;
  }
};

/**
 * Resolve dispute with admin decision
 * Backend: PUT /api/admin/disputes/{disputeId}/resolve
 * Returns APIResponse<DisputeDetailDto>
 */
export const resolveDispute = async (
  disputeId: string | number,
  request: ResolveDisputeRequest,
): Promise<DisputeDetail> => {
  try {
    const { data } = await api.put(`/admin/disputes/${disputeId}/resolve`, request);
    return data.content;
  } catch (error) {
    console.error('resolveDispute error:', error);
    throw error;
  }
};

export interface RefundPreviewDto {
  classSessionId: number;
  percentage: number;
  parentRefundAmount: number;
  tutorPayoutAmount: number;
  /** Đã đóng đợt 1 (deposit — đúng 1 buổi đầu) chưa. */
  isDepositPaid: boolean;
  /** Đã đóng đợt 2 (remaining — các buổi còn lại) chưa. */
  isRemainingPaid: boolean;
  tutorFrozenBalance: number;
  warnings: string[];
}

/**
 * Preview parent refund / tutor payout amounts for a candidate percentage before resolving.
 * Backend: GET /api/admin/disputes/{disputeId}/refund-preview?percentage=
 */
export const getRefundPreview = async (
  disputeId: string | number,
  percentage: number,
): Promise<RefundPreviewDto> => {
  const { data } = await api.get(`/admin/disputes/${disputeId}/refund-preview`, { params: { percentage } });
  return data.content;
};

/**
 * Issue a warning to a user.
 * Backend: POST /api/admin/warnings/users/{userId}
 * BE DTO (CreateWarningRequest):
 *   - warningLevel: int (1 = Thấp, 2 = Trung bình, 3 = Cao — 3 tạm ngưng ngay)
 *   - reason: string (10-1000 chars, required)
 *   - relatedBookingId: int? (nullable)
 *
 * The FE type uses lowercase keys (`warninglevel`, `relatedbookingid`) for
 * historical reasons; we remap to camelCase here and parse the optional
 * booking id from string to int (BE rejects strings).
 */
export const issueWarning = async (request: IssueWarningRequest): Promise<ApiResponse<any>> => {
  try {
    const { userid, warninglevel, reason, relatedbookingid } = request;

    // BE wants an int — drop the field entirely if the input isn't a clean number,
    // otherwise binding fails with a 400 on a perfectly valid optional field.
    let relatedBookingId: number | undefined;
    if (relatedbookingid) {
      const parsed = parseInt(relatedbookingid, 10);
      if (!Number.isNaN(parsed)) relatedBookingId = parsed;
    }

    const body = {
      warningLevel: warninglevel,
      reason,
      ...(relatedBookingId !== undefined ? { relatedBookingId } : {}),
    };
    const { data } = await api.post(`/admin/warnings/users/${userid}`, body);
    return data;
  } catch (error) {
    console.error('issueWarning error:', error);
    throw error;
  }
};

/**
 * Apply a suspension to a user.
 * Backend: POST /api/admin/warnings/users/{userId}/suspend
 * BE DTO (SuspensionRequest):
 *   - suspensionType: string (e.g. "temporary", "hidden_1_week", "account_locked")
 *   - reason: string (required)
 *   - durationDays: int? (nullable, BE defaults to 7)
 *
 * Kept the name `suspendTutor` for backward compatibility with the
 * AdminDisputes page; the underlying BE endpoint is generic across roles.
 */
export const suspendTutor = async (request: SuspendUserRequest): Promise<ApiResponse<any>> => {
  try {
    const { userid, suspensiontype, reason, durationDays } = request;
    const body = {
      suspensionType: suspensiontype,
      reason,
      ...(durationDays !== undefined ? { durationDays } : {}),
    };
    const { data } = await api.post(`/admin/warnings/users/${userid}/suspend`, body);
    return data;
  } catch (error) {
    console.error('suspendTutor error:', error);
    throw error;
  }
};

// ============================================
// FINANCIALS APIs (ADM-04)
// ============================================

/**
 * Get financial metrics: revenue, bookings, class sessions, users, withdrawals, escrow.
 * Backend: GET /api/admin/financials/metrics -> APIResponse<AdminFinancialMetricsResponse>
 */
export const getFinancialMetrics = async (
  params?: { from?: string; to?: string; period?: 'month' | 'week' | 'year' },
): Promise<FinancialMetrics> => {
  try {
    const { data } = await api.get('/admin/financials/metrics', { params });
    return data.content;
  } catch (error) {
    console.error('getFinancialMetrics error:', error);
    throw error;
  }
};

/**
 * Get wallet transaction ledger with pagination and filters.
 * Backend: GET /api/admin/financials/transactions -> APIResponse<AdminTransactionListResponse>
 */
export const getTransactions = async (
  params?: AdminTransactionQueryParams,
): Promise<TransactionListResponse> => {
  try {
    const { data } = await api.get('/admin/financials/transactions', { params });
    return data.content;
  } catch (error) {
    console.error('getTransactions error:', error);
    throw error;
  }
};

/**
 * Get platform-wide wallet transaction ledger.
 * GET /admin/financials/transactions → AdminTransactionListResponse (unwrapped từ data.content).
 */
export const getAdminTransactions = async (params?: {
  page?: number;
  pageSize?: number;
  type?: string;
  userId?: string;
  from?: string;
  to?: string;
  search?: string;
}): Promise<AdminTransactionListResponse> => {
  const { data } = await api.get('/admin/financials/transactions', { params });
  return data.content;
};

// ============================================
// USER MANAGEMENT APIs (ADM-05)
// ============================================

/**
 * Get list of all users with filtering
 * Backend: GET /api/admin/users with AdminUserFilterParameters
 * Returns APIResponse<PagedList<UserResponse>> with X-Pagination header
 */
export const getAllUsers = async (
  params?: {
    searchTerm?: string;
    role?: string;
    status?: number;
    pageNumber?: number;
    pageSize?: number;
  },
  signal?: AbortSignal,
): Promise<{ users: UserListItem[]; total: number }> => {
  try {
    const response = await api.get('/admin/users', { params, signal });
    const data = response.data;
    // Backend: APIResponse<PagedList<UserResponse>> - content is array, total from X-Pagination header.
    // NOTE: X-Pagination is a custom response header, so the browser only exposes it
    // to JS when the API sends `Access-Control-Expose-Headers: X-Pagination`. If that
    // is missing, `total` silently collapses to the current page length and the
    // pagination bar disappears — warn loudly instead of failing quietly.
    const paginationHeader = response.headers['x-pagination'];
    let total = data.content?.length ?? 0;
    if (paginationHeader) {
      try {
        const pagination = JSON.parse(paginationHeader);
        total = pagination.TotalCount ?? total;
      } catch {
        /* ignore */
      }
    } else {
      console.warn(
        '[getAllUsers] Thiếu header X-Pagination — tổng số bản ghi đang lấy tạm theo số dòng của trang hiện tại, ' +
        'nên phân trang sẽ không hiển thị. Kiểm tra Access-Control-Expose-Headers ở CORS của backend.',
      );
    }
    const users: UserListItem[] = (data.content || []).map((u: any) => ({
      userid: u.userid,
      fullname: u.fullname || u.username || '',
      email: u.email,
      phone: u.phone || '',
      primaryrole: (u.role || 'student').toLowerCase() as any,
      status: u.status === 1 ? 'active' : u.status === 0 ? 'inactive' : 'blocked',
      createdat: u.createdat || u.createdAt || '',
      lastloginat: u.lastloginat || u.lastLoginAt || null,
      avatarurl: u.avatarurl || null,
      // BE chỉ trả 2 field này ở endpoint danh sách admin; null = chưa tính được.
      warningsCount: u.warningsCount ?? 0,
      suspensionsCount: u.suspensionsCount ?? 0,
    }));
    return { users, total };
  } catch (error) {
    console.error('getAllUsers error:', error);
    throw error;
  }
};

/**
 * Update user fields (admin)
 * Backend: PUT /api/admin/users/{id}
 */
export const updateUser = async (
  userId: string,
  request: {
    fullname?: string;
    email?: string;
    phone?: string;
    primaryrole?: string;
    status?: number;
    address?: string;
    gender?: string;
    avatarurl?: string;
  },
): Promise<void> => {
  try {
    await api.put(`/admin/users/${userId}`, request);
  } catch (error) {
    console.error('updateUser error:', error);
    throw error;
  }
};

/**
 * Deactivate user (set status = 0)
 * Backend: PUT /api/admin/users/{id}/deactivate
 */
export const deactivateUser = async (userId: string): Promise<void> => {
  try {
    await api.put(`/admin/users/${userId}/deactivate`);
  } catch (error) {
    console.error('deactivateUser error:', error);
    throw error;
  }
};

/**
 * Reactivate user (set status = 1).
 * Backend: PUT /api/admin/users/{id}/reactivate
 * Unlike a plain status update, this also restores Ispublic = true for a tutor
 * whose profile is Active, so the profile reappears on the marketplace.
 */
export const reactivateUser = async (userId: string): Promise<void> => {
  try {
    await api.put(`/admin/users/${userId}/reactivate`);
  } catch (error) {
    console.error('reactivateUser error:', error);
    throw error;
  }
};

/**
 * Create a new customer account (Student / Parent / Tutor).
 * Backend: POST /api/admin/users → 201 with the created UserResponse.
 * Only customer roles are accepted; Staff/Admin have a separate flow.
 */
export const createUser = async (request: {
  fullname: string;
  email?: string;
  phone: string;
  password: string;
  role: string;
}): Promise<void> => {
  try {
    await api.post('/admin/users', request);
  } catch (error) {
    console.error('createUser error:', error);
    throw error;
  }
};

/**
 * Permanently delete a user (Admin only).
 * Backend: DELETE /api/admin/users/{id}
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await api.delete(`/admin/users/${userId}`);
  } catch (error) {
    console.error('deleteUser error:', error);
    throw error;
  }
};

/**
 * Get admin-only user detail with Parent/Student relationships.
 */
export const getUserDetail = async (userId: string, signal?: AbortSignal): Promise<AdminUserDetail> => {
  try {
    const { data } = await api.get<{ content?: AdminUserDetail }>(`/admin/users/${userId}`, { signal });
    if (!data.content) throw new Error('Phản hồi chi tiết người dùng không có dữ liệu.');
    return data.content;
  } catch (error) {
    if ((error as { code?: string })?.code !== 'ERR_CANCELED') {
      console.error('getUserDetail error:', error);
    }
    throw error;
  }
};

// ============================================
// SETTINGS APIs (ADM-06)
// ============================================

/**
 * Get list of subjects
 */
export const getSubjects = async (): Promise<Subject[]> => {
  try {
    const { data } = await api.get('/admin/settings/subjects');
    return data;
  } catch (error) {
    console.error('getSubjects error:', error);
    throw error;
  }
};

/**
 * Create new subject
 */
export const createSubject = async (subject: Partial<Subject>): Promise<ApiResponse<Subject>> => {
  try {
    const { data } = await api.post('/admin/settings/subjects', subject);
    return data;
  } catch (error) {
    console.error('createSubject error:', error);
    throw error;
  }
};

/**
 * Update existing subject
 */
export const updateSubject = async (subjectId: string, subject: Partial<Subject>): Promise<ApiResponse<Subject>> => {
  try {
    const { data } = await api.put(`/admin/settings/subjects/${subjectId}`, subject);
    return data;
  } catch (error) {
    console.error('updateSubject error:', error);
    throw error;
  }
};

/**
 * Delete subject (soft delete)
 * Updates isactive = false
 */
export const deleteSubject = async (subjectId: string): Promise<ApiResponse<any>> => {
  try {
    const { data } = await api.delete(`/admin/settings/subjects/${subjectId}`);
    return data;
  } catch (error) {
    console.error('deleteSubject error:', error);
    throw error;
  }
};

/**
 * Get platform configuration
 */
export const getPlatformConfig = async (): Promise<PlatformConfig> => {
  try {
    const { data } = await api.get('/admin/settings/platform-config');
    return data;
  } catch (error) {
    console.error('getPlatformConfig error:', error);
    throw error;
  }
};

/**
 * Update platform configuration
 */
export const updatePlatformConfig = async (config: Partial<PlatformConfig>): Promise<ApiResponse<PlatformConfig>> => {
  try {
    const { data } = await api.put('/admin/settings/platform-config', config);
    return data;
  } catch (error) {
    console.error('updatePlatformConfig error:', error);
    throw error;
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Export data to CSV
 * Generic function for exporting any data
 */
export const exportToCSV = async (endpoint: string, filename: string): Promise<void> => {
  try {
    const { data } = await api.get(endpoint, {
      responseType: 'blob',
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('exportToCSV error:', error);
    throw error;
  }
};

/**
 * Get chat history for dispute
 * Backend: GET /api/admin/disputes/{disputeId}/chat
 * Returns APIResponse<List<ChatMessageResponseDTO>>
 */
export const getDisputeChatHistory = async (disputeId: string | number): Promise<any[]> => {
  try {
    const { data } = await api.get(`/admin/disputes/${disputeId}/chat`);
    return data.content || [];
  } catch (error) {
    console.error('getDisputeChatHistory error:', error);
    throw error;
  }
};

/**
 * Trạng thái + link stream tạm của bản ghi video buổi học gắn với tranh chấp.
 * Backend: GET /api/admin/disputes/{disputeId}/recording
 * Returns APIResponse<DisputeRecordingResponse>
 *
 * `recordingUrl` là đường dẫn tương đối tới endpoint proxy (token ngắn hạn, hết hạn sau ít
 * phút) — KHÔNG phải link Drive trực tiếp (file trên Drive luôn ở chế độ private). Ghép với
 * gốc backend thật (VITE_BACKEND_URL) trước khi gán vào `<video src>`.
 */
export interface DisputeRecording {
  disputeId: number;
  classSessionId?: number;
  /** available (xem được) | processing (đang đẩy lên lưu trữ) | recording (đang ghi) | none. */
  status: 'available' | 'processing' | 'recording' | 'none';
  recordingUrl?: string;
  available: boolean;
}

export const getDisputeRecording = async (disputeId: string | number): Promise<DisputeRecording> => {
  try {
    const { data } = await api.get(`/admin/disputes/${disputeId}/recording`);
    return data.content;
  } catch (error) {
    console.error('getDisputeRecording error:', error);
    throw error;
  }
};

/**
 * `recordingUrl` là đường dẫn tương đối — ghép với gốc backend thật trước khi gán vào
 * `<video src>`. Thẻ video không đi qua axios/proxy nên phải tự resolve.
 */
export const resolveRecordingStreamUrl = (recordingUrl: string): string => {
  if (/^https?:\/\//i.test(recordingUrl)) return recordingUrl;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:5166';
  return `${backendUrl.replace(/\/$/, '')}${recordingUrl}`;
};

/**
 * Upload evidence file for dispute
 * @param disputeId - Dispute ID
 * @param file - File to upload
 */
export const uploadDisputeEvidence = async (disputeId: string, file: File): Promise<ApiResponse<string>> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post(`/admin/disputes/${disputeId}/evidence`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (error) {
    console.error('uploadDisputeEvidence error:', error);
    throw error;
  }
};

// ============================================
// M3 ADDITIONS: Investigate, Stats, Warnings, Suspensions
// ============================================

/**
 * Start investigating a dispute
 * Backend: PUT /api/admin/disputes/{disputeId}/investigate?forceEarly=
 * Returns APIResponse<DisputeDetailDto>
 * forceEarly bypasses the 48h grace period given to the tutor to respond first.
 */
export const investigateDispute = async (disputeId: string | number, forceEarly = false): Promise<DisputeDetail> => {
  try {
    const { data } = await api.put(`/admin/disputes/${disputeId}/investigate`, null, { params: { forceEarly } });
    return data.content;
  } catch (error) {
    console.error('investigateDispute error:', error);
    throw error;
  }
};

export interface DisputeMessageDto {
  disputeMessageId: number;
  disputeId: number;
  threadType: 'tutor' | 'parent';
  senderId: string | null;
  senderName: string | null;
  senderRole: string | null;
  message: string;
  createdAt: string | null;
}

/**
 * Get one of the two private threads (tutor or parent/student) for a dispute.
 * Backend: GET /api/admin/disputes/{disputeId}/thread/{threadType}
 */
export const getDisputeThread = async (
  disputeId: string | number,
  threadType: 'tutor' | 'parent',
): Promise<DisputeMessageDto[]> => {
  const { data } = await api.get(`/admin/disputes/${disputeId}/thread/${threadType}`);
  return data.content || [];
};

/**
 * Send a message into one of the two private threads for a dispute.
 * Backend: POST /api/admin/disputes/{disputeId}/thread/{threadType}/messages
 */
export const sendDisputeThreadMessage = async (
  disputeId: string | number,
  threadType: 'tutor' | 'parent',
  message: string,
): Promise<DisputeMessageDto> => {
  const { data } = await api.post(`/admin/disputes/${disputeId}/thread/${threadType}/messages`, { message });
  return data.content;
};

/**
 * Get dispute statistics
 * Backend: GET /api/admin/disputes/stats
 * Returns APIResponse<DisputeStatsDto>
 */
export const getDisputeStats = async (): Promise<DisputeStatsDto> => {
  try {
    const { data } = await api.get('/admin/disputes/stats');
    return data.content;
  } catch (error) {
    console.error('getDisputeStats error:', error);
    throw error;
  }
};

/**
 * Get a user's warning summary and full warning history.
 * Backend: GET /api/admin/warnings/users/{userId} — requires the `warning.view`
 * permission, so callers should gate on it to avoid a guaranteed 403.
 *
 * Returns a normalized summary: a user with no warnings still yields zeroed
 * counters and an empty list rather than null, so callers can render directly.
 */
export const getUserWarnings = async (
  userId: string,
  signal?: AbortSignal
): Promise<AdminUserWarningSummary> => {
  try {
    const { data } = await api.get<{ content?: AdminUserWarningSummary }>(
      `/admin/warnings/users/${userId}`,
      { signal }
    );
    const content = data.content;
    return {
      userId: content?.userId ?? userId,
      fullName: content?.fullName ?? null,
      email: content?.email ?? null,
      totalWarnings: content?.totalWarnings ?? 0,
      level1Warnings: content?.level1Warnings ?? 0,
      level2Warnings: content?.level2Warnings ?? 0,
      warningsLast30Days: content?.warningsLast30Days ?? 0,
      isSuspended: content?.isSuspended ?? false,
      suspensionType: content?.suspensionType ?? null,
      suspensionEndDate: content?.suspensionEndDate ?? null,
      warnings: content?.warnings ?? [],
    };
  } catch (error) {
    if ((error as { code?: string })?.code !== 'ERR_CANCELED') {
      console.error('getUserWarnings error:', error);
    }
    throw error;
  }
};

/**
 * Get a user's full suspension history — active and already ended — newest first.
 * Backend: GET /api/admin/warnings/users/{userId}/suspensions — requires the
 * `warning.view` permission.
 *
 * Distinct from `getActiveSuspensions`, which lists only currently active
 * suspensions across all users.
 */
export const getUserSuspensions = async (
  userId: string,
  signal?: AbortSignal
): Promise<AdminSuspensionHistoryItem[]> => {
  try {
    const { data } = await api.get<{ content?: AdminSuspensionHistoryItem[] }>(
      `/admin/warnings/users/${userId}/suspensions`,
      { signal }
    );
    return data.content ?? [];
  } catch (error) {
    if ((error as { code?: string })?.code !== 'ERR_CANCELED') {
      console.error('getUserSuspensions error:', error);
    }
    throw error;
  }
};

/**
 * Unsuspend a user
 */
export const unsuspendUser = async (userId: string): Promise<ApiResponse<any>> => {
  try {
    const { data } = await api.put(`/admin/warnings/users/${userId}/unsuspend`);
    return data;
  } catch (error) {
    console.error('unsuspendUser error:', error);
    throw error;
  }
};

/**
 * Get all active suspensions
 */
export const getActiveSuspensions = async (page: number = 1, pageSize: number = 10): Promise<ApiResponse<any>> => {
  try {
    const { data } = await api.get('/admin/warnings/suspensions', {
      params: { page, pageSize },
    });
    return data;
  } catch (error) {
    console.error('getActiveSuspensions error:', error);
    throw error;
  }
};
