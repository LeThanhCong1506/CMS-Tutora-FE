/**
 * Types cho Lookup service (môn học + khối lớp + chương + loại câu hỏi).
 */
export interface Subject {
  subjectId: number;
  subjectName: string;
}

export interface GradeLevel {
  gradeLevelId: number;
  gradeName: string;
  levelOrder: number;
}

export interface Chapter {
  id: number;
  subjectId: number;
  gradeLevelId: number;
  slug: string;
  name: string;
  displayOrder: number;
}

export interface QuestionType {
  id: number;
  slug: string;
  name: string;
  displayOrder: number;
}

/* CMS admin: /api/admin/lookup/* */
export interface AdminSubject extends Subject {
  description: string | null;
  isActive: boolean;
  slug: string | null;
  iconUrl: string | null;
  isHomeworkEnabled: boolean;
  displayOrder: number;
  /** Khối lớp thấp nhất môn này áp dụng. Null = không giới hạn. */
  minGradeLevelId: number | null;
  /** Khối lớp cao nhất môn này áp dụng. Null = không giới hạn. */
  maxGradeLevelId: number | null;
}

export interface AdminGradeLevel extends GradeLevel {
  isActive: boolean;
}

/** Chương kèm tên môn/khối và số câu hỏi tham chiếu (xoá bị chặn 409 khi > 0). */
export interface AdminChapter extends Chapter {
  subjectName: string | null;
  gradeName: string | null;
  isActive: boolean;
  questionCount: number;
}

export interface AdminQuestionType extends QuestionType {
  isActive: boolean;
  questionCount: number;
}

/* Payloads */
export interface SubjectPayload {
  subjectName: string;
  description?: string | null;
  isActive: boolean;
  slug?: string | null;
  iconUrl?: string | null;
  isHomeworkEnabled: boolean;
  displayOrder: number;
  minGradeLevelId?: number | null;
  maxGradeLevelId?: number | null;
}

export interface GradeLevelPayload {
  gradeName: string;
  levelOrder: number;
  isActive: boolean;
}

export interface ChapterPayload {
  subjectId: number;
  gradeLevelId: number;
  name: string;
  slug?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface QuestionTypePayload {
  name: string;
  slug?: string | null;
  displayOrder: number;
  isActive: boolean;
}