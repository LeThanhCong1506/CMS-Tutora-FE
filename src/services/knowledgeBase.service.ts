import { getAuthHeaders, type ApiResponse } from './apiHelpers';
import { apiClient as api } from './apiClient';
import type { KbDocument, KbDocumentDetail, KbUploadResult } from '../types/knowledgeBase.types';

/** Upload 1 tài liệu (pdf/docx/xlsx, ≤20MB) vào Knowledge Base. */
export const uploadKbDocument = async (file: File): Promise<ApiResponse<KbUploadResult>> => {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<ApiResponse<KbUploadResult>>(
    '/admin/knowledge-base/upload',
    form,
    {
      headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      timeout: 180000, // 3 phút — extract + chunk + embed
    },
  );
  return response.data;
};

/** Danh sách tài liệu KB đã nạp (mới nhất trước). */
export const getKbDocuments = async (signal?: AbortSignal): Promise<KbDocument[]> => {
  const response = await api.get<ApiResponse<KbDocument[]>>('/admin/knowledge-base/documents', {
    headers: getAuthHeaders(),
    signal,
  });
  return response.data.content ?? [];
};

/** Chi tiết 1 tài liệu + nội dung text (ghép chunk) để xem trong modal. */
export const getKbDocumentDetail = async (documentId: string): Promise<KbDocumentDetail> => {
  const response = await api.get<ApiResponse<KbDocumentDetail>>(
    `/admin/knowledge-base/documents/${documentId}`,
    { headers: getAuthHeaders() },
  );
  return response.data.content;
};

/** Sửa nội dung tài liệu → BE gọi tutora-ai chunk lại + re-embed. Trả chi tiết mới. */
export const updateKbDocumentContent = async (
  documentId: string,
  content: string,
): Promise<KbDocumentDetail> => {
  const response = await api.put<ApiResponse<KbDocumentDetail>>(
    `/admin/knowledge-base/documents/${documentId}/content`,
    { content },
    { headers: getAuthHeaders(), timeout: 180000 },
  );
  return response.data.content;
};

/** Xoá 1 tài liệu KB + toàn bộ chunk của nó. */
export const deleteKbDocument = async (documentId: string): Promise<ApiResponse<object>> => {
  const response = await api.delete<ApiResponse<object>>(
    `/admin/knowledge-base/documents/${documentId}`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};
