import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLookup } from '../../hooks/useLookup';
import { createAssessment, updateAssessment } from '../../services/assessment.service';
import type { Assessment, AssessmentPayload } from '../../types/assessment.types';

interface Props {
  assessment: Assessment | null; // null = tạo mới
  onClose: () => void;
  onSaved: (saved: Assessment) => void;
}

/** Form cấu hình đề. Câu hỏi và phát hành làm ở trang chi tiết. */
export const AssessmentFormModal: React.FC<Props> = ({ assessment, onClose, onSaved }) => {
  const isEdit = !!assessment;
  const { subjects, grades, loading: lookupLoading } = useLookup();

  const [form, setForm] = useState({
    title: assessment?.title ?? '',
    description: assessment?.description ?? '',
    subjectId: assessment?.subjectId ?? 0,
    gradeLevelId: assessment?.gradeLevelId ?? 0,
    // Giữ string để ô input rỗng được.
    questionCount: assessment?.questionCount != null ? String(assessment.questionCount) : '',
    durationMinutes: assessment?.durationMinutes != null ? String(assessment.durationMinutes) : '',
    shuffleQuestions: assessment?.shuffleQuestions ?? false,
    shuffleOptions: assessment?.shuffleOptions ?? false,
    showResult: assessment?.showResult ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (form.title.trim().length < 3) {
      toast.error('Tên đề phải từ 3 ký tự.');
      return;
    }
    if (!form.subjectId || !form.gradeLevelId) {
      toast.error('Vui lòng chọn môn và khối lớp.');
      return;
    }

    const toNum = (s: string) => (s.trim() === '' ? null : Number(s));
    const questionCount = toNum(form.questionCount);
    const durationMinutes = toNum(form.durationMinutes);

    if (questionCount != null && (!Number.isInteger(questionCount) || questionCount < 1)) {
      toast.error('Số câu hỏi phải là số nguyên ≥ 1.');
      return;
    }
    if (durationMinutes != null && (!Number.isInteger(durationMinutes) || durationMinutes < 1)) {
      toast.error('Thời gian làm bài phải là số nguyên ≥ 1 phút.');
      return;
    }

    const payload: AssessmentPayload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      subjectId: form.subjectId,
      gradeLevelId: form.gradeLevelId,
      questionCount,
      durationMinutes,
      shuffleQuestions: form.shuffleQuestions,
      shuffleOptions: form.shuffleOptions,
      showResult: form.showResult,
    };

    setSaving(true);
    try {
      const res = isEdit
        ? await updateAssessment(assessment!.id, payload)
        : await createAssessment(payload);
      toast.success(isEdit ? 'Đã cập nhật bộ đề.' : 'Đã tạo bộ đề.');
      onSaved(res.content);
    } catch {
      toast.error(isEdit ? 'Cập nhật bộ đề thất bại.' : 'Tạo bộ đề thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] sm:max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa bộ đề đánh giá' : 'Thêm bộ đề đánh giá'}</DialogTitle>
        </DialogHeader>

        <div className="@container/aform space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="assessment-title">
              Tên đề <span className="text-red-500">*</span>
            </Label>
            <Input
              id="assessment-title"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="VD: Đánh giá đầu vào Toán 9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assessment-desc">Mô tả</Label>
            <textarea
              id="assessment-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Học sinh thấy mô tả này trước khi bắt đầu làm bài."
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="grid gap-4 @sm/aform:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Môn <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.subjectId ? String(form.subjectId) : ''}
                onValueChange={(v) => set('subjectId', Number(v))}
                disabled={lookupLoading}
                items={subjects.map((s) => ({ value: String(s.subjectId), label: s.subjectName }))}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label>
                Khối lớp <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.gradeLevelId ? String(form.gradeLevelId) : ''}
                onValueChange={(v) => set('gradeLevelId', Number(v))}
                disabled={lookupLoading}
                items={grades.map((g) => ({ value: String(g.gradeLevelId), label: g.gradeName }))}
              >
                <SelectTrigger>
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
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-3 text-sm font-medium text-slate-700">Cấu hình làm bài</p>
            <div className="grid gap-4 @sm/aform:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assessment-qcount">Số câu</Label>
                <Input
                  id="assessment-qcount"
                  type="number"
                  min={1}
                  value={form.questionCount}
                  onChange={(e) => set('questionCount', e.target.value)}
                  placeholder="Tất cả"
                />
                <p className="text-xs text-slate-500">Bỏ trống = làm hết câu đã gán.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessment-duration">Thời gian (phút)</Label>
                <Input
                  id="assessment-duration"
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) => set('durationMinutes', e.target.value)}
                  placeholder="Không giới hạn"
                />
                <p className="text-xs text-slate-500">Bỏ trống = không giới hạn.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
              <CheckRow
                id="shuffle-questions"
                label="Trộn thứ tự câu hỏi"
                checked={form.shuffleQuestions}
                onChange={(v) => set('shuffleQuestions', v)}
              />
              <CheckRow
                id="shuffle-options"
                label="Trộn thứ tự phương án"
                checked={form.shuffleOptions}
                onChange={(v) => set('shuffleOptions', v)}
              />
              <CheckRow
                id="show-result"
                label="Cho học sinh xem điểm sau khi làm xong"
                checked={form.showResult}
                onChange={(v) => set('showResult', v)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo bộ đề'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CheckRow: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ id, label, checked, onChange }) => (
  <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 cursor-pointer accent-primary"
    />
    {label}
  </label>
);
