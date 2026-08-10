/* eslint-disable no-useless-catch */
import axios from 'axios';
import { getCurrentUser } from './auth.service';
import type {
    PayoutOverview,
    PendingReviewResponse,
    AdminWithdrawalDetail,
    SystemAlertResponse,
    ApproveResult,
    RejectResult,
    AdminPayoutSummary,
    WithdrawalRequestListResponse,
    ApprovePayoutRequest,
    AdminWalletTransferRequest,
    AdminWalletTransferResult,
    AdminWalletTransferListResponse
} from '../types/adminPayout.types';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
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
    }
);

/**
 * Get payout dashboard overview
 */
export const getPayoutOverview = async (): Promise<PayoutOverview> => {
    try {
        const { data } = await api.get('/admin/payouts/overview');
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Get simplified payout summary for dashboard cards
 */
export const getPayoutSummary = async (): Promise<AdminPayoutSummary> => {
    try {
        const { data } = await api.get('/admin/payouts/overview');
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Get paged list of requests pending manual review
 */
export const getPendingReview = async (page: number = 1, pageSize: number = 20): Promise<PendingReviewResponse> => {
    try {
        const { data } = await api.get('/admin/payouts/pending', {
            params: { page, pageSize },
        });
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Get filtered withdrawal requests for admin list
 */
export const getWithdrawalRequests = async (
    page: number = 1,
    pageSize: number = 10,
    status?: string
): Promise<WithdrawalRequestListResponse> => {
    try {
        const { data } = await api.get('/admin/payouts', {
            params: { page, pageSize, status },
        });
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Get all payout requests with filters
 */
export const getAllPayoutRequests = async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    from?: string;
    to?: string;
}): Promise<WithdrawalRequestListResponse> => {
    try {
        const { data } = await api.get('/admin/payouts', { params });
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Get detailed request info for admin review
 */
export const getPayoutRequestDetail = async (id: number): Promise<AdminWithdrawalDetail> => {
    try {
        const { data } = await api.get(`/admin/payouts/${id}`);
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Manually approve a flagged request
 */
export const claimPayoutRequest = async (id: number): Promise<ApproveResult> => {
    const { data } = await api.post(`/admin/payouts/${id}/claim`);
    return data.content;
};

/**
 * Release a request claimed by the current staff/admin back to the queue.
 */
export const releasePayoutRequest = async (id: number): Promise<ApproveResult> => {
    const { data } = await api.post(`/admin/payouts/${id}/release`);
    return data.content;
};

/**
 * Complete a manually transferred payout with structured audit and receipt proof.
 */
export const approvePayoutRequest = async (id: number, request: ApprovePayoutRequest): Promise<ApproveResult> => {
    try {
        const formData = new FormData();
        formData.append('paidAt', request.paidAt);
        formData.append('note', request.note);
        formData.append('proofImage', request.proofImage);

        const { data } = await api.post(`/admin/payouts/${id}/approve`, formData);
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Manually reject a flagged request
 */
export const rejectPayoutRequest = async (id: number, reason: string): Promise<RejectResult> => {
    try {
        const { data } = await api.post(`/admin/payouts/${id}/reject`, { reason });
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Chủ động chuyển tiền vào ví một user (gia sư/phụ huynh/học sinh). Cộng thẳng vào số dư
 * ngay khi gọi — không có bước duyệt thứ hai như payout.
 */
export const transferToUser = async (request: AdminWalletTransferRequest): Promise<AdminWalletTransferResult> => {
    try {
        const { data } = await api.post('/admin/payouts/transfers', request);
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Lịch sử các lần chuyển tiền chủ động, mới nhất trước.
 */
export const getTransferHistory = async (
    page: number = 1,
    pageSize: number = 20
): Promise<AdminWalletTransferListResponse> => {
    try {
        const { data } = await api.get('/admin/payouts/transfers', {
            params: { page, pageSize },
        });
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Get system integrity alerts
 */
export const getSystemAlerts = async (params: {
    page?: number;
    pageSize?: number;
    resolved?: boolean;
}): Promise<SystemAlertResponse> => {
    try {
        const { data } = await api.get('/admin/payouts/system-alerts', { params });
        return data.content;
    } catch (error) {
        throw error;
    }
};

/**
 * Resolve a system alert
 */
export const resolveSystemAlert = async (id: number): Promise<void> => {
    try {
        await api.post(`/admin/payouts/system-alerts/${id}/resolve`);
    } catch (error) {
        throw error;
    }
};
