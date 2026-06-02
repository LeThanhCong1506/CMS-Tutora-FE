import axios from 'axios';
import { getAuthHeaders } from './apiHelpers';
import { setupAuthInterceptor } from './apiClient';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
setupAuthInterceptor(api);

// DTO matching backend NotificationResponse
export interface NotificationDTO {
    notificationid: number;
    userid: string;
    title: string;
    message: string;
    /**
     * Notification type — e.g. 'lesson_started', 'lesson_report_submitted', 'booking_new'.
     * Optional cho đến khi BE chuẩn hoá: hiện tại chưa phải mọi notification đều có field này.
     */
    type?: string | null;
    /**
     * ID của entity liên quan (lessonId, bookingId, warningId…) — dùng để deep-link.
     * Optional vì BE NotificationRequest hiện chưa truyền field này khi tạo notification.
     */
    referenceid?: string | null;
    isread: boolean | null;
    createdat: string | null;
    username?: string;
    userfullname?: string;
}

export interface ApiResponse<T> {
    statusCode: number;
    status: string;
    message: string;
    content: T;
}

/**
 * Get all notifications for current user
 */
export const getMyNotifications = async (): Promise<NotificationDTO[]> => {
    try {
        const response = await api.get('/notifications/mine', {
            headers: getAuthHeaders(),
        });
        return Array.isArray(response.data) ? response.data : (response.data?.content || []);
    } catch (error: any) {
        console.error('Error fetching notifications:', error);
        return [];
    }
};

/**
 * Get unread notifications only
 */
export const getUnreadNotifications = async (): Promise<NotificationDTO[]> => {
    try {
        const response = await api.get('/notifications/mine/unread', {
            headers: getAuthHeaders(),
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching unread notifications:', error);
        throw error;
    }
};

/**
 * Get count of unread notifications
 */
export const getUnreadCount = async (): Promise<number> => {
    try {
        const response = await api.get('/notifications/mine/unread-count', {
            headers: getAuthHeaders(),
        });
        // Backend returns: { unreadCount, byType, total }
        return response.data.unreadCount || 0;
    } catch (error: any) {
        console.error('Error fetching unread count:', error);
        // Return 0 on error to prevent UI breaking
        return 0;
    }
};

/**
 * Get unread notification counts grouped by `type` — dùng cho sidebar badge
 * per-tab. Cùng endpoint với `getUnreadCount` (BE bundle vào 1 response).
 * Noti có type null/empty bị BE bỏ qua khỏi map này.
 */
export const getUnreadCountByType = async (): Promise<Record<string, number>> => {
    try {
        const response = await api.get('/notifications/mine/unread-count', {
            headers: getAuthHeaders(),
        });
        return response.data?.byType || {};
    } catch (error: any) {
        console.error('Error fetching unread count by type:', error);
        return {};
    }
};

/**
 * Mark a specific notification as read
 */
export const markAsRead = async (notificationId: number): Promise<void> => {
    try {
        await api.put(`/notifications/${notificationId}/read`, null, {
            headers: getAuthHeaders(),
        });
    } catch (error: any) {
        console.error(`Error marking notification ${notificationId} as read:`, error);
        throw error;
    }
};

/**
 * Mark all unread notifications of a given `type` as read. BE sẽ push
 * `NotificationCountUpdated` qua SignalR sau khi mark → chuông tự sync.
 * Noti có type null/empty không bị ảnh hưởng (BE quy ước).
 */
export const markAsReadByType = async (type: string): Promise<void> => {
    try {
        await api.put(`/notifications/mine/read-by-type/${encodeURIComponent(type)}`, null, {
            headers: getAuthHeaders(),
        });
    } catch (error: any) {
        console.error(`Error marking notifications of type ${type} as read:`, error);
        throw error;
    }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<void> => {
    try {
        await api.put('/notifications/read-all', null, {
            headers: getAuthHeaders(),
        });
    } catch (error: any) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
};

/**
 * Delete a specific notification
 */
export const deleteNotification = async (notificationId: number): Promise<void> => {
    try {
        await api.delete(`/notifications/${notificationId}`, {
            headers: getAuthHeaders(),
        });
    } catch (error: any) {
        console.error(`Error deleting notification ${notificationId}:`, error);
        throw error;
    }
};

/**
 * Delete all notifications for current user
 */
export const deleteAllMyNotifications = async (): Promise<void> => {
    try {
        await api.delete('/notifications/mine', {
            headers: getAuthHeaders(),
        });
    } catch (error: any) {
        console.error('Error deleting all notifications:', error);
        throw error;
    }
};
