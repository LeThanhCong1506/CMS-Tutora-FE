/**
 * Types cho Question Bank (ngân hàng câu hỏi AI giải bài tập).
 */

export type ReviewStatus = 'pending_review' | 'published' | 'rejected';

export type Difficulty = 'NHAN_BIET' | 'THONG_HIEU' | 'VAN_DUNG' | 'VAN_DUNG_CAO';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  NHAN_BIET: 'Nhận biết',
  THONG_HIEU: 'Thông hiểu',
  VAN_DUNG: 'Vận dụng',
  VAN_DUNG_CAO: 'Vận dụng cao',
};

/** null = câu tự luận thường (Ngân hàng câu hỏi) | mc = trắc nghiệm (Ngân hàng kiểm tra). */
export type AnswerFormat = 'mc' | 'numeric' | 'text';

export interface AnswerOption {
  key: string;
  text: string;
}

export interface Question {
  id: string; // uuid
  subjectId: number;
  subjectName: string | null;
  gradeLevelId: number;
  gradeName: string | null;
  chapterId: number | null;
  chapterName: string | null;
  questionTypeId: number | null;
  questionTypeName: string | null;
  difficulty: Difficulty | null;
  content: string;
  solution: string | null;
  solutionSource: string | null;
  answerFormat: AnswerFormat | null;
  answerOptions: AnswerOption[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  sourceDocumentId: string | null;
  sourcePage: number | null;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  hasEmbedding: boolean;
  imageUrls: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

export type QuestionSortBy = 'updatedAt' | 'createdAt' | 'gradeLevel';
export type SortDir = 'asc' | 'desc';

export interface QuestionListParams {
  pageNumber?: number;
  pageSize?: number;
  subjectId?: number;
  gradeLevelId?: number;
  /** CSV "1,2,3" — nhiều chương. */
  chapterIds?: string;
  reviewStatus?: ReviewStatus;
  search?: string;
  difficulties?: string;
  hasSolution?: boolean;
  sortBy?: QuestionSortBy;
  sortDir?: SortDir;
  /** 'mc' -> chỉ câu trắc nghiệm (dùng cho tab Ngân hàng kiểm tra). */
  answerFormat?: AnswerFormat;
}

export interface QuestionListResponse {
  items: Question[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface CreateQuestionPayload {
  subjectId: number;
  gradeLevelId: number;
  chapterId?: number | null;
  questionTypeId?: number | null;
  difficulty?: Difficulty | null;
  content: string;
  solution?: string | null;
  solutionSource?: string | null;
  answerFormat?: AnswerFormat | null;
  answerOptions?: AnswerOption[] | null;
  correctAnswer?: string | null;
  explanation?: string | null;
  reviewStatus?: ReviewStatus;
}

export type UpdateQuestionPayload = CreateQuestionPayload;

export interface UploadPdfResponse {
  sourceDocumentId: string;
  fileName: string;
  pageCount: number | null;
  questionsExtracted: number;
  questionsEmbedded: number;
  status: string;
  message: string | null;
  questions: Question[];
}

/** Lịch sử truy xuất câu hỏi từ PDF. */
export interface QuestionDocument {
  id: string;
  fileName: string;
  pageCount: number | null;
  questionsExtracted: number;
  status: string;
  createdAt: string;
}

export interface QuestionDocumentListResponse {
  items: QuestionDocument[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface QuestionDocumentDetail {
  id: string;
  fileName: string;
  fileUrl: string;
  pageCount: number;
  defaultSubjectId: number;
  defaultGradeLevelId: number;
  status: string;
  questionsExtracted: number;
  errorMessage: string | null;
  uploadedBy: string;
  createdAt: string;
  questions: Question[];
}
