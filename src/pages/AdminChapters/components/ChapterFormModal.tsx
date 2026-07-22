import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createChapter, updateChapter } from '../../../services/adminLookup.service';
import type {
  AdminChapter,
  AdminSubject,
  AdminGradeLevel,
  ChapterPayload,
} from '../../../types/lookup.type';
import { apiErrorMessage } from '../../../utils/apiError';

interface Props {
  chapter: AdminChapter | null;
  subjects: AdminSubject[];
  grades: AdminGradeLevel[];
  /** Môn/khối đang lọc — dùng làm mặc định khi thêm mới. */
  defaultSubjectId?: number;
  defaultGradeLevelId?: number;
  onClose: () => void;
  onSaved: () => void;
}

export const ChapterFormModal: React.FC<Props> = ({
  chapter,
  subjects,
  grades,
  defaultSubjectId,
  defaultGradeLevelId,
  onClose,
  onSaved,
}) => {
  const isEdit = !!chapter;
  const [form, setForm] = useState({
    subjectId: chapter?.subjectId ?? defaultSubjectId ?? 0,
    gradeLevelId: chapter?.gradeLevelId ?? defaultGradeLevelId ?? 0,
    name: chapter?.name ?? '',
    slug: chapter?.slug ?? '',
    displayOrder: chapter?.displayOrder ?? 0,
    isActive: chapter?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.subjectId || !form.gradeLevelId) {
      toast.error('Vui lòng chọn môn học và khối lớp.');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Vui lòng nhập tên chương.');
      return;
    }
    setSaving(true);
    try {
      // slug bỏ trống -> BE tự sinh từ tên chương.
      const payload: ChapterPayload = {
        subjectId: form.subjectId,
        gradeLevelId: form.gradeLevelId,
        name: form.name.trim(),
        slug: form.slug.trim() || null,
        displayOrder: form.displayOrder,
        isActive: form.isActive,
      };
      if (isEdit) await updateChapter(chapter.id, payload);
      else await createChapter(payload);
      toast.success(isEdit ? 'Đã cập nhật chương.' : 'Đã thêm chương.');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, isEdit ? 'Cập nhật thất bại.' : 'Thêm chương thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa chương' : 'Thêm chương'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>
                Môn học <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.subjectId ? String(form.subjectId) : ''}
                onValueChange={(v) => set('subjectId', Number(v))}
                items={subjects.map((s) => ({
                  value: String(s.subjectId),
                  label: s.isActive ? s.subjectName : `${s.subjectName} (ngừng dùng)`,
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn môn" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.subjectId} value={String(s.subjectId)}>
                      {s.subjectName}
                      {!s.isActive && ' (ngừng dùng)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>
                Khối lớp <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.gradeLevelId ? String(form.gradeLevelId) : ''}
                onValueChange={(v) => set('gradeLevelId', Number(v))}
                items={grades.map((g) => ({
                  value: String(g.gradeLevelId),
                  label: g.isActive ? g.gradeName : `${g.gradeName} (ngừng dùng)`,
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khối" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.gradeLevelId} value={String(g.gradeLevelId)}>
                      {g.gradeName}
                      {!g.isActive && ' (ngừng dùng)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="chapter-name">
              Tên chương <span className="text-red-500">*</span>
            </Label>
            <Input
              id="chapter-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="vd: Ứng dụng đạo hàm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="chapter-slug">Slug</Label>
              <Input
                id="chapter-slug"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="Tự sinh nếu bỏ trống"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="chapter-order">Thứ tự hiển thị</Label>
              <Input
                id="chapter-order"
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
                Tắt để ẩn chương khỏi bộ lọc và form câu hỏi.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm chương'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
