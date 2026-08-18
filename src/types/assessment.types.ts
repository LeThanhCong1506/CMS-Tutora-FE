import type { Difficulty } from './question.types';

/** draft = đang soạn | published = phát cho học sinh | archived = ngừng dùng. */
export type AssessmentStatus = 'draft' | 'published' | 'archived';

export const ASSESSMENT_STATUS_LABEL: Record<AssessmentStatus, string> = {
  draft: 'Nháp',
  published: 'Đang dùng',
  archived: 'Lưu trữ',
};

/** Cách chấm, BE suy từ slug của loại câu hỏi. FE chỉ đọc để render đúng UI đáp án. */
export type QuestionFormat = 'single_choice' | 'multi_choice' | 'true_false' | 'short_answer' | 'essay';

/** slug question_types -> cách chấm. Giữ khớp QuestionTypeFormatMapper ở BE. */
export const SLUG_TO_FORMAT: Record<string, QuestionFormat> = {
  trac_nghiem: 'single_choice',
  nhieu_dap_an: 'multi_choice',
  dung_sai: 'true_false',
  dien_khuyet: 'short_answer',
};

/** Mọi loại đều dùng được; loại không có trong map là tự luận (AI đánh giá). */
export const formatFromSlug = (slug?: string | null): QuestionFormat =>
  (slug && SLUG_TO_FORMAT[slug]) || 'essay';

/** true nếu cần danh sách phương án. */
export const formatNeedsOptions = (f: QuestionFormat) =>
  f === 'single_choice' || f === 'multi_choice' || f === 'true_false';

/** false = BE không auto-chấm, AI đánh giá. */
export const formatIsAutoGraded = (f: QuestionFormat) => f !== 'essay';

/** true nếu cho nhiều đáp án đúng. */
export const formatAllowsMultiple = (f: QuestionFormat) => f === 'multi_choice' || f === 'true_false';

export interface AnswerOption {
  key: string;
  text: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string | null;

  subjectId: number;
  subjectName: string | null;
  gradeLevelId: number;
  gradeName: string | null;

  /** null = làm hết câu đã gán. */
  questionCount: number | null;
  durationMinutes: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResult: boolean;
  status: AssessmentStatus;

  /** Số câu đã gán (khác questionCount). */
  assignedQuestionCount: number;
  totalPoints: number;
  /** Đủ câu -> phát hành được. */
  isReady: boolean;

  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  displayOrder: number;
  points: number;

  questionFormat: QuestionFormat;

  chapterId: number | null;
  chapterName: string | null;
  questionTypeId: number | null;
  questionTypeName: string | null;
  difficulty: Difficulty | null;

  content: string;
  answerOptions: AnswerOption[] | null;
  /** CSV key, hoặc chuỗi với loại nhập tay. */
  correctAnswer: string;
  acceptedAnswers: string[] | null;
  explanation: string | null;
  imageUrls: string[];

  createdAt: string | null;
  updatedAt: string | null;
}

export interface AssessmentDetail extends Assessment {
  questions: AssessmentQuestion[];
}

export type AssessmentSortBy = 'updatedAt' | 'createdAt' | 'title' | 'gradeLevel';
export type SortDir = 'asc' | 'desc';

export interface AssessmentListParams {
  pageNumber?: number;
  pageSize?: number;
  subjectId?: number;
  gradeLevelId?: number;
  status?: AssessmentStatus;
  search?: string;
  sortBy?: AssessmentSortBy;
  sortDir?: SortDir;
}

export interface AssessmentListResponse {
  items: Assessment[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface AssessmentPayload {
  title: string;
  description?: string | null;
  subjectId: number;
  gradeLevelId: number;
  questionCount?: number | null;
  durationMinutes?: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResult: boolean;
  status?: AssessmentStatus;
}

export interface AssessmentQuestionPayload {
  content: string;
  answerOptions?: AnswerOption[] | null;
  correctAnswer: string;
  acceptedAnswers?: string[] | null;
  explanation?: string | null;
  chapterId?: number | null;
  /** BE suy cách chấm từ slug của loại này. */
  questionTypeId: number;
  difficulty?: Difficulty | null;
  points: number;
  displayOrder?: number | null;
  imageUrls?: string[] | null;
}
