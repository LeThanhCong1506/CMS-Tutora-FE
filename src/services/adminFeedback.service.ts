/* eslint-disable no-useless-catch */
import axios from 'axios';
import { getCurrentUser } from './auth.service';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use(
    (config) => {
        const user = getCurrentUser();
        if (user?.accessToken) {
            config.headers.Authorization = `Bearer ${user.accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

export interface AdminFeedbackItem {
    feedbackId: number;
    bookingId?: number;
    rating: number;
    comment?: string;
    feedbackType?: string;
    createdAt: string;
    /** Người viết đánh giá (phụ huynh hoặc học sinh tự đăng ký). */
    parentName?: string;
    /** Gia sư nhận đánh giá. */
    tutorName?: string;
    subjectName?: string;
    initialGoal?: string;
    actualResult?: string;
    courseDuration?: string;
    reply?: string;
    repliedAt?: string;
    isVisible: boolean;
    /** Chỉ có giá trị khi đang bị ẩn. */
    hiddenReason?: string;
    hiddenAt?: string;
}

export interface AdminFeedbackFilters {
    tutorId?: string;
    rating?: number;
    isVisible?: boolean;
    page?: number;
    pageSize?: number;
}

export interface AdminFeedbackStats {
    totalCount: number;
    visibleCount: number;
    hiddenCount: number;
    averageRating: number;
}

export interface AdminFeedbackPage {
    items: AdminFeedbackItem[];
    /** Tổng trên toàn bộ tập đã lọc — dùng cho phân trang chuẩn của DataTable. */
    totalCount: number;
    stats: AdminFeedbackStats;
}

const EMPTY_STATS: AdminFeedbackStats = {
    totalCount: 0,
    visibleCount: 0,
    hiddenCount: 0,
    averageRating: 0,
};

/**
 * Danh sách đánh giá cho kiểm duyệt — khác bản công khai ở chỗ gồm cả đánh giá đã bị ẩn.
 */
export const getFeedbacksForAdmin = async (
    filters: AdminFeedbackFilters = {},
): Promise<AdminFeedbackPage> => {
    try {
        const { data } = await api.get('/feedbacks/admin', {
            params: {
                tutorId: filters.tutorId || undefined,
                rating: filters.rating,
                isVisible: filters.isVisible,
                page: filters.page ?? 1,
                pageSize: filters.pageSize ?? 20,
            },
        });

        const content = data?.content ?? data;
        const items: AdminFeedbackItem[] = content?.items ?? [];

        return {
            items,
            totalCount: content?.totalCount ?? items.length,
            stats: content?.stats ?? EMPTY_STATS,
        };
    } catch (error) {
        throw error;
    }
};

/**
 * Ẩn/hiện một đánh giá. Trả về trạng thái hiển thị mới.
 *
 * BE bắt buộc có `reason` khi ẩn — lý do được gửi thẳng cho người viết đánh giá qua thông báo.
 * Khi hiện lại thì bỏ qua. Cả hai chiều đều làm điểm gia sư được tính lại và bắn thông báo
 * cho cả người viết lẫn gia sư.
 */
export const toggleFeedbackVisibility = async (
    feedbackId: number,
    reason?: string,
): Promise<boolean> => {
    try {
        const { data } = await api.put(`/feedbacks/${feedbackId}/visibility`, { reason });
        return data?.content ?? data;
    } catch (error) {
        throw error;
    }
};
