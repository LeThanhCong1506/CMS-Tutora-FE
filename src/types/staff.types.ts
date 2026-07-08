/**
 * Staff management types.
 *
 * Admin tạo & quản lý tài khoản nhân viên (role "Staff") thông qua các endpoint
 * user chung của backend:
 *   - POST /api/users            → tạo tài khoản (RoleName = "Staff")
 *   - GET  /api/users/staffs     → danh sách nhân viên
 *
 * BE `CreateUserRequest` yêu cầu đầy đủ các trường bên dưới; ràng buộc validation
 * được phản chiếu ở FE (CreateStaffModal) để bắt lỗi trước khi gọi API.
 */

/** Khớp với enum `Gender` của BE (short): Other = 0, Male = 1, Female = 2. */
export type StaffGender = 0 | 1 | 2;

/**
 * Payload gửi lên `POST /api/users`. `roleName` luôn là "Staff" và được service
 * tự gắn, nên form không cần khai báo trường này.
 */
export interface CreateStaffRequest {
  username: string;
  password: string;
  email: string;
  fullname: string;
  /** CCCD — đúng 12 chữ số. */
  identityNumber: string;
  phone: string;
  /** yyyy-MM-dd (BE nhận DateOnly). */
  birthdate: string;
  address: string;
  gender: StaffGender;
}

/** Một dòng trong danh sách nhân viên — map từ `UserResponse` của BE. */
export interface StaffListItem {
  userid: string;
  username: string;
  fullname: string;
  email: string;
  phone: string;
  gender: StaffGender | null;
  birthdate: string | null;
  address: string | null;
  avatarurl: string | null;
  /** BE: 1 = hoạt động, 0 = vô hiệu hoá. */
  status: number | null;
  createdat: string | null;
  lastLoginAt: string | null;
  role: string | null;
}
