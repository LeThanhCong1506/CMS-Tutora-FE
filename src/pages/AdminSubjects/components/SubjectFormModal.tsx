import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createSubject,
  updateSubject,
  uploadSubjectIcon,
  getAdminGradeLevels,
} from '../../../services/adminLookup.service';
import type { AdminSubject, AdminGradeLevel, SubjectPayload } from '../../../types/lookup.type';
import { apiErrorMessage } from '../../../utils/apiError';

const UNLIMITED = 'unlimited';

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
    minGradeLevelId: subject?.minGradeLevelId ?? null as number | null,
    maxGradeLevelId: subject?.maxGradeLevelId ?? null as number | null,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gradeLevels, setGradeLevels] = useState<AdminGradeLevel[]>([]);

  useEffect(() => {
    getAdminGradeLevels()
      .then(setGradeLevels)
      .catch(() => toast.error('Không tải được danh sách khối lớp.'));
  }, []);

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
    // So theo levelOrder — id không đảm bảo tăng dần theo khối lớp.
    if (form.minGradeLevelId != null && form.maxGradeLevelId != null) {
      const minOrder = gradeLevels.find((g) => g.gradeLevelId === form.minGradeLevelId)?.levelOrder;
      const maxOrder = gradeLevels.find((g) => g.gradeLevelId === form.maxGradeLevelId)?.levelOrder;
      if (minOrder != null && maxOrder != null && maxOrder < minOrder) {
        toast.error('Khối lớp tối đa phải lớn hơn hoặc bằng khối lớp tối thiểu.');
        return;
      }
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
        minGradeLevelId: form.minGradeLevelId,
        maxGradeLevelId: form.maxGradeLevelId,
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
                onFocus={(e) => e.target.select()}
                onChange={(e) => set('displayOrder', Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Áp dụng từ khối</Label>
              <Select
                value={form.minGradeLevelId != null ? String(form.minGradeLevelId) : UNLIMITED}
                onValueChange={(v) => set('minGradeLevelId', v === UNLIMITED ? null : Number(v))}
                items={[
                  { value: UNLIMITED, label: 'Không giới hạn' },
                  ...gradeLevels.map((g) => ({ value: String(g.gradeLevelId), label: g.gradeName })),
                ]}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Không giới hạn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNLIMITED}>Không giới hạn</SelectItem>
                  {gradeLevels.map((g) => (
                    <SelectItem key={g.gradeLevelId} value={String(g.gradeLevelId)}>
                      {g.gradeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Đến khối</Label>
              <Select
                value={form.maxGradeLevelId != null ? String(form.maxGradeLevelId) : UNLIMITED}
                onValueChange={(v) => set('maxGradeLevelId', v === UNLIMITED ? null : Number(v))}
                items={[
                  { value: UNLIMITED, label: 'Không giới hạn' },
                  ...gradeLevels.map((g) => ({ value: String(g.gradeLevelId), label: g.gradeName })),
                ]}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Không giới hạn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNLIMITED}>Không giới hạn</SelectItem>
                  {gradeLevels.map((g) => (
                    <SelectItem key={g.gradeLevelId} value={String(g.gradeLevelId)}>
                      {g.gradeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Giới hạn khối lớp tutor được chọn khi khai báo môn dạy. Để "Không giới hạn" nếu môn áp
            dụng cho mọi khối (vd Toán, Tiếng Anh).
          </p>

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
