import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createQuestionType, updateQuestionType } from '../../../services/adminLookup.service';
import type { AdminQuestionType, QuestionTypePayload } from '../../../types/lookup.type';
import { apiErrorMessage } from '../../../utils/apiError';

interface Props {
  /** null = thêm mới. */
  questionType: AdminQuestionType | null;
  onClose: () => void;
  onSaved: () => void;
}

export const QuestionTypeFormModal: React.FC<Props> = ({ questionType, onClose, onSaved }) => {
  const isEdit = !!questionType;
  const [form, setForm] = useState({
    name: questionType?.name ?? '',
    slug: questionType?.slug ?? '',
    displayOrder: questionType?.displayOrder ?? 0,
    isActive: questionType?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên loại câu hỏi.');
      return;
    }
    setSaving(true);
    try {
      const payload: QuestionTypePayload = {
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        displayOrder: form.displayOrder,
        isActive: form.isActive,
      };
      if (isEdit) await updateQuestionType(questionType.id, payload);
      else await createQuestionType(payload);
      toast.success(isEdit ? 'Đã cập nhật loại câu hỏi.' : 'Đã thêm loại câu hỏi.');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, isEdit ? 'Cập nhật thất bại.' : 'Thêm loại câu hỏi thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa loại câu hỏi' : 'Thêm loại câu hỏi'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="qtype-name">
              Tên loại <span className="text-red-500">*</span>
            </Label>
            <Input
              id="qtype-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="vd: Trắc nghiệm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="qtype-slug">Slug</Label>
              <Input
                id="qtype-slug"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="Tự sinh nếu bỏ trống"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qtype-order">Thứ tự hiển thị</Label>
              <Input
                id="qtype-order"
                type="number"
                value={form.displayOrder}
                onChange={(e) => set('displayOrder', Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-md border p-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium">Đang hoạt động</span>
              <span className="block text-muted-foreground">
                Tắt để ẩn loại này khỏi bộ lọc và form câu hỏi.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm loại câu hỏi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
