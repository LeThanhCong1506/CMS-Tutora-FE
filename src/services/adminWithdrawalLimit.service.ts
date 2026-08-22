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

/** Đơn vị: VND. */
export interface WithdrawalLimitConfig {
    minWithdrawalAmount: number;
    updatedAt?: string;
    updatedByName?: string;
}

interface ApiEnvelope<T> {
    content: T;
    statusCode: number;
    message: string;
}

export const getWithdrawalLimitConfig = async (): Promise<WithdrawalLimitConfig> => {
    const response = await api.get<ApiEnvelope<WithdrawalLimitConfig>>('/admin/withdrawal-limit/config');
    return response.data.content;
};

export const updateWithdrawalLimitConfig = async (minWithdrawalAmount: number): Promise<WithdrawalLimitConfig> => {
    const response = await api.put<ApiEnvelope<WithdrawalLimitConfig>>('/admin/withdrawal-limit/config', {
        minWithdrawalAmount,
    });
    return response.data.content;
};
