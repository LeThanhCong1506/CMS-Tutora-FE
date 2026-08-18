/**
 * Bộ đề đánh giá — wraps BE:
 *   GET/POST/PUT/DELETE  /api/admin/assessments
 *   PATCH                /api/admin/assessments/{id}/status
 *   POST/PUT/DELETE      /api/admin/assessments/{id}/questions[/{questionId}]
 *   PUT                  /api/admin/assessments/{id}/questions/reorder
 */
import { getAuthHeaders, type ApiResponse } from './apiHelpers';
import { apiClient as api } from './apiClient';
import type {
  Assessment,
  AssessmentDetail,
  AssessmentListParams,
  AssessmentListResponse,
  AssessmentPayload,
  AssessmentQuestion,
  AssessmentQuestionPayload,
  AssessmentStatus,
} from '../types/assessment.types';

export const getAssessments = async (
  params: AssessmentListParams = {},
  signal?: AbortSignal,
): Promise<ApiResponse<AssessmentListResponse>> => {
  const response = await api.get<ApiResponse<AssessmentListResponse>>('/admin/assessments', {
    headers: getAuthHeaders(),
    params,
    signal,
  });
  return response.data;
};

export const getAssessmentById = async (
  id: string,
  signal?: AbortSignal,
): Promise<ApiResponse<AssessmentDetail>> => {
  const response = await api.get<ApiResponse<AssessmentDetail>>(`/admin/assessments/${id}`, {
    headers: getAuthHeaders(),
    signal,
  });
  return response.data;
};

export const createAssessment = async (payload: AssessmentPayload): Promise<ApiResponse<Assessment>> => {
  const response = await api.post<ApiResponse<Assessment>>('/admin/assessments', payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateAssessment = async (
  id: string,
  payload: AssessmentPayload,
): Promise<ApiResponse<Assessment>> => {
  const response = await api.put<ApiResponse<Assessment>>(`/admin/assessments/${id}`, payload, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/** BE chặn phát hành đề chưa đủ câu. */
export const updateAssessmentStatus = async (
  id: string,
  status: AssessmentStatus,
): Promise<ApiResponse<Assessment>> => {
  const response = await api.patch<ApiResponse<Assessment>>(
    `/admin/assessments/${id}/status`,
    { status },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const deleteAssessment = async (id: string): Promise<ApiResponse<object>> => {
  const response = await api.delete<ApiResponse<object>>(`/admin/assessments/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

// ── Câu hỏi trong đề ─────────────────────────────────────────────────────────

export const addAssessmentQuestion = async (
  assessmentId: string,
  payload: AssessmentQuestionPayload,
): Promise<ApiResponse<AssessmentQuestion>> => {
  const response = await api.post<ApiResponse<AssessmentQuestion>>(
    `/admin/assessments/${assessmentId}/questions`,
    payload,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const updateAssessmentQuestion = async (
  assessmentId: string,
  questionId: string,
  payload: AssessmentQuestionPayload,
): Promise<ApiResponse<AssessmentQuestion>> => {
  const response = await api.put<ApiResponse<AssessmentQuestion>>(
    `/admin/assessments/${assessmentId}/questions/${questionId}`,
    payload,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const deleteAssessmentQuestion = async (
  assessmentId: string,
  questionId: string,
): Promise<ApiResponse<object>> => {
  const response = await api.delete<ApiResponse<object>>(
    `/admin/assessments/${assessmentId}/questions/${questionId}`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

/** Phải truyền đủ id mọi câu của đề. */
export const reorderAssessmentQuestions = async (
  assessmentId: string,
  questionIds: string[],
): Promise<ApiResponse<object>> => {
  const response = await api.put<ApiResponse<object>>(
    `/admin/assessments/${assessmentId}/questions/reorder`,
    { questionIds },
    { headers: getAuthHeaders() },
  );
  return response.data;
};
