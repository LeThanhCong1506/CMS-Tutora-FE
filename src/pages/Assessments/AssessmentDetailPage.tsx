import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
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
  deleteAssessmentQuestion,
  getAssessmentById,
  reorderAssessmentQuestions,
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

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await getAssessmentById(id, signal);
        setAssessment(res.content);
      } catch (err) {
        if (!(err instanceof Error && err.name === 'CanceledError')) {
          toast.error('Không tải được bộ đề.');
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
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Cập nhật trạng thái thất bại.';
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
    } catch {
      toast.error('Xoá thất bại.');
    }
  };

  /** Đổi chỗ với câu liền kề. BE cần ĐỦ id mọi câu. */
  const move = async (index: number, direction: -1 | 1) => {
    if (!assessment || reordering) return;
    const target = index + direction;
    if (target < 0 || target >= assessment.questions.length) return;

    const ids = assessment.questions.map((q) => q.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];

    // Optimistic để không nháy khi bấm liên tiếp.
    const reordered = [...assessment.questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setAssessment({ ...assessment, questions: reordered });

    setReordering(true);
    try {
      await reorderAssessmentQuestions(assessment.id, ids);
    } catch {
      toast.error('Không đổi được thứ tự câu hỏi.');
      fetchData();
    } finally {
      setReordering(false);
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
      {/* Tổng quan cấu hình đề */}
      <div className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
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
              {assessment.totalPoints}
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
        <div className="space-y-3">
          {assessment.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              total={assessment.questions.length}
              reordering={reordering}
              onEdit={() => setEditingQuestion(q)}
              onDelete={() => handleDeleteQuestion(q)}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </div>
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

const QuestionCard: React.FC<{
  question: AssessmentQuestion;
  index: number;
  total: number;
  reordering: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}> = ({ question: q, index, total, reordering, onEdit, onDelete, onMove }) => {
  const correctKeys = formatNeedsOptions(q.questionFormat)
    ? q.correctAnswer.split(',').map((k) => k.trim())
    : [];

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-600">
          {index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
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
            <Badge variant="secondary" className="font-normal">
              {q.points} điểm
            </Badge>
          </div>

          <MathText className="text-sm leading-loose text-slate-800">{q.content}</MathText>

          {formatNeedsOptions(q.questionFormat) ? (
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {q.answerOptions?.map((o) => {
                const isCorrect = correctKeys.includes(o.key);
                return (
                  <div
                    key={o.key}
                    className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-sm leading-relaxed ${
                      isCorrect ? 'bg-green-50 text-green-900' : 'text-slate-600'
                    }`}
                  >
                    <span className="font-medium">{o.key}.</span>
                    <MathText className="min-w-0 flex-1">{o.text}</MathText>
                    {isCorrect && (
                      <span className="shrink-0 text-xs font-medium text-green-700">
                        {q.questionFormat === 'true_false' ? 'Đúng' : '✓'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 text-sm leading-loose">
              <span className="text-slate-500">{q.questionFormat === 'essay' ? 'Đáp án mẫu: ' : 'Đáp án: '}</span>
              <MathText className="font-medium text-green-800">{q.correctAnswer}</MathText>
              {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                <span className="text-slate-500"> · cũng đúng: {q.acceptedAnswers.join(', ')}</span>
              )}
            </div>
          )}

          {q.explanation && (
            <p className="mt-3 border-t border-slate-100 pt-2.5 text-sm leading-loose text-slate-500">
              <span className="font-medium text-slate-600">Giải thích: </span>
              <MathText>{q.explanation}</MathText>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            disabled={index === 0 || reordering}
            onClick={() => onMove(-1)}
            aria-label="Chuyển lên"
            className="text-slate-400 hover:text-slate-700"
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={index === total - 1 || reordering}
            onClick={() => onMove(1)}
            aria-label="Chuyển xuống"
            className="text-slate-400 hover:text-slate-700"
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            aria-label="Sửa câu hỏi"
            className="text-slate-400 hover:text-slate-700"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Xoá câu hỏi"
            className="text-slate-400 hover:text-red-600"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentDetailPage;
