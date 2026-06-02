/* eslint-disable no-useless-catch */
import axios from 'axios';
import { setupAuthInterceptor } from './apiClient';
import type {
  AdminDashboardStats,
  AdminUserStats,
  AdminTutorPerformance,
  AdminDisputeStats,
} from '../types/admin.types';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

setupAuthInterceptor(api);

const toQueryParams = (from?: Date | null, to?: Date | null, extra?: Record<string, unknown>) => {
  const params: Record<string, unknown> = { ...(extra || {}) };
  if (from) params.from = from.toISOString();
  if (to) params.to = to.toISOString();
  return params;
};

/**
 * GET /api/admin/dashboard/stats
 * Snapshot tổng quan nền tảng — không nhận tham số filter.
 */
export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  try {
    const { data } = await api.get('/admin/dashboard/stats');
    return data.content;
  } catch (error) {
    throw error;
  }
};

/**
 * GET /api/admin/dashboard/users?from&to
 * Thống kê tăng trưởng & phân bổ người dùng (mặc định BE: 30 ngày gần nhất).
 */
export const getAdminUserStats = async (
  from?: Date | null,
  to?: Date | null
): Promise<AdminUserStats> => {
  try {
    const { data } = await api.get('/admin/dashboard/users', {
      params: toQueryParams(from, to),
    });
    return data.content;
  } catch (error) {
    throw error;
  }
};

/**
 * GET /api/admin/dashboard/tutor-performance?top&from&to
 * Báo cáo hiệu suất gia sư (top 1..50).
 */
export const getAdminTutorPerformance = async (
  top: number = 10,
  from?: Date | null,
  to?: Date | null
): Promise<AdminTutorPerformance> => {
  try {
    const { data } = await api.get('/admin/dashboard/tutor-performance', {
      params: toQueryParams(from, to, { top }),
    });
    return data.content;
  } catch (error) {
    throw error;
  }
};

/**
 * GET /api/admin/dashboard/disputes?from&to
 * Thống kê tranh chấp + xu hướng theo tháng.
 */
export const getAdminDisputeStats = async (
  from?: Date | null,
  to?: Date | null
): Promise<AdminDisputeStats> => {
  try {
    const { data } = await api.get('/admin/dashboard/disputes', {
      params: toQueryParams(from, to),
    });
    return data.content;
  } catch (error) {
    throw error;
  }
};
