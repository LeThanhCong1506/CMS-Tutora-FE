import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createSubject, updateSubject, uploadSubjectIcon } from '../../../services/adminLookup.service';
import type { AdminSubject, SubjectPayload } from '../../../types/lookup.type';
import { apiErrorMessage } from '../../../utils/apiError';

const MAX_ICON_BYTES = 2 * 1024 * 1024;

interface Props {
  /** null = thêm mới. */
  subject: AdminSubject | null;
  onClose: () => void;
  onSaved: () => void;
}

export const SubjectFormModal: React.FC<Props> = ({ subject, onClose, onSaved }) => {
  const isEdit = !!subject;
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    subjectName: subject?.subjectName ?? '',
    slug: subject?.slug ?? '',
    iconUrl: subject?.iconUrl ?? '',
    description: subject?.description ?? '',
    displayOrder: subject?.displayOrder ?? 0,
    isHomeworkEnabled: subject?.isHomeworkEnabled ?? false,
    isActive: subject?.isActive ?? true,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pickIcon = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file hình ảnh.');
      return;
    }
    if (file.size > MAX_ICON_BYTES) {
      toast.error('Ảnh vượt quá 2MB.');
      return;
    }
    setUploading(true);
    try {
      set('iconUrl', await uploadSubjectIcon(file));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Tải icon lên thất bại.'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!form.subjectName.trim()) {
      toast.error('Vui lòng nhập tên môn học.');
      return;
    }
    setSaving(true);
    try {
      // slug bỏ trống -> BE tự sinh từ tên môn.
      const payload: SubjectPayload = {
        subjectName: form.subjectName.trim(),
        slug: form.slug.trim() || null,
        iconUrl: form.iconUrl.trim() || null,
        description: form.description.trim() || null,
        displayOrder: form.displayOrder,
        isHomeworkEnabled: form.isHomeworkEnabled,
        isActive: form.isActive,
      };
      if (isEdit) await updateSubject(subject.subjectId, payload);
      else await createSubject(payload);
      toast.success(isEdit ? 'Đã cập nhật môn học.' : 'Đã thêm môn học.');
      onSaved();
    } catch (err) {
      toast.error(apiErrorMessage(err, isEdit ? 'Cập nhật thất bại.' : 'Thêm môn học thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa môn học' : 'Thêm môn học'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Icon môn học</Label>
            <div className="flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
                {form.iconUrl ? (
                  <img src={form.iconUrl} alt="" className="size-full object-contain" />
                ) : (
                  <ImagePlus className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void pickIcon(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                  {uploading ? 'Đang tải...' : form.iconUrl ? 'Đổi icon' : 'Tải icon lên'}
                </Button>
                {form.iconUrl && !uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Gỡ icon"
                    onClick={() => set('iconUrl', '')}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">PNG/SVG nền trong suốt, tối đa 2MB.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="subject-name">
              Tên môn học <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject-name"
              value={form.subjectName}
              onChange={(e) => set('subjectName', e.target.value)}
              placeholder="vd: Toán học"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="subject-slug">Slug</Label>
              <Input
                id="subject-slug"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="Tự sinh nếu bỏ trống"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="subject-order">Thứ tự hiển thị</Label>
              <Input
                id="subject-order"
                type="number"
                value={form.displayOrder}
                onChange={(e) => set('displayOrder', Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="subject-desc">Mô tả</Label>
            <Textarea
              id="subject-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              placeholder="Mô tả ngắn về môn học"
            />
          </div>

          <label className="flex items-start gap-2.5 rounded-md border p-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={form.isHomeworkEnabled}
              onChange={(e) => set('isHomeworkEnabled', e.target.checked)}
            />
            <span className="text-sm">
              <span className="font-medium">Bật giải bài tập</span>
              <span className="block text-muted-foreground">
                Cho phép học sinh dùng tính năng AI giải bài tập với môn này.
              </span>
            </span>
          </label>

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
                Tắt để ẩn môn khỏi các lựa chọn mới. Dữ liệu cũ được giữ nguyên.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={submit} disabled={saving || uploading}>
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm môn học'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
