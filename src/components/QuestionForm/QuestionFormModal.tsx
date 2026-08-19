import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '../shared/RichTextEditor/RichTextEditor';
import { useLookup } from '../../hooks/useLookup';
import { getChapters } from '../../services/lookup.service';
import { createQuestion, updateQuestion } from '../../services/question.service';
import {
  type Question,
  type ReviewStatus,
  type Difficulty,
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

export const QuestionFormModal: React.FC<Props> = ({ question, onClose, onSaved }) => {
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
    solution: question?.solution ?? '',
    solutionSource: question?.solutionSource ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Môn mặc định Toán khi thêm mới.
  useEffect(() => {
    if (!form.subjectId && subjects.length) {
      const toan = subjects.find((s) => s.subjectName.includes('Toán'));
      set('subjectId', toan?.subjectId ?? subjects[0].subjectId);
    }
  }, [subjects]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chương phụ thuộc (môn, lớp) -> fetch lại khi đổi. Reset chapter nếu không còn hợp lệ.
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
    setSaving(true);
    try {
      const payload: CreateQuestionPayload = {
        subjectId: form.subjectId,
        gradeLevelId: form.gradeLevelId,
        chapterId: form.chapterId,
        questionTypeId: form.questionTypeId,
        difficulty: form.difficulty,
        content: form.content,
        solution: form.solution.trim() || null,
        solutionSource: form.solutionSource.trim() || null,
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
          <DialogTitle className="text-xl font-bold">{isEdit ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {lookupLoading ? (
            <div className="py-10 text-center text-sm text-slate-400">Đang tải dữ liệu...</div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
              {/* Cột trái: Soạn thảo */}
              <div className="flex flex-col gap-6 bg-white p-6 rounded-md border shadow-sm">
              <div className="grid gap-2">
                <Label>Nội dung câu hỏi <span className="text-red-500">*</span></Label>
                <RichTextEditor
                  value={form.content}
                  onChange={(val) => set('content', val)}
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>

              {/* imageUrls gallery (read-only) - write later */}
            {isEdit && question!.imageUrls?.length > 0 && (
              <div className="grid gap-2">
                <Label className="text-slate-500">Ảnh đính kèm ({question!.imageUrls.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {question!.imageUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group overflow-hidden rounded-lg border bg-slate-50 transition hover:shadow-md"
                    >
                      <img
                        src={url}
                        alt={`Ảnh ${i + 1}`}
                        className="h-24 w-auto object-contain transition group-hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

              <div className="grid gap-2">
                <Label>Lời giải mẫu</Label>
                <RichTextEditor
                  value={form.solution}
                  onChange={(val) => set('solution', val)}
                  placeholder="Nhập lời giải..."
                />
              </div>
            </div>

            {/* Cột phải: Cài đặt */}
            <div className="flex flex-col gap-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cài đặt</h3>
              <div className="flex flex-col gap-5 bg-white p-5 rounded-md border shadow-sm">
                <Field label="Loại câu hỏi">
                  <Select
                    value={form.questionTypeId ? String(form.questionTypeId) : NONE}
                    onValueChange={(v) => set('questionTypeId', v === NONE ? null : Number(v))}
                    items={[{ value: NONE, label: 'Chưa phân loại' }, ...types.map((t) => ({ value: String(t.id), label: t.name }))]}
                  >
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue placeholder="Chọn loại câu hỏi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Chưa phân loại</SelectItem>
                      {types.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

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
                    items={[{ value: NONE, label: 'Không thuộc chương nào' }, ...chapters.map((c) => ({ value: String(c.id), label: c.name }))]}
                  >
                    <SelectTrigger className="bg-slate-50 w-full">
                      <SelectValue placeholder={chapters.length ? 'Chọn chương' : 'Chọn môn+lớp trước'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 w-auto min-w-60">
                      <SelectItem value={NONE}>Không thuộc chương nào</SelectItem>
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
          <Button
            variant="drag"
            onClick={() => submit(question?.reviewStatus ?? 'pending_review')}
            disabled={saving}
          >
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
