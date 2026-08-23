import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  GripVertical,
  ListChecks,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { PageContainer } from '../../components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MathText } from '../../components/MathText/MathText';
import {
  addAssessmentQuestion,
  deleteAssessmentQuestion,
  getAssessmentById,
  reorderAssessmentQuestions,
  updateAssessmentQuestion,
  updateAssessmentStatus,
} from '../../services/assessment.service';
import {
  ASSESSMENT_STATUS_LABEL,
  formatNeedsOptions,
  type AssessmentDetail,
  type AssessmentQuestion,
  type AssessmentStatus,
} from '../../types/assessment.types';
import { DIFFICULTY_LABEL } from '../../types/question.types';
import { AssessmentFormModal } from '../../components/AssessmentForm/AssessmentFormModal';
import { AssessmentQuestionFormModal } from '../../components/AssessmentForm/AssessmentQuestionFormModal';
import { apiErrorMessage } from '../../utils/apiError';

const STATUS_META: Record<AssessmentStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  published: 'bg-green-100 text-green-800 hover:bg-green-100',
  archived: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
};

/** Chi tiết đề: cấu hình + danh sách câu hỏi. */
const AssessmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AssessmentQuestion | null>(null);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [reordering, setReordering] = useState(false);

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor), useSensor(KeyboardSensor));

  // Tính tại chỗ để sửa điểm inline phản ánh ngay, không đợi fetch lại.
  const totalPoints = useMemo(
    () => assessment?.questions.reduce((sum, q) => sum + (q.points ?? 0), 0) ?? 0,
    [assessment],
  );

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await getAssessmentById(id, signal);
        setAssessment(res.content);
      } catch (err) {
        if (!(err instanceof Error && err.name === 'CanceledError')) {
          toast.error(apiErrorMessage(err, 'Không tải được bộ đề.'));
        }
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchData]);

  const changeStatus = async (status: AssessmentStatus) => {
    if (!assessment) return;
    try {
      await updateAssessmentStatus(assessment.id, status);
      toast.success('Đã cập nhật trạng thái.');
      fetchData();
    } catch (err) {
      const message = apiErrorMessage(err, 'Cập nhật trạng thái thất bại.');
      toast.error(message);
    }
  };

  const handleDeleteQuestion = async (q: AssessmentQuestion) => {
    if (!assessment) return;
    if (!window.confirm('Xoá câu hỏi này khỏi đề?')) return;
    try {
      await deleteAssessmentQuestion(assessment.id, q.id);
      toast.success('Đã xoá câu hỏi.');
      fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Xoá thất bại.'));
    }
  };

  /** Kéo-thả đổi thứ tự. BE cần ĐỦ id mọi câu. */
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!assessment || reordering) return;
    if (!over || active.id === over.id) return;

    const from = assessment.questions.findIndex((q) => q.id === active.id);
    const to = assessment.questions.findIndex((q) => q.id === over.id);
    if (from < 0 || to < 0) return;

    // Optimistic để không nháy khi thả.
    const reordered = arrayMove(assessment.questions, from, to);
    setAssessment({ ...assessment, questions: reordered });

    setReordering(true);
    try {
      await reorderAssessmentQuestions(
        assessment.id,
        reordered.map((q) => q.id),
      );
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không đổi được thứ tự câu hỏi.'));
      fetchData();
    } finally {
      setReordering(false);
    }
  };

  /** Nhân bản: gửi lại đúng payload của câu gốc, BE tự xếp xuống cuối. */
  const handleDuplicate = async (q: AssessmentQuestion) => {
    if (!assessment || q.questionTypeId == null) {
      toast.error('Câu hỏi thiếu loại câu hỏi nên không nhân bản được.');
      return;
    }
    try {
      await addAssessmentQuestion(assessment.id, {
        content: q.content,
        answerOptions: q.answerOptions,
        correctAnswer: q.correctAnswer,
        acceptedAnswers: q.acceptedAnswers,
        explanation: q.explanation,
        chapterId: q.chapterId,
        questionTypeId: q.questionTypeId,
        difficulty: q.difficulty,
        points: q.points,
        imageUrls: q.imageUrls,
      });
      toast.success('Đã nhân bản câu hỏi.');
      fetchData();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Nhân bản thất bại.'));
    }
  };

  /** Sửa điểm ngay trên card — khỏi mở modal chỉ để đổi 1 số. */
  const handlePointsChange = async (q: AssessmentQuestion, points: number) => {
    if (!assessment || q.questionTypeId == null || points === q.points) return;

    // Optimistic: tổng điểm ở thanh tóm tắt cập nhật ngay.
    setAssessment({
      ...assessment,
      questions: assessment.questions.map((x) => (x.id === q.id ? { ...x, points } : x)),
    });

    try {
      await updateAssessmentQuestion(assessment.id, q.id, {
        content: q.content,
        answerOptions: q.answerOptions,
        correctAnswer: q.correctAnswer,
        acceptedAnswers: q.acceptedAnswers,
        explanation: q.explanation,
        chapterId: q.chapterId,
        questionTypeId: q.questionTypeId,
        difficulty: q.difficulty,
        points,
        imageUrls: q.imageUrls,
      });
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không đổi được điểm câu hỏi.'));
      fetchData();
    }
  };

  if (loading && !assessment) {
    return (
      <PageContainer title="Bộ đề đánh giá" maxWidth="wide">
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </PageContainer>
    );
  }

  if (!assessment) {
    return (
      <PageContainer title="Bộ đề đánh giá" maxWidth="wide">
        <div className="rounded-xl border bg-white p-10 text-center text-slate-400">
          Không tìm thấy bộ đề này.
          <div className="mt-4">
            <Button variant="outline" onClick={() => navigate('/admin-portal/assessments')}>
              <ArrowLeft className="size-4" /> Về danh sách
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={assessment.title}
      subtitle={assessment.description ?? 'Bộ đề đánh giá đầu vào.'}
      maxWidth="wide"
      headerAction={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin-portal/assessments')}>
            <ArrowLeft className="size-4" /> Danh sách
          </Button>
          <Button variant="outline" onClick={() => setEditingInfo(true)}>
            <Pencil className="size-4" /> Sửa thông tin
          </Button>
          <Button onClick={() => setAddingQuestion(true)}>
            <Plus className="size-4" /> Thêm câu hỏi
          </Button>
        </div>
      }
    >
      {/* Tổng quan cấu hình đề — dính khi cuộn để luôn thấy số câu/điểm và nút phát hành. */}
      <div className="sticky top-0 z-20 mb-4 rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <InfoItem label="Trạng thái">
            <Badge className={STATUS_META[assessment.status]}>{ASSESSMENT_STATUS_LABEL[assessment.status]}</Badge>
          </InfoItem>
          <InfoItem label="Môn / Lớp">
            <span className="text-sm text-slate-800">
              {assessment.subjectName ?? assessment.subjectId} · {assessment.gradeName ?? assessment.gradeLevelId}
            </span>
          </InfoItem>
          <InfoItem label="Số câu">
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-800">
              <ListChecks className="size-3.5 text-slate-400" />
              {assessment.questions.length}
              {assessment.questionCount != null && (
                <span className={assessment.isReady ? 'text-slate-400' : 'text-amber-600'}>
                  / {assessment.questionCount} cần có
                </span>
              )}
            </span>
          </InfoItem>
          <InfoItem label="Thời gian">
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-800">
              <Clock className="size-3.5 text-slate-400" />
              {assessment.durationMinutes != null ? `${assessment.durationMinutes} phút` : 'Không giới hạn'}
            </span>
          </InfoItem>
          <InfoItem label="Tổng điểm">
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-800">
              <Target className="size-3.5 text-slate-400" />
              {totalPoints}
            </span>
          </InfoItem>

          <div className="ml-auto flex items-center gap-2">
              {assessment.status !== 'published' && (
                <Button size="sm" onClick={() => changeStatus('published')}>
                  Phát hành
                </Button>
              )}
            {assessment.status === 'published' && (
              <Button size="sm" variant="outline" onClick={() => changeStatus('draft')}>
                Chuyển về nháp
              </Button>
            )}
          </div>
        </div>

        {!assessment.isReady && assessment.status !== 'published' && (
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-amber-700">
            {assessment.questions.length === 0
              ? 'Đề chưa có câu hỏi nào — thêm câu hỏi trước khi phát hành.'
              : `Đề cần ít nhất ${assessment.questionCount} câu hỏi để phát hành, hiện có ${assessment.questions.length} câu.`}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {assessment.shuffleQuestions && (
            <Badge variant="secondary" className="font-normal">
              Trộn câu hỏi
            </Badge>
          )}
          {assessment.shuffleOptions && (
            <Badge variant="secondary" className="font-normal">
              Trộn phương án
            </Badge>
          )}
          <Badge variant="secondary" className="font-normal">
            {assessment.showResult ? 'Cho xem điểm sau khi làm' : 'Ẩn điểm sau khi làm'}
          </Badge>
        </div>
      </div>

      {/* Danh sách câu hỏi */}
      {assessment.questions.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center text-slate-400 shadow-sm">
          Chưa có câu hỏi nào trong đề.
          <div className="mt-4">
            <Button onClick={() => setAddingQuestion(true)}>
              <Plus className="size-4" /> Thêm câu hỏi đầu tiên
            </Button>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={assessment.questions.map((q) => q.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {assessment.questions.map((q, i) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={i}
                  reordering={reordering}
                  onEdit={() => setEditingQuestion(q)}
                  onDelete={() => handleDeleteQuestion(q)}
                  onDuplicate={() => handleDuplicate(q)}
                  onPointsChange={(points) => handlePointsChange(q, points)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editingInfo && (
        <AssessmentFormModal
          assessment={assessment}
          onClose={() => setEditingInfo(false)}
          onSaved={() => {
            setEditingInfo(false);
            fetchData();
          }}
        />
      )}

      {(addingQuestion || editingQuestion) && (
        <AssessmentQuestionFormModal
          assessment={assessment}
          question={editingQuestion}
          onClose={() => {
            setAddingQuestion(false);
            setEditingQuestion(null);
          }}
          onSaved={() => {
            setAddingQuestion(false);
            setEditingQuestion(null);
            fetchData();
          }}
        />
      )}
    </PageContainer>
  );
};

const InfoItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1">
    <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
    {children}
  </div>
);

/** Sửa điểm ngay trên card; commit khi blur/Enter để không bắn request mỗi phím. */
const PointsInput: React.FC<{ value: number; onCommit: (points: number) => void }> = ({
  value,
  onCommit,
}) => {
  // Không đồng bộ lại value bằng effect: card đổi điểm là remount qua key,
  // nên draft luôn khởi tạo từ giá trị mới nhất.
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    const next = Number(draft);
    if (!Number.isFinite(next) || next < 0) {
      setDraft(String(value));
      return;
    }
    if (next !== value) onCommit(next);
  };

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
      <input
        type="number"
        min={0}
        step="0.5"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            setDraft(String(value));
            e.currentTarget.blur();
          }
        }}
        aria-label="Điểm của câu hỏi"
        className="w-10 bg-transparent text-right font-medium outline-none focus:text-slate-900"
      />
      điểm
    </span>
  );
};

const QuestionCard: React.FC<{
  question: AssessmentQuestion;
  index: number;
  reordering: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPointsChange: (points: number) => void;
}> = ({ question: q, index, reordering, onEdit, onDelete, onDuplicate, onPointsChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: q.id,
    disabled: reordering,
  });

  const correctKeys = formatNeedsOptions(q.questionFormat)
    ? q.correctAnswer.split(',').map((k) => k.trim())
    : [];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group rounded-xl border bg-white p-3.5 ${
        isDragging ? 'z-10 border-slate-300 opacity-90' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Kéo để đổi thứ tự"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>

        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          {/* Meta + thao tác cùng 1 hàng: card gọn, nút hiện khi hover. */}
          <div className="mb-1.5 flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="font-normal">
                {q.questionTypeName ?? '—'}
              </Badge>
              {q.difficulty && (
                <Badge variant="secondary" className="font-normal">
                  {DIFFICULTY_LABEL[q.difficulty]}
                </Badge>
              )}
              {q.chapterName && (
                <Badge variant="secondary" className="max-w-48 font-normal" title={q.chapterName}>
                  <span className="truncate">{q.chapterName}</span>
                </Badge>
              )}
              <PointsInput key={q.points} value={q.points} onCommit={onPointsChange} />
            </div>

            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                aria-label="Sửa câu hỏi"
                className="size-7 text-slate-400 hover:text-slate-700"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDuplicate}
                aria-label="Nhân bản câu hỏi"
                className="size-7 text-slate-400 hover:text-slate-700"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                aria-label="Xoá câu hỏi"
                className="size-7 text-slate-400 hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <MathText className="text-sm leading-relaxed text-slate-800">{q.content}</MathText>

          {formatNeedsOptions(q.questionFormat) ? (
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {q.answerOptions?.map((o) => {
                const isCorrect = correctKeys.includes(o.key);
                return (
                  <div
                    key={o.key}
                    className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm leading-relaxed ${
                      isCorrect ? 'bg-green-50 text-green-900' : 'text-slate-600'
                    }`}
                  >
                    <span className="font-medium">{o.key}.</span>
                    <MathText className="min-w-0 flex-1">{o.text}</MathText>
                    {isCorrect && <Check className="mt-0.5 size-3.5 shrink-0 text-green-700" />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-2 text-sm leading-relaxed">
              <span className="text-slate-500">
                {q.questionFormat === 'essay' ? 'Đáp án mẫu: ' : 'Đáp án: '}
              </span>
              <MathText className="font-medium text-green-800">{q.correctAnswer}</MathText>
              {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                <span className="text-slate-500"> · cũng đúng: {q.acceptedAnswers.join(', ')}</span>
              )}
            </div>
          )}

          {q.explanation && (
            <p className="mt-2 border-t border-slate-100 pt-2 text-sm leading-relaxed text-slate-500">
              <span className="font-medium text-slate-600">Giải thích: </span>
              <MathText>{q.explanation}</MathText>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentDetailPage;
