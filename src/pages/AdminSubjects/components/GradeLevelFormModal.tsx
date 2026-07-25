import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGradeLevel, updateGradeLevel } from '../../../services/adminLookup.service';
import type { AdminGradeLevel, GradeLevelPayload } from '../../../types/lookup.type';
import { apiErrorMessage } from '../../../utils/apiError';

interface Props {
  /** null = thêm mới. */
  grade: AdminGradeLevel | null;
  /** levelOrder gợi ý cho bản ghi mới (max hiện có + 1). */
  nextLevelOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

export const GradeLevelFormModal: React.FC<Props> = ({
  grade,
  nextLevelOrder,
  onClose,
  onSaved,
}) => {
  const isEdit = !!grade;
  const [form, setForm] = useState({
    gradeName: grade?.gradeName ?? '',
    levelOrder: grade?.levelOrder ?? nextLevelOrder,
    isActive: grade?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.gradeName.trim()) {
      toast.error('Vui lòng nhập tên khối lớp.');
      return;
    }
    setSaving(true);
    try {
      const payload: GradeLevelPayload = {
        gradeName: form.gradeName.trim(),
        levelOrder: form.levelOrder,
        isActive: form.isActive,
      };
      if (isEdit) await updateGradeLevel(grade.gradeLevelId, payload);
      else await createGradeLevel(payload);
      toast.success(isEdit ? 'Đã cập nhật khối lớp.' : 'Đã thêm khối lớp.');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, isEdit ? 'Cập nhật thất bại.' : 'Thêm khối lớp thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa khối lớp' : 'Thêm khối lớp'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="grade-name">
              Tên khối lớp <span className="text-red-500">*</span>
            </Label>
            <Input
              id="grade-name"
              value={form.gradeName}
              onChange={(e) => set('gradeName', e.target.value)}
              placeholder="vd: Lớp 10"
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="grade-order">Thứ tự</Label>
            <Input
              id="grade-order"
              type="number"
              value={form.levelOrder}
              onChange={(e) => set('levelOrder', Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Dùng để sắp xếp từ lớp nhỏ đến lớp lớn.</p>
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
                Tắt để ẩn khối lớp khỏi các lựa chọn mới. Dữ liệu cũ được giữ nguyên.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm khối lớp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
