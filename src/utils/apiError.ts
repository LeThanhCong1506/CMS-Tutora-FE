import axios from 'axios';

/**
 * Lấy message lỗi từ APIResponse của BE để hiện toast.
 * Quan trọng với các lỗi 409 (đang được tham chiếu) vì BE trả lý do cụ thể,
 * hữu ích hơn hẳn câu báo lỗi chung chung.
 */
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || fallback;
  }
  return fallback;
};
