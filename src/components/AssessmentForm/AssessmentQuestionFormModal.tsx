import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '../shared/RichTextEditor/RichTextEditor';
import { getChapters } from '../../services/lookup.service';
import { useLookup } from '../../hooks/useLookup';
import { addAssessmentQuestion, updateAssessmentQuestion } from '../../services/assessment.service';
import { DIFFICULTY_LABEL, type Difficulty } from '../../types/question.types';
import {
  formatAllowsMultiple,
  formatFromSlug,
  formatNeedsOptions,
  type AnswerOption,
  type AssessmentDetail,
  type AssessmentQuestion,
  type AssessmentQuestionPayload,
} from '../../types/assessment.types';
import type { Chapter } from '../../types/lookup.type';

interface Props {
  assessment: AssessmentDetail;
  question: AssessmentQuestion | null; // null = thêm mới
  onClose: () => void;
  onSaved: () => void;
}

const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[];
const NONE = '__none__';

const DEFAULT_CHOICE_OPTIONS: AnswerOption[] = [
  { key: 'A', text: '' },
  { key: 'B', text: '' },
  { key: 'C', text: '' },
  { key: 'D', text: '' },
];

/** Mệnh đề a/b/c/d kiểu đề Đúng-Sai Bộ GD. */
const DEFAULT_TF_OPTIONS: AnswerOption[] = [
  { key: 'a', text: '' },
  { key: 'b', text: '' },
  { key: 'c', text: '' },
  { key: 'd', text: '' },
];

/** Ký hiệu tiếp theo, bỏ qua đã dùng. Chữ thường cho Đúng/Sai. */
const nextOptionKey = (options: AnswerOption[], lower: boolean): string => {
  const used = new Set(options.map((o) => o.key.toUpperCase()));
  for (let c = 65; c <= 90; c++) {
    const upper = String.fromCharCode(c);
    if (!used.has(upper)) return lower ? upper.toLowerCase() : upper;
  }
  return `X${options.length}`;
};

/** 1 dòng phương án: kéo-thả · chọn đúng · ký hiệu · nội dung · xoá. */
const OptionRow: React.FC<{
  option: AnswerOption;
  multiple: boolean;
  checked: boolean;
  placeholder: string;
  canRemove: boolean;
  onToggle: () => void;
  onChange: (text: string) => void;
  onRemove: () => void;
}> = ({ option, multiple, checked, placeholder, canRemove, onToggle, onChange, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.key,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-white py-1.5 pl-2 pr-1.5 transition ${
        isDragging ? 'z-10 border-slate-300' : checked ? 'border-green-300 bg-green-50/40' : 'border-slate-200'
      }`}
    >
      <input
        type={multiple ? 'checkbox' : 'radio'}
        name="correct-answer"
        checked={checked}
        onChange={onToggle}
        className="size-4 shrink-0 cursor-pointer accent-primary"
        aria-label={`Đáp án đúng ${option.key}`}
      />
      <span className="w-5 shrink-0 text-sm font-medium text-slate-500">{option.key}.</span>
      <Input
        value={option.text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Kéo để đổi thứ tự ${option.key}`}
        className="shrink-0 cursor-grab touch-none rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Xoá phương án ${option.key}`}
        className="size-7 shrink-0 text-slate-300 hover:text-red-600 disabled:opacity-0"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
};

/** Form 1 câu hỏi. UI đáp án đổi theo loại câu đã chọn (slug -> cách chấm). */
export const AssessmentQuestionFormModal: React.FC<Props> = ({ assessment, question, onClose, onSaved }) => {
  const isEdit = !!question;
  const { types, loading: lookupLoading } = useLookup();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [content, setContent] = useState(question?.content ?? '');
  const [options, setOptions] = useState<AnswerOption[]>(
    question?.answerOptions?.length
      ? question.answerOptions
      : question?.questionFormat === 'true_false'
        ? DEFAULT_TF_OPTIONS
        : DEFAULT_CHOICE_OPTIONS,
  );
  // Đáp án đúng luôn giữ dạng danh sách key ở FE; nối thành CSV khi gửi lên BE.
  const [correctKeys, setCorrectKeys] = useState<string[]>(
    question && formatNeedsOptions(question.questionFormat)
      ? question.correctAnswer
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      : [],
  );
  const [shortAnswer, setShortAnswer] = useState(
    question && question.questionFormat === 'short_answer' ? question.correctAnswer : '',
  );
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(question?.acceptedAnswers ?? []);
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [chapterId, setChapterId] = useState<number | null>(question?.chapterId ?? null);
  const [questionTypeId, setQuestionTypeId] = useState<number | null>(question?.questionTypeId ?? null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(question?.difficulty ?? null);
  const [points, setPoints] = useState(String(question?.points ?? 1));
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor), useSensor(KeyboardSensor));

  // Chương theo môn+lớp CỦA ĐỀ.
  useEffect(() => {
    let alive = true;
    getChapters(assessment.subjectId, assessment.gradeLevelId)
      .then((cs) => alive && setChapters(cs))
      .catch(() => alive && setChapters([]));
    return () => {
      alive = false;
    };
  }, [assessment.subjectId, assessment.gradeLevelId]);

  // Cách chấm suy từ slug của loại câu đã chọn — không có dropdown riêng.
  const selectedType = types.find((t) => t.id === questionTypeId);
  const format = selectedType ? formatFromSlug(selectedType.slug) : null;
  const needsOptions = format != null && formatNeedsOptions(format);
  const allowsMultiple = format != null && formatAllowsMultiple(format);
  const isEssay = format === 'essay';

  // Đổi loại -> reset đáp án, tránh mang key cũ sang loại mới.
  const changeType = (id: number) => {
    setQuestionTypeId(id);
    const next = formatFromSlug(types.find((t) => t.id === id)?.slug);
    if (next === format) return;

    setCorrectKeys([]);
    if (!formatNeedsOptions(next)) return;
    setOptions((prev) =>
      prev.some((o) => o.text.trim())
        ? prev
        : next === 'true_false'
          ? DEFAULT_TF_OPTIONS
          : DEFAULT_CHOICE_OPTIONS,
    );
  };

  const updateOption = (key: string, text: string) =>
    setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, text } : o)));

  const addOption = () =>
    setOptions((prev) => [...prev, { key: nextOptionKey(prev, format === 'true_false'), text: '' }]);

  const removeOption = (key: string) => {
    setOptions((prev) => prev.filter((o) => o.key !== key));
    setCorrectKeys((prev) => prev.filter((k) => k !== key));
  };

  /** Kéo-thả đổi thứ tự phương án. Ký hiệu (A/B/C) đi theo dòng, không đánh lại số. */
  const reorderOptions = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOptions((prev) => {
      const from = prev.findIndex((o) => o.key === active.id);
      const to = prev.findIndex((o) => o.key === over.id);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  };

  const toggleCorrect = (key: string) =>
    setCorrectKeys((prev) =>
      allowsMultiple ? (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]) : [key],
    );

  const filledOptions = useMemo(() => options.filter((o) => o.text.trim().length > 0), [options]);

  const submit = async () => {
    if (content.trim().length < 5) {
      toast.error('Nội dung câu hỏi quá ngắn.');
      return;
    }
    if (!questionTypeId) {
      toast.error('Vui lòng chọn loại câu hỏi.');
      return;
    }

    const pointsNum = Number(points);
    if (!Number.isFinite(pointsNum) || pointsNum <= 0) {
      toast.error('Điểm mỗi câu phải lớn hơn 0.');
      return;
    }

    let correctAnswer: string;
    if (needsOptions) {
      if (filledOptions.length < 2) {
        toast.error(
          format === 'true_false' ? 'Cần ít nhất 2 mệnh đề có nội dung.' : 'Cần ít nhất 2 phương án có nội dung.',
        );
        return;
      }
      // Chỉ tính đáp án nằm trong phương án CÓ nội dung.
      const valid = correctKeys.filter((k) => filledOptions.some((o) => o.key === k));
      if (valid.length === 0) {
        toast.error(format === 'true_false' ? 'Vui lòng tick các mệnh đề đúng.' : 'Vui lòng chọn đáp án đúng.');
        return;
      }
      correctAnswer = valid.join(',');
    } else {
      if (shortAnswer.trim().length === 0) {
        toast.error('Vui lòng nhập đáp án.');
        return;
      }
      correctAnswer = shortAnswer.trim();
    }

    const payload: AssessmentQuestionPayload = {
      content: content.trim(),
      answerOptions: needsOptions ? filledOptions : null,
      correctAnswer,
      acceptedAnswers: needsOptions ? null : acceptedAnswers.filter((a) => a.trim()).map((a) => a.trim()),
      explanation: explanation.trim() || null,
      chapterId,
      questionTypeId,
      difficulty,
      points: pointsNum,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateAssessmentQuestion(assessment.id, question!.id, payload);
        toast.success('Đã cập nhật câu hỏi.');
      } else {
        await addAssessmentQuestion(assessment.id, payload);
        toast.success('Đã thêm câu hỏi.');
      }
      onSaved();
    } catch (err) {
      // BE validate lại đáp án -> ưu tiên message của BE.
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (isEdit ? 'Cập nhật câu hỏi thất bại.' : 'Thêm câu hỏi thất bại.');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl lg:max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</DialogTitle>
        </DialogHeader>

        {/* Trái: nội dung + đáp án. Phải: tổng quan. */}
        <div className="@container/qform py-2">
          <div className="grid gap-6 @3xl/qform:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0 space-y-5">
              <div className="space-y-2">
                <Label>
                  Nội dung câu hỏi <span className="text-red-500">*</span>
                </Label>
                <RichTextEditor value={content} onChange={setContent} placeholder="Nhập đề bài..." />
              </div>

              {needsOptions ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>
                      {format === 'true_false' ? 'Các mệnh đề' : 'Phương án'} <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-xs text-slate-500">
                      {format === 'true_false'
                        ? 'Tick mệnh đề ĐÚNG — mệnh đề không tick tính là sai'
                        : allowsMultiple
                          ? 'Tick tất cả đáp án đúng'
                          : 'Chọn 1 đáp án đúng'}
                    </span>
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={reorderOptions}
                  >
                    <SortableContext
                      items={options.map((o) => o.key)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-1.5">
                        {options.map((o) => (
                          <OptionRow
                            key={o.key}
                            option={o}
                            multiple={allowsMultiple}
                            checked={correctKeys.includes(o.key)}
                            placeholder={
                              format === 'true_false' ? `Mệnh đề ${o.key}` : `Nội dung phương án ${o.key}`
                            }
                            canRemove={options.length > 2}
                            onToggle={() => toggleCorrect(o.key)}
                            onChange={(text) => updateOption(o.key, text)}
                            onRemove={() => removeOption(o.key)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  <Button variant="outline" size="sm" onClick={addOption} className="mt-1">
                    <Plus className="size-3.5" /> Thêm {format === 'true_false' ? 'mệnh đề' : 'phương án'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="short-answer">
                      {isEssay ? 'Đáp án mẫu' : 'Đáp án'} <span className="text-red-500">*</span>
                    </Label>
                    {isEssay ? (
                      <textarea
                        id="short-answer"
                        value={shortAnswer}
                        onChange={(e) => setShortAnswer(e.target.value)}
                        rows={4}
                        placeholder="Lời giải mẫu — AI đối chiếu với bài làm của học sinh."
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    ) : (
                      <Input
                        id="short-answer"
                        value={shortAnswer}
                        onChange={(e) => setShortAnswer(e.target.value)}
                        placeholder="VD: 0,5"
                      />
                    )}
                  </div>

                  <div className={isEssay ? 'hidden' : 'space-y-2'}>
                    <Label>Cách viết khác cũng tính đúng</Label>
                    <p className="text-xs text-slate-500">
                      Không phân biệt hoa/thường và khoảng trắng đầu cuối. VD đáp án "0,5" có thể thêm "1/2", "0.5".
                    </p>
                    <div className="space-y-2">
                      {acceptedAnswers.map((a, i) => (
                        <div key={`accepted-${i}`} className="flex items-center gap-2">
                          <Input
                            value={a}
                            onChange={(e) =>
                              setAcceptedAnswers((prev) => prev.map((x, xi) => (xi === i ? e.target.value : x)))
                            }
                            placeholder="Cách viết khác"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAcceptedAnswers((prev) => prev.filter((_, xi) => xi !== i))}
                            aria-label="Xoá cách viết"
                            className="shrink-0 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAcceptedAnswers((prev) => [...prev, ''])}
                      disabled={acceptedAnswers.length >= 20}
                    >
                      <Plus className="size-3.5" /> Thêm cách viết
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="explanation">Giải thích</Label>
                <textarea
                  id="explanation"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  rows={3}
                  placeholder="Vì sao đáp án này đúng — học sinh thấy sau khi làm xong (nếu đề bật xem đáp án)."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Tổng quan: loại câu + phân loại + điểm. */}
            <aside className="space-y-4 self-start rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-sm font-medium text-slate-700">Tổng quan câu hỏi</p>

              <div className="space-y-2">
                <Label>
                  Loại câu hỏi <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={questionTypeId ? String(questionTypeId) : ''}
                  onValueChange={(v) => changeType(Number(v))}
                  disabled={lookupLoading}
                  items={types.map((t) => ({ value: String(t.id), label: t.name }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn loại" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {format === 'essay' && (
                  <p className="text-xs text-slate-500">AI đánh giá theo đáp án mẫu, không chấm tự động.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Chương</Label>
                <Select
                  value={chapterId ? String(chapterId) : NONE}
                  onValueChange={(v) => setChapterId(v === NONE ? null : Number(v))}
                  items={[
                    { value: NONE, label: 'Không thuộc chương nào' },
                    ...chapters.map((c) => ({ value: String(c.id), label: c.name })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn chương" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Không thuộc chương nào</SelectItem>
                    {chapters.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Độ khó</Label>
                <Select
                  value={difficulty ?? NONE}
                  onValueChange={(v) => setDifficulty(v === NONE ? null : (v as Difficulty))}
                  items={[
                    { value: NONE, label: 'Chưa phân loại' },
                    ...DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn độ khó" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Chưa phân loại</SelectItem>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {DIFFICULTY_LABEL[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">Điểm</Label>
                <Input
                  id="points"
                  type="number"
                  min={0.01}
                  step={0.25}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
              </div>
            </aside>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm câu hỏi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
