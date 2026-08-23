/**
 * Admin Booking service — wraps BE endpoints exposed by `AdminBookingController`:
 *   GET /api/admin/bookings        (paginated list with multi-dimensional filter)
 *   GET /api/admin/bookings/{id}   (full detail)
 *
 * Auth: Admin role required (BE checks via `[Authorize(Roles = UserRole.Admin)]`).
 */

import axios from 'axios';
import { getAuthHeaders, type ApiResponse } from './apiHelpers';
import { setupAuthInterceptor } from './apiClient';
import type {
    AdminBookingListParams,
    AdminBookingListResponse,
    AdminBookingDetailResponse,
} from '../types/adminBooking.types';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});
setupAuthInterceptor(api);

/**
 * GET /api/admin/bookings — Paginated list of all bookings.
 * `signal` is optional — pass an AbortController.signal to cancel in-flight
 * requests when filters change quickly (prevents out-of-order responses).
 */
export const getAdminBookings = async (
    params: AdminBookingListParams = {},
    signal?: AbortSignal,
): Promise<ApiResponse<AdminBookingListResponse>> => {
    // Caller handles abort vs real error — không cần try/catch wrap re-throw ở đây.
    const response = await api.get<ApiResponse<AdminBookingListResponse>>(
        '/admin/bookings',
        {
            headers: getAuthHeaders(),
            params,
            signal,
        },
    );
    return response.data;
};

/** GET /api/admin/bookings/{id} — Full booking detail for admin review. */
export const getAdminBookingDetail = async (
    id: number,
): Promise<ApiResponse<AdminBookingDetailResponse>> => {
    const response = await api.get<ApiResponse<AdminBookingDetailResponse>>(
        `/admin/bookings/${id}`,
        { headers: getAuthHeaders() },
    );
    return response.data;
};

/**
 * POST /api/admin/bookings/{id}/cancel-ghost — Staff hủy booking sau khi xác minh NGOÀI hệ thống
 * (qua tổng đài) rằng phụ huynh đã "nghỉ ngang". Giải ngân toàn bộ escrow còn lại cho gia sư.
 * Yêu cầu quyền booking.cancel.
 */
export const cancelGhostBooking = async (
    id: number,
    reason: string,
): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>(
        `/admin/bookings/${id}/cancel-ghost`,
        { reason },
        { headers: getAuthHeaders() },
    );
    return response.data;
};
