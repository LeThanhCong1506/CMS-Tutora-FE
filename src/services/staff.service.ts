import axios from 'axios';
import { getCurrentUser } from './auth.service';
import { setupAuthInterceptor } from './apiClient';
import type { CreateStaffRequest, StaffListItem } from '../types/staff.types';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

// Instance riêng cho staff — cùng pattern với admin.service.ts (tự gắn Bearer
// token + silent refresh khi 401).
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
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

setupAuthInterceptor(api);

/**
 * Tạo tài khoản nhân viên mới.
 * Backend: POST /api/users (Authorize = Admin) với RoleName = "Staff".
 * Trả về `UserResponse` của nhân viên vừa tạo.
 *
 * Ném lỗi axios nguyên bản để caller (modal) tự map sang thông báo tiếng Việt
 * qua {@link getCreateStaffErrorMessage}.
 */
export const createStaff = async (request: CreateStaffRequest): Promise<StaffListItem> => {
  const body = { ...request, roleName: 'Staff' };
  const { data } = await api.post('/users', body);
  return data.content as StaffListItem;
};

/**
 * Lấy danh sách nhân viên (role Staff).
 * Backend: GET /api/users/staffs (Authorize = Admin).
 *
 * BE trả `APIResponse<PagedList<UserResponse>>`; `PagedList` kế thừa `List<T>`
 * nên serialize thành mảng phẳng — metadata phân trang không có trong body và
 * endpoint không set header X-Pagination. Vì số nhân viên nhỏ (BE cap PageSize
 * = 50), ta suy ra `total` từ độ dài slice trả về; nếu slice đầy bằng pageSize
 * thì còn trang sau (`hasMore`).
 */
export const getStaffs = async (
  pageNumber: number = 1,
  pageSize: number = 20,
): Promise<{ content: StaffListItem[]; hasMore: boolean }> => {
  const params: Record<string, string | number> = {
    PageNumber: pageNumber,
    PageSize: pageSize,
  };
  const { data } = await api.get('/users/staffs', { params });
  const content: StaffListItem[] = data.content ?? [];
  return { content, hasMore: content.length >= pageSize };
};

// Map thông điệp lỗi (tiếng Anh) từ BE sang tiếng Việt cho các trường hợp trùng
// dữ liệu phổ biến. Dùng keyword vì BE không trả mã lỗi có cấu trúc.
const DUPLICATE_MESSAGE_MAP: Array<{ match: RegExp; vi: string }> = [
  { match: /email/i, vi: 'Email này đã được sử dụng.' },
  { match: /username/i, vi: 'Tên đăng nhập này đã tồn tại.' },
  { match: /identity/i, vi: 'Số CCCD này đã được đăng ký.' },
  { match: /phone/i, vi: 'Số điện thoại này đã được sử dụng.' },
];

/**
 * Chuẩn hoá lỗi khi tạo nhân viên thành một câu tiếng Việt hiển thị cho admin.
 *
 * Ưu tiên:
 *  1. Lỗi validation từng trường (BE `InvalidModelStateResponseFactory` →
 *     `error` là object { field: [messages] }).
 *  2. `message` phẳng của BE (sau khi middleware map BadRequestException → 400,
 *     ví dụ trùng email) — dịch qua bảng keyword nếu khớp.
 *  3. Fallback chung.
 */
export const getCreateStaffErrorMessage = (err: unknown): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  const resData = anyErr?.response?.data;

  // (1) Validation lỗi theo trường
  const fieldErrors = resData?.error ?? resData?.Error;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const firstList = Object.values(fieldErrors).find(
      (v) => Array.isArray(v) && v.length > 0,
    ) as string[] | undefined;
    if (firstList?.[0]) return firstList[0];
  }

  // (2) message phẳng (body camelCase hoặc middleware PascalCase)
  const rawMessage: string | undefined = resData?.message ?? resData?.Message;
  if (rawMessage) {
    const mapped = DUPLICATE_MESSAGE_MAP.find((m) => m.match.test(rawMessage));
    if (mapped) return mapped.vi;
    // Bỏ tiền tố "[DEBUG] ..." nếu vẫn còn (lỗi 500 chưa map).
    if (!/^\[DEBUG\]/.test(rawMessage)) return rawMessage;
  }

  return 'Không thể tạo tài khoản nhân viên. Vui lòng thử lại.';
};
