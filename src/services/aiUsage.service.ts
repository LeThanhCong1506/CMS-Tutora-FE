import type { AiUsageResponse, AiUsageRate } from '../types/aiUsage.types';
import { apiClient as api } from './apiClient';

/**
 * Thống kê chi phí gọi Gemini trong khoảng thời gian.
 */
export const getAiUsage = async (from?: string, to?: string): Promise<AiUsageResponse> => {
  const { data } = await api.get('/admin/ai-usage', { params: { from, to } });
  return (data as { content?: AiUsageResponse }).content ?? (data as AiUsageResponse);
};

/** Tỉ giá USD→VND đang dùng (admin nhập tay, hoặc lấy từ API tỉ giá thị trường). */
export const getAiUsageRate = async (): Promise<AiUsageRate> => {
  const { data } = await api.get('/admin/ai-usage/rate');
  return (data as { content?: AiUsageRate }).content ?? (data as AiUsageRate);
};

/** Đặt tỉ giá thủ công. rate = null -> xoá, quay lại lấy tự động. */
export const setAiUsageRate = async (rate: number | null): Promise<AiUsageRate> => {
  const { data } = await api.put('/admin/ai-usage/rate', { rate });
  return (data as { content?: AiUsageRate }).content ?? (data as AiUsageRate);
};
