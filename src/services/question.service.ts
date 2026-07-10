/**
 * Question Bank service — wraps BE:
 *   GET/POST/PUT/DELETE /api/admin/questions
 *   POST /api/admin/question-documents/upload  (upload PDF -> AI tách câu)
 */
import { getAuthHeaders, type ApiResponse } from './apiHelpers';
import { apiClient as api } from './apiClient';
import type {
  Question,
  QuestionListParams,
  QuestionListResponse,
  CreateQuestionPayload,
  UpdateQuestionPayload,
  UploadPdfResponse,
  QuestionDocumentListResponse,
  QuestionDocumentDetail,
} from '../types/question.types';

export const getQuestions = async (
  params: QuestionListParams = {},
  signal?: AbortSignal,
): Promise<ApiResponse<QuestionListResponse>> => {
  const response = await api.get<ApiResponse<QuestionListResponse>>('/admin/questions', {
    headers: getAuthHeaders(),
    params,
    signal,
  });
  return response.data;
};

export const getQuestionById = async (id: string): Promise<ApiResponse<Question>> => {
  const response = await api.get<ApiResponse<Question>>(`/admin/questions/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const createQuestion = async (
  payload: CreateQuestionPayload,
): Promise<ApiResponse<Question>> => {
  const response = await api.post<ApiResponse<Question>>('/admin/questions', payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateQuestion = async (
  id: string,
  payload: UpdateQuestionPayload,
): Promise<ApiResponse<Question>> => {
  const response = await api.put<ApiResponse<Question>>(`/admin/questions/${id}`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const deleteQuestion = async (id: string): Promise<ApiResponse<object>> => {
  const response = await api.delete<ApiResponse<object>>(`/admin/questions/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/** Upload 1 PDF (≤20 trang) */
export const uploadQuestionPdf = async (
  file: File,
  subjectId?: number,
  gradeLevelId?: number,
): Promise<ApiResponse<UploadPdfResponse>> => {
  const form = new FormData();
  form.append('file', file);
  const response = await api.post<ApiResponse<UploadPdfResponse>>(
    '/admin/question-documents/upload',
    form,
    {
      headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      params: { subjectId, gradeLevelId },
      timeout: 180000, // 3 phút
    },
  );
  return response.data;
};

/** Lịch sử truy xuất câu hỏi từ PDF. */
export const getDocumentHistory = async (
  params: { pageNumber?: number; pageSize?: number } = {},
): Promise<ApiResponse<QuestionDocumentListResponse>> => {
  const response = await api.get<ApiResponse<QuestionDocumentListResponse>>(
    '/admin/question-documents/history',
    { headers: getAuthHeaders(), params },
  );
  return response.data;
};

/** Chi tiết 1 document */
export const getDocumentById = async (id: string): Promise<ApiResponse<QuestionDocumentDetail>> => {
  const response = await api.get<ApiResponse<QuestionDocumentDetail>>(
    `/admin/question-documents/${id}`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};
