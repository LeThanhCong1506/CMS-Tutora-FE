import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { getCurrentUser, updateTokens, clearUserFromStorage } from './auth.service';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

/**
 * Add auth interceptor to any axios instance.
 * - Request: tự động gắn Bearer token
 * - Response 401: silent refresh, retry request gốc
 * - Refresh thất bại: clear storage, redirect /login (admin repo: web-only,
 *   không có nhánh Zalo Mini App như Agora-Frontend gốc).
 */
export const setupAuthInterceptor = (axiosInstance: AxiosInstance): AxiosInstance => {
  // Request interceptor: gắn token vào mọi request
  axiosInstance.interceptors.request.use(
    (config) => {
      const user = getCurrentUser();
      if (user?.accessToken) {
        config.headers.Authorization = `Bearer ${user.accessToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: xử lý 401 với silent refresh
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      // Nếu đang refresh → queue request lại, chờ refresh xong
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const user = getCurrentUser();
        if (!user?.refreshToken) {
          throw new Error('No refresh token');
        }

        // Dùng axios gốc (không qua intercepted instance) để tránh vòng lặp
        const response = await axios.post(`${API_BASE_URL}/tokens/refresh`, {
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
        });

        const { token, refreshToken } = response.data.content;
        await updateTokens(token, refreshToken);

        processQueue(null, token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearUserFromStorage();
        // Admin repo: chỉ web, redirect thẳng login (không có nhánh Zalo).
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
  );

  return axiosInstance;
};

// export axios instance with auth interceptor applied
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
setupAuthInterceptor(apiClient);
