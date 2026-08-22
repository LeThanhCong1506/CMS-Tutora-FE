import axios from 'axios';
import { getCurrentUser } from './auth.service';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({ baseURL: API_BASE_URL });

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

/** Đơn vị phần trăm: số nguyên (5 = 5%), không phải phân số. */
export interface CommissionConfig {
    parentFeePercent: number;
    tutorFeePercent: number;
    updatedAt?: string;
    updatedByName?: string;
}

export interface CommissionConfigHistoryItem {
    parentFeePercent: number;
    tutorFeePercent: number;
    changedAt: string;
    changedByName?: string;
}

export interface CommissionConfigWithHistory extends CommissionConfig {
    history: CommissionConfigHistoryItem[];
}

interface ApiEnvelope<T> {
    content: T;
    statusCode: number;
    message: string;
}

export const getCommissionConfig = async (): Promise<CommissionConfigWithHistory> => {
    const response = await api.get<ApiEnvelope<CommissionConfigWithHistory>>('/admin/commission/config');
    return response.data.content;
};

export const updateCommissionConfig = async (
    parentFeePercent: number,
    tutorFeePercent: number,
): Promise<CommissionConfigWithHistory> => {
    const response = await api.put<ApiEnvelope<CommissionConfigWithHistory>>('/admin/commission/config', {
        parentFeePercent,
        tutorFeePercent,
    });
    return response.data.content;
};
