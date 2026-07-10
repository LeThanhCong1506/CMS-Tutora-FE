import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FileText, Eye, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDocumentHistory } from '../../services/question.service';
import type { QuestionDocument } from '../../types/question.types';

interface Props {
  onClose: () => void;
}

const PAGE_SIZE = 10;

// Trạng thái của quá trình TRÍCH XUẤT PDF (không liên quan duyệt câu hỏi).
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  done: { label: 'Hoàn thành', cls: 'border-green-200 bg-green-50 text-green-700' },
  processing: { label: 'Đang xử lý', cls: 'border-blue-200 bg-blue-50 text-blue-700' },
  failed: { label: 'Thất bại', cls: 'border-red-200 bg-red-50 text-red-700' },
  completed: { label: 'Hoàn thành', cls: 'border-green-200 bg-green-50 text-green-700' },
};

const fmtDateTime = (s: string) => {
  const d = new Date(s);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: undefined,
  });
};

export const DocumentHistoryModal: React.FC<Props> = ({ onClose }) => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<QuestionDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    getDocumentHistory({ pageNumber: page, pageSize: PAGE_SIZE })
      .then((res) => {
        setDocs(res.content.items ?? []);
        setTotalPages(res.content.totalPages || 1);
      })
      .catch(() => toast.error('Không tải được lịch sử.'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-xl! overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/images/icons/icon_pdf.png" alt="logo pdf" className="size-6" />
            Lịch sử trích xuất PDF
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Chưa có lịch sử trích xuất PDF nào.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {docs.map((doc) => {
              const meta = STATUS_MAP[doc.status] ?? STATUS_MAP['processing'];

              return (
                <div key={doc.id} className="overflow-hidden rounded-md border transition-shadow hover:shadow-sm">
                  {/* Row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <img src="/images/icons/icon_pdf.png" alt="logo pdf" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{doc.fileName}</p>
                      <p className="text-xs text-slate-800">
                        {fmtDateTime(doc.createdAt)} · {doc.questionsExtracted} câu
                      </p>
                    </div>
                    <Badge variant="outline" className={meta.cls}>
                      {meta.label}
                    </Badge>
                    <Button
                      size="sm"
                      variant="green"
                      className="gap-1"
                      onClick={() => {
                        onClose();
                        navigate(`/admin-portal/question-bank/upload/${doc.id}`);
                      }}
                    >
                      <Eye className="size-3.5" />
                      Xem
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-sm text-slate-500">
                <span>
                  Trang {page}/{totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" /> Trước
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
