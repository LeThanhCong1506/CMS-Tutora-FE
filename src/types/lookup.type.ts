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