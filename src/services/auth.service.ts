/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-useless-catch */
import axios from "axios";
import { storageAdapter } from "./storage.adapter";

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';
const USER_LOCAL_STORAGE_KEY = "TUTORA_user_data";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- CÁC HÀM TIỆN ÍCH LOCAL STORAGE ---

/**
 * Lưu thông tin user vào LocalStorage
 */
export const saveUserToStorage = async (userData: any) => {
  if (userData) {
    await storageAdapter.set(USER_LOCAL_STORAGE_KEY, JSON.stringify(userData));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('tutora:auth-changed'));
  }
};

/**
 * Lấy thông tin user hiện tại từ LocalStorage
 */
export const getCurrentUser = () => {
  return storageAdapter.getCachedUser();
};

/**
 * Lấy thông tin user từ JWT token
 */
export const getUserInfoFromToken = () => {
  const user = getCurrentUser();
  if (!user || !user.accessToken) return null;

  const payload = decodeJWT(user.accessToken);
  if (!payload) return null;

  // Extract user info from JWT claims
  const emailClaim = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
  const nameClaim = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";
  const givenNameClaim = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname";
  const surnameClaim = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname";

  return {
    email: payload[emailClaim] || payload.email,
    fullname: payload[nameClaim] || payload.name,
    firstName: payload[givenNameClaim] || payload.given_name,
    lastName: payload[surnameClaim] || payload.family_name,
    userId: getUserIdFromToken(),
    role: getCurrentUserRole(),
    ...user // Include original user data (accessToken, etc.)
  };
};

/**
 * Xóa thông tin user (Dùng khi Logout)
 *
 * Ngoài việc xoá user data, còn dọn sạch các form draft đang lưu trong
 * sessionStorage (key prefix `draft_`) — nếu không, draft của user vừa
 * logout sẽ rò rỉ sang user kế tiếp đăng nhập trên cùng tab (xem
 * `useFormDraft` hook + các modal: booking, about-me, credential, ...).
 */
export const clearUserFromStorage = async () => {
  await storageAdapter.remove(USER_LOCAL_STORAGE_KEY);
  if (typeof window !== 'undefined') {
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith('draft_'))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* sessionStorage có thể không khả dụng (ví dụ Zalo Mini App) — bỏ qua */
    }
  }
};

/**
 * Lấy refresh token từ localStorage
 */
export const getRefreshToken = (): string | null => {
  return getCurrentUser()?.refreshToken || null;
};

/**
 * Cập nhật access token và refresh token mới sau khi silent refresh
 */
export const updateTokens = async (accessToken: string, refreshToken: string) => {
  const user = getCurrentUser() || {};
  storageAdapter.updateCachedTokens(accessToken, refreshToken);
  await storageAdapter.set(USER_LOCAL_STORAGE_KEY, JSON.stringify({ ...user, accessToken, refreshToken }));
};

/**
 * Logout: revoke refresh token trên server rồi xóa localStorage
 */
export const logout = async () => {
  const user = getCurrentUser();
  const refreshToken = user?.refreshToken;
  if (refreshToken) {
    try {
      const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';
      await api.post(`${API_BASE_URL}/token/revoke`, { refreshToken }, {
        headers: { Authorization: `Bearer ${user?.accessToken}` }
      });
    } catch { /* best effort - vẫn logout dù server lỗi */ }
  }
  await clearUserFromStorage();
};

// --- ROLE MANAGEMENT FUNCTIONS ---

/**
 * Decode JWT token để lấy payload
 */
const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Lấy role từ Backend JWT token
 */
export const getRoleFromToken = (token: string): string | null => {
  const payload = decodeJWT(token);
  if (!payload) return null;

  // Backend sử dụng Microsoft claim format
  const roleClaimKey = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
  return payload[roleClaimKey] || null;
};

/**
 * Lấy role của user hiện tại từ JWT accessToken
 */
export const getCurrentUserRole = (): string | null => {
  const user = getCurrentUser();
  if (!user) return null;

  // Decode từ Backend JWT token
  if (user.accessToken) {
    return getRoleFromToken(user.accessToken);
  }

  return null;
};

/**
 * Lấy userId từ JWT token
 */
export const getUserIdFromToken = (): string | null => {
  const user = getCurrentUser();
  if (!user || !user.accessToken) return null;

  const payload = decodeJWT(user.accessToken);
  if (!payload) return null;

  // Backend sử dụng Microsoft claim format cho NameIdentifier (userId)
  const userIdClaimKey = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
  return payload[userIdClaimKey] || payload.sub || payload.userId || null;
};

/**
 * Kiểm tra user có role cụ thể không
 */
export const hasRole = (requiredRole: string): boolean => {
  const userRole = getCurrentUserRole();
  return userRole === requiredRole;
};

/**
 * Kiểm tra user có một trong các role được phép không
 */
export const hasAnyRole = (allowedRoles: string[]): boolean => {
  const userRole = getCurrentUserRole();
  return userRole ? allowedRoles.includes(userRole) : false;
};

/**
 * Kiểm tra token đã hết hạn chưa
 */
export const isTokenExpired = (): boolean => {
  const user = getCurrentUser();
  if (!user?.accessToken) return true;

  try {
    const payload = decodeJWT(user.accessToken);
    if (!payload || !payload.exp) return true;

    // exp là Unix timestamp (giây), Date.now() trả về millisecond
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

/**
 * Kiểm tra user đã đăng nhập chưa (bao gồm kiểm tra token hết hạn)
 */
export const isAuthenticated = (): boolean => {
  const user = getCurrentUser();
  if (!user) return false;

  // Kiểm tra token có hết hạn không
  if (isTokenExpired()) {
    return false;
  }

  return true;
};

// --- CÁC HÀM API ---

export const checkEmailExists = async (email: string) => {
  try {
    const response = await api.get(`/users/by-email/${email}`);
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
};

export const loginToBackend = async (accessToken: string, password: string) => {
  try {
    console.log("Gửi yêu cầu đăng nhập thủ công Backend...");

    const response = await api.post("/auth/supabase/login", {
      accessToken: accessToken,
      password: password,
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const loginWithOAuth = async (accessToken: string, email: string) => {
  try {
    console.log("Gửi yêu cầu đăng nhập OAuth Backend...");

    const response = await api.post("/auth/supabase/login", {
      accessToken: accessToken,
      email: email,
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

export const loginManual = async (accessToken: string, password: string) => {
  try {
    console.log("Gửi yêu cầu đăng nhập thủ công tới Backend...");

    const payload = {
      accessToken: accessToken,
      password: password
    };

    const response = await api.post("/auth/supabase/login", payload);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const registerUserToBackend = async (supabaseToken: string, password: string, role: string) => {
  try {
    console.log("🔐 Gửi yêu cầu đăng ký tới Backend...");
    console.log("📋 Token length:", supabaseToken?.length);
    console.log("📋 Token preview:", supabaseToken?.substring(0, 50) + "...");
    console.log("👤 Role:", role);

    const payload = {
      supabaseToken: supabaseToken,
      password: password,
      role: role
    };

    // Endpoint: /api/auth/supabase/register
    const response = await api.post("/auth/supabase/register", payload);
    console.log("✅ Backend registration successful:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ Backend registration error:");
    console.error("Status:", error.response?.status);
    console.error("Data:", error.response?.data);
    console.error("Full error:", error);
    throw error;
  }
};

// --- USER PROFILE WITH EKYC ---

// BE resolves the current user from the bearer token, so no id is passed.
// Endpoint: GET /api/users/profile → APIResponse<UserResponse> (data.content).
export const getUserProfile = async () => {
  const user = getCurrentUser();
  const response = await api.get(`/users/profile`, {
    headers: { Authorization: `Bearer ${user?.accessToken}` }
  });
  return response.data;
};

export const parseEKYCData = (ekycRawData: string | null) => {
  if (!ekycRawData) return null;
  try {
    return JSON.parse(ekycRawData);
  } catch (error) {
    return null;
  }
};

// --- PASSWORD MANAGEMENT ---

/**
 * Sync password with backend after Supabase password reset
 */
export const syncPassword = async (supabaseToken: string, newPassword: string) => {
  try {
    console.log("🔄 Syncing password with backend...");
    const response = await api.put("/passwords/sync", {
      supabaseToken,
      newPassword
    });
    console.log("✅ Password synced successfully");
    return response.data;
  } catch (error) {
    console.error("❌ Password sync error:", error);
    throw error;
  }
};

/**
 * Change password (requires old password)
 */
export const changePassword = async (oldPassword: string, newPassword: string) => {
  try {
    console.log("🔄 Changing password...");
    const user = getCurrentUser();
    const response = await api.put("/passwords/change", {
      oldPassword,
      newPassword
    }, {
      headers: { Authorization: `Bearer ${user?.accessToken}` }
    });
    console.log("✅ Password changed successfully");
    return response.data;
  } catch (error) {
    console.error("❌ Password change error:", error);
    throw error;
  }
};

// --- SIMPLE AUTH (Không qua Supabase) ---

export const simpleRegister = async (data: {
  email: string;
  phone: string;
  password: string;
  fullName: string;
  role: string;
}) => {
  try {
    console.log("🔐 Simple Register...");
    const response = await api.post("/auth/register", data);
    console.log("✅ Register successful:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ Register error:", error.response?.data);
    throw error;
  }
};

export const simpleLogin = async (emailOrPhone: string, password: string) => {
  try {
    console.log("🔐 Simple Login...");
    const response = await api.post("/auth/login", {
      emailOrPhone,
      password,
    });
    console.log("✅ Login successful:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("❌ Login error:", error.response?.data);
    throw error;
  }
};

// --- ONBOARDING TOUR ---

export const getTourStatus = async (): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    const response = await api.get("/users/tour-status", {
      headers: { Authorization: `Bearer ${user?.accessToken}` }
    });
    return response.data?.content?.hasCompletedTour ?? false;
  } catch {
    return false;
  }
};

export const completeTour = async (): Promise<void> => {
  try {
    const user = getCurrentUser();
    await api.put("/users/complete-tour", {}, {
      headers: { Authorization: `Bearer ${user?.accessToken}` }
    });
  } catch (error) {
    console.error("Failed to save tour completion:", error);
  }
};
