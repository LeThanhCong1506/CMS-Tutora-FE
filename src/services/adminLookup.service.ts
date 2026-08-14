import { getAuthHeaders, type ApiResponse } from './apiHelpers';
import { apiClient as api } from './apiClient';
import type {
  AdminSubject,
  AdminGradeLevel,
  AdminChapter,
  AdminQuestionType,
  SubjectPayload,
  GradeLevelPayload,
  ChapterPayload,
  QuestionTypePayload,
} from '../types/lookup.type';

const BASE = '/admin/lookup';

const auth = () => ({ headers: getAuthHeaders() });

export interface ReorderItem {
  id: number;
  displayOrder: number;
}

/**
 * Gửi thứ tự mới cho cả danh sách
 */
const reorder = async (resource: string, items: ReorderItem[]): Promise<void> => {
  await api.put<ApiResponse<object>>(`${BASE}/${resource}/reorder`, { items }, auth());
};

export const reorderSubjects = (items: ReorderItem[]) => reorder('subjects', items);
export const reorderGradeLevels = (items: ReorderItem[]) => reorder('grade-levels', items);
export const reorderChapters = (items: ReorderItem[]) => reorder('chapters', items);
export const reorderQuestionTypes = (items: ReorderItem[]) => reorder('question-types', items);

/* Subjects */
export const getAdminSubjects = async (): Promise<AdminSubject[]> => {
  const res = await api.get<ApiResponse<AdminSubject[]>>(`${BASE}/subjects`, auth());
  return res.data.content ?? [];
};

export const createSubject = async (payload: SubjectPayload): Promise<AdminSubject> => {
  const res = await api.post<ApiResponse<AdminSubject>>(`${BASE}/subjects`, payload, auth());
  return res.data.content;
};

export const updateSubject = async (id: number, payload: SubjectPayload): Promise<AdminSubject> => {
  const res = await api.put<ApiResponse<AdminSubject>>(`${BASE}/subjects/${id}`, payload, auth());
  return res.data.content;
};

/** Upload icon môn học -> trả public URL để gán vào SubjectPayload.iconUrl. */
export const uploadSubjectIcon = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ApiResponse<{ iconUrl: string }>>(
    `${BASE}/subjects/icon`,
    form,
    { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.content.iconUrl;
};

/** Soft-delete. Trả message của BE (có thể kèm cảnh báo số gói giá tutor bị ảnh hưởng). */
export const deleteSubject = async (id: number): Promise<string> => {
  const res = await api.delete<ApiResponse<object>>(`${BASE}/subjects/${id}`, auth());
  return res.data.message;
};

/**
 * Xóa vĩnh viễn. BE chặn 409 nếu môn học đang bật (chưa ngừng hoạt động) hoặc đang được
 * chương/câu hỏi/bảng giá gia sư/hồ sơ học sinh tham chiếu.
 */
export const hardDeleteSubject = async (id: number): Promise<string> => {
  const res = await api.delete<ApiResponse<object>>(`${BASE}/subjects/${id}/permanent`, auth());
  return res.data.message;
};

/* Grade levels */
export const getAdminGradeLevels = async (): Promise<AdminGradeLevel[]> => {
  const res = await api.get<ApiResponse<AdminGradeLevel[]>>(`${BASE}/grade-levels`, auth());
  return res.data.content ?? [];
};

export const createGradeLevel = async (payload: GradeLevelPayload): Promise<AdminGradeLevel> => {
  const res = await api.post<ApiResponse<AdminGradeLevel>>(`${BASE}/grade-levels`, payload, auth());
  return res.data.content;
};

export const updateGradeLevel = async (
  id: number,
  payload: GradeLevelPayload,
): Promise<AdminGradeLevel> => {
  const res = await api.put<ApiResponse<AdminGradeLevel>>(
    `${BASE}/grade-levels/${id}`,
    payload,
    auth(),
  );
  return res.data.content;
};

/** Soft-delete. Trả message của BE. */
export const deleteGradeLevel = async (id: number): Promise<string> => {
  const res = await api.delete<ApiResponse<object>>(`${BASE}/grade-levels/${id}`, auth());
  return res.data.message;
};

/* Chapters */
export const getAdminChapters = async (
  subjectId?: number,
  gradeLevelId?: number,
): Promise<AdminChapter[]> => {
  const res = await api.get<ApiResponse<AdminChapter[]>>(`${BASE}/chapters`, {
    ...auth(),
    params: { subjectId, gradeLevelId },
  });
  return res.data.content ?? [];
};

export const createChapter = async (payload: ChapterPayload): Promise<AdminChapter> => {
  const res = await api.post<ApiResponse<AdminChapter>>(`${BASE}/chapters`, payload, auth());
  return res.data.content;
};

export const updateChapter = async (
  id: number,
  payload: ChapterPayload,
): Promise<AdminChapter> => {
  const res = await api.put<ApiResponse<AdminChapter>>(`${BASE}/chapters/${id}`, payload, auth());
  return res.data.content;
};

/** Xoá hẳn — ném lỗi 409 nếu chương đang có câu hỏi. */
export const deleteChapter = async (id: number): Promise<void> => {
  await api.delete<ApiResponse<object>>(`${BASE}/chapters/${id}`, auth());
};

/* Question types */

export const getAdminQuestionTypes = async (): Promise<AdminQuestionType[]> => {
  const res = await api.get<ApiResponse<AdminQuestionType[]>>(`${BASE}/question-types`, auth());
  return res.data.content ?? [];
};

export const createQuestionType = async (
  payload: QuestionTypePayload,
): Promise<AdminQuestionType> => {
  const res = await api.post<ApiResponse<AdminQuestionType>>(
    `${BASE}/question-types`,
    payload,
    auth(),
  );
  return res.data.content;
};

export const updateQuestionType = async (
  id: number,
  payload: QuestionTypePayload,
): Promise<AdminQuestionType> => {
  const res = await api.put<ApiResponse<AdminQuestionType>>(
    `${BASE}/question-types/${id}`,
    payload,
    auth(),
  );
  return res.data.content;
};

/** Xoá hẳn — ném lỗi 409 nếu loại câu hỏi đang có câu hỏi. */
export const deleteQuestionType = async (id: number): Promise<void> => {
  await api.delete<ApiResponse<object>>(`${BASE}/question-types/${id}`, auth());
};
