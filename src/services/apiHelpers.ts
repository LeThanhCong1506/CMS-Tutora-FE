/**
 * Shared API helper utilities — extracted to avoid forcing every service to
 * import from `tutorProfile.service` (which doesn't exist in admin repo).
 *
 * Repo gốc (Agora-Frontend) defines these inside `tutorProfile.service.ts`;
 * admin repo puts them here so services can stay decoupled.
 */
import { getCurrentUser } from './auth.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  content: T;
  statusCode: number;
  message: string;
  error: string | null;
}

export const getAuthHeaders = () => {
  const user = getCurrentUser();
  const token = user?.accessToken || import.meta.env.VITE_TOKEN;
  return {
    Authorization: `Bearer ${token}`,
  };
};
