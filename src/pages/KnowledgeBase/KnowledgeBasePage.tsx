/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { PageContainer, ConfirmDialog } from '../../components/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAccess } from '../../contexts/AccessContext';
import {
  getKbDocuments,
  getKbDocumentDetail,
  updateKbDocumentContent,
  uploadKbDocument,
  deleteKbDocument,
} from '../../services/knowledgeBase.service';
import type { KbDocument, KbDocumentDetail } from '../../types/knowledgeBase.types';

const ACCEPT = '.pdf,.docx,.xlsx,.md,.markdown';
const ACCEPT_EXT = ['.pdf', '.docx', '.xlsx', '.md', '.markdown'];
const MAX_MB = 20;

const STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ready: { label: 'Sẵn sàng', variant: 'default' },
  processing: { label: 'Đang xử lý', variant: 'secondary' },
  failed: { label: 'Lỗi', variant: 'destructive' },
};

// Nhãn tiếng Việt cho loại nguồn tài liệu.
const SOURCE_TYPE_LABEL: Record<string, string> = {
  pdf: 'PDF',
  docx: 'Word',
  xlsx: 'Excel',
  md: 'Markdown',
  manual: 'Viết tay',
};

const sourceTypeLabel = (t: string) => SOURCE_TYPE_LABEL[t?.toLowerCase()] ?? t;

const KnowledgeBasePage: React.FC = () => {
  const { can } = useAccess();
  const [docs, setDocs] = useState<KbDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState<KbDocument | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [viewing, setViewing] = useState<KbDocument | null>(null);
  const [detail, setDetail] = useState<KbDocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canUpload = can('knowledge_base.upload');
  const canDelete = can('knowledge_base.delete');

  const openViewer = useCallback(async (doc: KbDocument) => {
    setViewing(doc);
    setDetail(null);
    setEditMode(false);
    setDetailLoading(true);
    try {
      setDetail(await getKbDocumentDetail(doc.id));
    } catch {
      toast.error('Không tải được nội dung tài liệu.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const startEdit = () => {
    setEditText(detail?.content ?? '');
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!viewing) return;
    if (!editText.trim()) {
      toast.error('Nội dung không được để trống.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateKbDocumentContent(viewing.id, editText);
      setDetail(updated);
      setEditMode(false);
      toast.success('Đã cập nhật nội dung tài liệu.');
      fetchDocs(); // số đoạn / loại có thể đổi
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Cập nhật thất bại.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const fetchDocs = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      setDocs(await getKbDocuments(signal));
    } catch (err) {
      if (!(err instanceof Error && err.name === 'CanceledError'))
        toast.error('Không tải được danh sách tài liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchDocs(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchDocs]);

  const pickFile = useCallback((f: File | undefined) => {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPT_EXT.includes(ext)) {
      toast.error('Chỉ nhận file PDF, DOCX, XLSX hoặc Markdown (.md).');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`File quá lớn (giới hạn ${MAX_MB}MB).`);
      return;
    }
    setFile(f);
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadKbDocument(file);
      toast.success(res.message || 'Đã nạp tài liệu vào Knowledge Base.');
      clearFile();
      fetchDocs();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Nạp tài liệu thất bại.';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteKbDocument(deleting.id);
      toast.success('Đã xoá tài liệu.');
      setDeleting(null);
      fetchDocs();
    } catch {
      toast.error('Xoá thất bại.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <PageContainer
      title="Cơ sở tri thức"
      subtitle="Nạp nội dung, chính sách Tutora (PDF, DOCX, XLSX, Markdown) để trợ lý trả lời câu hỏi thường gặp."
      maxWidth="wide"
    >
      {/* Dropzone upload */}
      {canUpload && (
        <div className="mb-6 rounded-xl border bg-white p-4">
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-slate-400 transition ${
                dragging
                  ? 'border-primary/50 bg-primary/5 text-primary'
                  : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'
              }`}
            >
              <UploadCloud className="size-9" />
              <p className="text-base font-medium text-slate-600">Kéo thả tài liệu vào đây</p>
              <p className="text-sm text-slate-400">
                hoặc bấm để chọn file — PDF, DOCX, XLSX, Markdown (≤{MAX_MB}MB)
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <FileText className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                {file.name}
              </span>
              <span className="text-xs text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
              <Button variant="outline" size="sm" onClick={clearFile} disabled={uploading}>
                <X className="size-4" /> Bỏ chọn
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UploadCloud className="size-4" />
                )}
                {uploading ? 'Đang nạp...' : 'Nạp vào Knowledge Base'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bảng tài liệu */}
      <div className="rounded-xl border bg-white p-4">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>Tài liệu</TableHead>
            <TableHead className="w-28">Loại</TableHead>
            <TableHead className="w-24 text-center">Số đoạn</TableHead>
            <TableHead className="w-32">Trạng thái</TableHead>
            <TableHead className="w-40">Ngày nạp</TableHead>
            {canDelete && <TableHead className="w-24 text-center">Thao tác</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={canDelete ? 6 : 5}>
                  <div className="h-5 w-full animate-pulse rounded bg-slate-100" />
                </TableCell>
              </TableRow>
            ))
          ) : docs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canDelete ? 6 : 5}
                className="py-10 text-center text-slate-400"
              >
                Chưa có tài liệu nào. Nạp tài liệu đầu tiên để bắt đầu.
              </TableCell>
            </TableRow>
          ) : (
            docs.map((d) => {
              const st = STATUS[d.status] ?? { label: d.status, variant: 'outline' as const };
              return (
                <TableRow
                  key={d.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => openViewer(d)}
                >
                  <TableCell className="font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-slate-400" />
                      <span className="truncate">{d.fileName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">{sourceTypeLabel(d.sourceType)}</TableCell>
                  <TableCell className="text-center text-slate-600">{d.chunkCount}</TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </TableCell>
                  {canDelete && (
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-sm text-red-600 hover:text-red-600"
                        onClick={() => setDeleting(d)}
                      >
                        Xoá
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>

      {/* Modal xem nội dung tài liệu — kiểu trang giấy đọc */}
      <Dialog open={!!viewing} onOpenChange={(next) => !next && setViewing(null)}>
        <DialogContent
          style={{ maxWidth: '48rem', width: 'calc(100% - 2rem)' }}
          className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0"
        >
          {/* Header: metadata + nút Sửa/Lưu */}
          <DialogHeader className="shrink-0 border-b bg-white px-6 py-4 pr-14 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                  <FileText className="size-4 shrink-0 text-slate-400" />
                  <span className="truncate">{viewing?.fileName}</span>
                </DialogTitle>
                {viewing && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black">
                    <span>{sourceTypeLabel(detail?.sourceType ?? viewing.sourceType)}</span>
                    <span className="text-slate-300">•</span>
                    <span>{detail?.chunkCount ?? viewing.chunkCount} đoạn</span>
                    {viewing.createdAt && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>Nạp ngày {new Date(viewing.createdAt).toLocaleDateString('vi-VN')}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              {canUpload && !detailLoading && (
                <div className="flex shrink-0 gap-2">
                  {editMode ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditMode(false)} disabled={saving}>
                        Huỷ
                      </Button>
                      <Button size="sm" onClick={saveEdit} disabled={saving}>
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        {saving ? 'Đang lưu...' : 'Lưu'}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={startEdit}>
                      Sửa nội dung
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Thân: đọc hoặc sửa (textarea) */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-5">
            {detailLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
                <Loader2 className="size-4 animate-spin" /> Đang tải nội dung...
              </div>
            ) : editMode ? (
              <>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  disabled={saving}
                  placeholder="Nhập nội dung tài liệu..."
                  className="min-h-[50vh] w-full resize-none text-sm leading-6"
                />
                <p className="mt-2 text-xs text-black">
                  Lưu ý: sửa nội dung sẽ cần tốn thời gian để cập nhật cho AI học — mất vài giây.
                </p>
              </>
            ) : detail?.content ? (
              <div className="text-[15px] leading-7 whitespace-pre-wrap wrap-break-word text-slate-700">
                {detail.content}
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-slate-400">
                Tài liệu này chưa có nội dung text để hiển thị.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title="Xoá tài liệu?"
        description={
          <>
            Xoá <strong>{deleting?.fileName}</strong> khỏi Knowledge Base. Toàn bộ đoạn đã nạp của
            tài liệu này sẽ bị gỡ và trợ lý sẽ không còn dùng nội dung đó. Không thể hoàn tác.
          </>
        }
        destructive
        busy={deleteBusy}
        confirmLabel="Xoá"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </PageContainer>
  );
};

export default KnowledgeBasePage;
