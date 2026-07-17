/** Staff management contracts for Admin-only account provisioning. */
export type StaffGender = 0 | 1 | 2;

export interface CreateStaffRequest {
  username?: string;
  password: string;
  email: string;
  fullname: string;
  phone?: string;
  permissionGroupId?: string | null;
}

export interface StaffListItem {
  userid: string;
  username: string | null;
  fullname: string;
  email: string;
  phone: string;
  gender: StaffGender | null;
  birthdate: string | null;
  address: string | null;
  avatarurl: string | null;
  status: number | null;
  createdat: string | null;
  lastLoginAt: string | null;
  role: string | null;
  permissionGroup: { id: string; name: string } | null;
  assignmentVersion: number;
}
