/**
 * Lookup service — môn học + khối lớp cho dropdown.
 *   GET /api/subjects      -> { subjectId, subjectName }
 *   GET /api/grade-levels  -> { gradeLevelId, gradeName, levelOrder }
 */
import type { ApiResponse } from './apiHelpers';
import type { Subject, GradeLevel, Chapter, QuestionType } from '../types/lookup.type';
import { apiClient as api } from './apiClient';

export type { Subject, GradeLevel, Chapter, QuestionType } from '../types/lookup.type';

export const getSubjects = async (): Promise<Subject[]> => {
  const res = await api.get<ApiResponse<Subject[]>>('/subjects');
  return res.data.content ?? [];
};

export const getGradeLevels = async (): Promise<GradeLevel[]> => {
  const res = await api.get<ApiResponse<GradeLevel[]>>('/grade-levels');
  return (res.data.content ?? []).sort((a, b) => a.levelOrder - b.levelOrder);
};

/** Chương theo môn+lớp (truyền để lọc). */
export const getChapters = async (
  subjectId?: number,
  gradeLevelId?: number,
): Promise<Chapter[]> => {
  const res = await api.get<ApiResponse<Chapter[]>>('/chapters', {
    params: { subjectId, gradeLevelId },
  });
  return res.data.content ?? [];
};

export const getQuestionTypes = async (): Promise<QuestionType[]> => {
  const res = await api.get<ApiResponse<QuestionType[]>>('/question-types');
  return res.data.content ?? [];
};
