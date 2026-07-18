import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { getCurrentUser, updateTokens, clearUserFromStorage } from './auth.service';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => error ? promise.reject(error) : promise.resolve(token!));
  failedQueue = [];
};

export const setupAuthInterceptor = (axiosInstance: AxiosInstance): AxiosInstance => {
  axiosInstance.interceptors.request.use(
    (config) => {
      const user = getCurrentUser();
      if (user?.accessToken) config.headers.Authorization = `Bearer ${user.accessToken}`;
      return config;
    },
    (error) => Promise.reject(error),
  );

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      const requestUrl = String(originalRequest?.url ?? '');
      const isAccessSnapshotRequest = requestUrl.includes('/access/me');
      if (error.response?.status === 403 && !isAccessSnapshotRequest) {
        window.dispatchEvent(new Event('tutora:access-forbidden'));
        return Promise.reject(error);
      }
      if (error.response?.status !== 401 || originalRequest?._retry) return Promise.reject(error);

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const user = getCurrentUser();
        if (!user?.refreshToken) throw new Error('No refresh token');
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
        window.dispatchEvent(new Event('tutora:auth-changed'));
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
  return axiosInstance;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
setupAuthInterceptor(apiClient);
