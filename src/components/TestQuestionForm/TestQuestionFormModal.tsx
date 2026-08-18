import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '../shared/RichTextEditor/RichTextEditor';
import { useLookup } from '../../hooks/useLookup';
import { getChapters } from '../../services/lookup.service';
import { createQuestion, updateQuestion } from '../../services/question.service';
import {
  type Question,
  type ReviewStatus,
  type Difficulty,
  type AnswerOption,
  type CreateQuestionPayload,
  DIFFICULTY_LABEL,
} from '../../types/question.types';
import type { Chapter } from '../../types/lookup.type';

interface Props {
  question: Question | null; // null = thêm mới
  onClose: () => void;
  onSaved: () => void;
}

const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[];
const NONE = '__none__';

const DEFAULT_OPTIONS: AnswerOption[] = [
  { key: 'A', text: '' },
  { key: 'B', text: '' },
  { key: 'C', text: '' },
  { key: 'D', text: '' },
];

/** Key tiếp theo A -> B -> ... -> Z cho phương án mới, bỏ qua key đã dùng. */
const nextOptionKey = (options: AnswerOption[]): string => {
  const used = new Set(options.map((o) => o.key));
  for (let c = 65; c <= 90; c++) {
    const k = String.fromCharCode(c);
    if (!used.has(k)) return k;
  }
  return `X${options.length}`;
};

/**
 * Form "Ngân hàng kiểm tra" — giống QuestionFormModal (Ngân hàng câu hỏi) ở phần Nội dung +
 * Cài đặt, chỉ khác: thay "Lời giải mẫu" bằng danh sách đáp án trắc nghiệm (chọn 1 đáp án
 * đúng) + trường Giải thích. Dùng CHUNG API tạo/sửa câu hỏi (answerFormat='mc' phân biệt).
 */
export const TestQuestionFormModal: React.FC<Props> = ({ question, onClose, onSaved }) => {
  const isEdit = !!question;
  const { subjects, grades, types, loading: lookupLoading } = useLookup();

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [form, setForm] = useState({
    subjectId: question?.subjectId ?? 0,
    gradeLevelId: question?.gradeLevelId ?? 0,
    chapterId: question?.chapterId ?? (null as number | null),
    questionTypeId: question?.questionTypeId ?? (null as number | null),
    difficulty: question?.difficulty ?? (null as Difficulty | null),
    content: question?.content ?? '',
    options: question?.answerOptions?.length ? question.answerOptions : DEFAULT_OPTIONS,
    correctAnswer: question?.correctAnswer ?? (null as string | null),
    explanation: question?.explanation ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.subjectId && subjects.length) {
      const toan = subjects.find((s) => s.subjectName.includes('Toán'));
      set('subjectId', toan?.subjectId ?? subjects[0].subjectId);
    }
  }, [subjects]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ngân hàng kiểm tra chỉ tạo câu trắc nghiệm -> mặc định luôn loại này thay vì "—".
  useEffect(() => {
    if (!form.questionTypeId && types.length) {
      const tracNghiem = types.find((t) => t.name.includes('Trắc nghiệm'));
      if (tracNghiem) set('questionTypeId', tracNghiem.id);
    }
  }, [types]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!form.subjectId || !form.gradeLevelId) {
      setChapters([]);
      return;
    }
    let alive = true;
    getChapters(form.subjectId, form.gradeLevelId).then((cs) => {
      if (!alive) return;
      setChapters(cs);
      if (form.chapterId && !cs.some((c) => c.id === form.chapterId)) {
        set('chapterId', null);
      }
    });
    return () => {
      alive = false;
    };
  }, [form.subjectId, form.gradeLevelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateOption = (key: string, text: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o) => (o.key === key ? { ...o, text } : o)) }));

  const addOption = () =>
    setForm((f) => ({ ...f, options: [...f.options, { key: nextOptionKey(f.options), text: '' }] }));

  const removeOption = (key: string) =>
    setForm((f) => ({
      ...f,
      options: f.options.filter((o) => o.key !== key),
      correctAnswer: f.correctAnswer === key ? null : f.correctAnswer,
    }));

  const submit = async (reviewStatus: ReviewStatus) => {
    if (form.content.trim().length === 0) {
      toast.error('Vui lòng nhập nội dung câu hỏi.');
      return;
    }
    if (form.content.trim().length < 5) {
      toast.error('Nội dung câu hỏi quá ngắn.');
      return;
    }
    if (!form.subjectId || !form.gradeLevelId) {
      toast.error('Vui lòng chọn môn và khối lớp.');
      return;
    }
    const filledOptions = form.options.filter((o) => o.text.trim().length > 0);
    if (filledOptions.length < 2) {
      toast.error('Cần ít nhất 2 phương án có nội dung.');
      return;
    }
    if (!form.correctAnswer || !filledOptions.some((o) => o.key === form.correctAnswer)) {
      toast.error('Vui lòng chọn đáp án đúng.');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateQuestionPayload = {
        subjectId: form.subjectId,
        gradeLevelId: form.gradeLevelId,
        chapterId: form.chapterId,
        questionTypeId: form.questionTypeId,
        difficulty: form.difficulty,
        content: form.content,
        answerFormat: 'mc',
        answerOptions: filledOptions,
        correctAnswer: form.correctAnswer,
        explanation: form.explanation.trim() || null,
        reviewStatus,
      };
      if (isEdit) await updateQuestion(question!.id, payload);
      else await createQuestion(payload);
      toast.success(reviewStatus === 'published' ? 'Đã lưu & duyệt câu hỏi.' : 'Đã lưu câu hỏi.');
      onSaved();
    } catch {
      toast.error('Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] sm:max-w-5xl lg:max-w-6xl bg-slate-50 flex flex-col p-0 overflow-hidden">
        <DialogHeader className="bg-white px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl font-bold">
            {isEdit ? 'Chỉnh sửa câu hỏi trắc nghiệm' : 'Thêm câu hỏi trắc nghiệm'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {lookupLoading ? (
            <div className="py-10 text-center text-sm text-slate-400">Đang tải dữ liệu...</div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
              <div className="flex flex-col gap-6 bg-white p-6 rounded-md border shadow-sm">
                <div className="grid gap-2">
                  <Label>
                    Nội dung câu hỏi <span className="text-red-500">*</span>
                  </Label>
                  <RichTextEditor
                    value={form.content}
                    onChange={(val) => set('content', val)}
                    placeholder="Nhập nội dung câu hỏi..."
                  />
                </div>

                <div className="grid gap-2">
                  <Label>
                    Đáp án <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-slate-400">Chọn nút tròn ở phương án đúng.</p>
                  <div className="flex flex-col gap-2">
                    {form.options.map((o) => (
                      <div key={o.key} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => set('correctAnswer', o.key)}
                          aria-label={`Chọn ${o.key} là đáp án đúng`}
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition ${
                            form.correctAnswer === o.key
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-slate-300 bg-white text-slate-600 hover:border-green-400'
                          }`}
                        >
                          {o.key}
                        </button>
                        <Input
                          value={o.text}
                          onChange={(e) => updateOption(o.key, e.target.value)}
                          placeholder={`Nội dung phương án ${o.key}...`}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(o.key)}
                          disabled={form.options.length <= 2}
                          aria-label={`Xoá phương án ${o.key}`}
                          className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-fit" onClick={addOption}>
                    <Plus className="size-3.5" /> Thêm phương án
                  </Button>
                </div>

                <div className="grid gap-2">
                  <Label>Giải thích đáp án</Label>
                  <RichTextEditor
                    value={form.explanation}
                    onChange={(val) => set('explanation', val)}
                    placeholder="Vì sao đáp án này đúng..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cài đặt</h3>
                <div className="flex flex-col gap-5 bg-white p-5 rounded-md border shadow-sm">
                  <Field label="Môn học">
                    <Select
                      value={form.subjectId ? String(form.subjectId) : ''}
                      onValueChange={(v) => set('subjectId', Number(v))}
                      items={subjects.map((s) => ({ value: String(s.subjectId), label: s.subjectName }))}
                    >
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="Chọn môn" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((s) => (
                          <SelectItem key={s.subjectId} value={String(s.subjectId)}>
                            {s.subjectName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Độ khó">
                    <div className="grid grid-cols-2 gap-2">
                      {DIFFICULTIES.map((d) => {
                        const isActive = form.difficulty === d;
                        return (
                          <button
                            key={d}
                            onClick={() => set('difficulty', d)}
                            className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
                              isActive
                                ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {DIFFICULTY_LABEL[d]}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Khối lớp">
                    <Select
                      value={form.gradeLevelId ? String(form.gradeLevelId) : ''}
                      onValueChange={(v) => set('gradeLevelId', Number(v))}
                      items={grades.map((g) => ({ value: String(g.gradeLevelId), label: g.gradeName }))}
                    >
                      <SelectTrigger className="bg-slate-50">
                        <SelectValue placeholder="Chọn lớp" />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((g) => (
                          <SelectItem key={g.gradeLevelId} value={String(g.gradeLevelId)}>
                            {g.gradeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Chương">
                    <Select
                      value={form.chapterId ? String(form.chapterId) : NONE}
                      onValueChange={(v) => set('chapterId', v === NONE ? null : Number(v))}
                      disabled={!chapters.length}
                      items={[{ value: NONE, label: '—' }, ...chapters.map((c) => ({ value: String(c.id), label: c.name }))]}
                    >
                      <SelectTrigger className="bg-slate-50 w-full">
                        <SelectValue placeholder={chapters.length ? 'Chọn chương' : 'Chọn môn+lớp trước'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 w-auto min-w-60">
                        <SelectItem value={NONE}>—</SelectItem>
                        {chapters.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)} className="whitespace-normal">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="bg-white mb-1 px-6 py-4 border-t shrink-0 flex items-center justify-end gap-2">
          <Button variant="urgent" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button variant="drag" onClick={() => submit(question?.reviewStatus ?? 'pending_review')} disabled={saving}>
            Lưu nháp
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => submit('published')} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Công khai'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid gap-2">
    <Label>{label}</Label>
    {children}
  </div>
);
