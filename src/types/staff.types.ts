/**
 * Staff management types.
 *
 * Admin tạo & quản lý tài khoản nhân viên (role "Staff") qua StaffController:
 *   - POST /api/staffs     → tạo tài khoản (BE tự gắn role Staff)
 *   - GET  /api/staffs     → danh sách nhân viên
 *
 * BE `CreateStaffRequest` chỉ nhận trường tối thiểu; bắt buộc duy nhất
 * password/email/fullname — nhân viên đăng nhập bằng email, username chỉ là
 * handle phụ (tùy chọn). Hồ sơ cá nhân (ngày sinh, giới tính, địa chỉ, avatar)
 * nhân viên tự cập nhật sau qua PUT /api/users/{id}. Ràng buộc validation được
 * phản chiếu ở FE (CreateStaffModal) để bắt lỗi trước khi gọi API.
 */

/** Khớp với enum `Gender` của BE (short): Other = 0, Male = 1, Female = 2. */
export type StaffGender = 0 | 1 | 2;

/** Payload gửi lên `POST /api/staffs`. */
export interface CreateStaffRequest {
  /** Tùy chọn — nhân viên đăng nhập bằng email nếu không có username. */
  username?: string;
  password: string;
  email: string;
  fullname: string;
  /** Tùy chọn — giữ ở bước tạo vì PUT /api/users/{id} không đổi được phone. */
  phone?: string;
}

/** Một dòng trong danh sách nhân viên — map từ `UserResponse` của BE. */
export interface StaffListItem {
  userid: string;
  /** Có thể null — username là trường tùy chọn khi tạo tài khoản. */
  username: string | null;
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
