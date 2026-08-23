import axios from 'axios';

/**
 * Rút thông điệp lỗi CHÍNH XÁC nhất mà BE trả về.
 *
 * BE Tutora không trả lỗi theo một khuôn duy nhất, nên nếu FE chỉ đọc `data.message`
 * thì với 3/4 dạng dưới đây người dùng chỉ thấy câu bao ngoài chung chung:
 *
 * 1. `{ statusCode, message }`
 *    — ExceptionHandlingMiddleware và đa số controller. `message` đã chuẩn.
 * 2. `{ message: "Dữ liệu đầu vào không hợp lệ.", error: { field: ["..."] } }`
 *    — InvalidModelStateResponseFactory trong Program.cs. Chi tiết nằm ở `error`.
 * 3. `{ message: "Dữ liệu không hợp lệ.", errors: ["...", "..."] }`
 *    — validate thủ công, vd PUT /tutors/{id}/profile/basic-info. Chi tiết nằm ở `errors`.
 * 4. `{ message, error: <ModelState lồng nhau> }`
 *    — vài endpoint truyền thẳng ModelState, chi tiết nằm sâu trong `errors[].errorMessage`.
 */

/** Số dòng lỗi tối đa ghép vào một toast — nhiều hơn thì toast dài quá, đọc không nổi. */
const MAX_DETAILS = 3;

/** Độ sâu tối đa khi dò ModelState lồng nhau. */
const MAX_DEPTH = 4;

/** 500 trả về '[DEBUG] NullReferenceException: ...' — thông tin nội bộ, không đưa lên toast. */
const DEBUG_MESSAGE = /^\s*\[DEBUG\]/;

/** Các câu bao ngoài: có chúng thì phần chi tiết theo field mới là thứ đáng hiển thị. */
const WRAPPER_MESSAGE =
  /^(dữ liệu( đầu vào)? không hợp lệ|invalid request data|validation failed|one or more validation errors occurred)\.?$/i;

/** Khoá kỹ thuật của ModelState — giá trị của chúng không phải thông điệp cho người dùng. */
const SKIP_KEYS = new Set([
  'rawvalue',
  'attemptedvalue',
  'validationstate',
  'iscontainernode',
  'exception',
  'traceid',
  'type',
  'status',
  'statuscode',
  'success',
]);

const pushDetail = (out: string[], value: string) => {
  const text = value.trim();
  if (text && !out.includes(text) && out.length < MAX_DETAILS) out.push(text);
};

/** Gom các chuỗi lỗi ở mọi hình dạng: string, string[], { field: string[] }, ModelState lồng nhau. */
const collectDetails = (value: unknown, out: string[], depth = 0): void => {
  if (value == null || out.length >= MAX_DETAILS || depth > MAX_DEPTH) return;

  if (typeof value === 'string') {
    pushDetail(out, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectDetails(item, out, depth + 1));
    return;
  }
  if (typeof value !== 'object') return;

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SKIP_KEYS.has(key.toLowerCase())) continue;
    collectDetails(item, out, depth + 1);
  }
};

/** Danh sách lỗi chi tiết theo field (rỗng nếu BE chỉ trả message chung). */
export const apiErrorDetails = (err: unknown): string[] => {
  const data = axios.isAxiosError(err) ? err.response?.data : undefined;
  if (!data || typeof data !== 'object') return [];

  const out: string[] = [];
  const record = data as Record<string, unknown>;
  collectDetails(record.errors, out);
  collectDetails(record.error, out);
  return out;
};

/**
 * Thông điệp để đưa lên toast: ưu tiên lỗi cụ thể từ BE, chỉ dùng `fallback`
 * khi BE thật sự không nói gì có ích (lỗi mạng, lỗi 500 nội bộ, lỗi JS).
 */
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  if (!axios.isAxiosError(err)) return fallback;

  // Không có response: mất mạng, CORS, server chưa chạy — BE chưa kịp nói gì.
  if (!err.response) return 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';

  const data = err.response.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (!data || typeof data !== 'object') return fallback;

  // Vài endpoint (nhất là phía admin) đặt câu thông báo ở `content`, và có endpoint
  // serialize ngoài MVC nên trả PascalCase — tra khoá không phân biệt hoa/thường.
  const record = data as Record<string, unknown>;
  const byKey = new Map(
    Object.entries(record).map(([key, value]) => [key.toLowerCase(), value] as const),
  );
  const message = ['message', 'detail', 'title', 'content']
    .map((key) => byKey.get(key))
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0)
    ?.trim();

  if (message && DEBUG_MESSAGE.test(message)) return fallback;

  const details = apiErrorDetails(err);
  if (details.length > 0) {
    if (!message || WRAPPER_MESSAGE.test(message)) return details.join(' ');
    return `${message} ${details.join(' ')}`;
  }

  return message || fallback;
};

/** Bí danh: Tutora-FE dùng tên getApiErrorMessage cho cùng hàm này. */
export const getApiErrorMessage = apiErrorMessage;
