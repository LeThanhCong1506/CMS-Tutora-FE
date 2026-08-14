import { getAuthHeaders, type ApiResponse } from './apiHelpers';
import { apiClient as api } from './apiClient';

const BASE = '/admin/support';

const auth = () => ({ headers: getAuthHeaders() });

export type SupportSenderSide = 'admin' | 'user';

export type SupportMessageType = 'text' | 'image';

export interface SupportMessage {
  supportMessageId: number;
  senderId: string | null;
  senderSide: SupportSenderSide;
  senderName: string | null;
  /** "text" or "image" — when "image", `message` holds the image URL. */
  messageType: SupportMessageType;
  message: string;
  createdAt: string;
}

export interface SupportThreadSummary {
  supportThreadId: number;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  /** Tutor | Parent | Student — see backend MV.DomainLayer.Constants.UserRole. */
  userRole: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageFromAdmin: boolean;
  unreadCount: number;
}

export interface SupportThreadDetail {
  supportThreadId: number;
  userId: string;
  userName: string | null;
  userAvatarUrl: string | null;
  userRole: string | null;
  userPhone: string | null;
  userEmail: string | null;
  messages: SupportMessage[];
}

/** GET /api/admin/support/threads — conversation list, newest activity first. */
export const getSupportThreads = async (): Promise<SupportThreadSummary[]> => {
  const res = await api.get<ApiResponse<SupportThreadSummary[]>>(`${BASE}/threads`, auth());
  return res.data.content ?? [];
};

/** GET /api/admin/support/threads/{userId} — full history, marks it read for admin. */
export const getSupportThread = async (userId: string): Promise<SupportThreadDetail> => {
  const res = await api.get<ApiResponse<SupportThreadDetail>>(`${BASE}/threads/${userId}`, auth());
  return res.data.content;
};

/** POST /api/admin/support/threads/{userId}/messages — creates the thread on first contact. */
export const sendSupportMessage = async (userId: string, message: string): Promise<SupportMessage> => {
  const res = await api.post<ApiResponse<SupportMessage>>(`${BASE}/threads/${userId}/messages`, { message }, auth());
  return res.data.content;
};

/** POST /api/admin/support/threads/{userId}/images — uploads and sends an image (max 5MB). */
export const sendSupportImage = async (userId: string, file: File): Promise<SupportMessage> => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ApiResponse<SupportMessage>>(`${BASE}/threads/${userId}/images`, form, {
    headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
  });
  return res.data.content;
};
