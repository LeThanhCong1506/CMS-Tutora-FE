/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { ArrowLeft, FileUp, Loader2, XCircle, GripVertical, History, X } from 'lucide-react';
import { PageContainer } from '../../components/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLookup } from '../../hooks/useLookup';
import { uploadQuestionPdf, getDocumentById } from '../../services/question.service';
import type { Question } from '../../types/question.types';
import { ExtractedQuestionCard } from './ExtractedQuestionCard';
import { DocumentHistoryModal } from './DocumentHistoryModal';
import { QuestionFormModal } from '../../components/QuestionForm/QuestionFormModal';
import { apiErrorMessage } from '../../utils/apiError';

type Stage = 'idle' | 'ready' | 'uploading' | 'done' | 'failed';

const UploadPdfPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { subjects, grades } = useLookup();
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<number>(0);
  const [gradeLevelId, setGradeLevelId] = useState<number>(0);
  const [stage, setStage] = useState<Stage>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // môn mặc định Toán nếu có (subjectName chứa "Toán").
  useEffect(() => {
    if (!subjectId && subjects.length) {
      const toan = subjects.find((s) => s.subjectName.includes('Toán'));
      setSubjectId(toan?.subjectId ?? subjects[0].subjectId);
    }
  }, [subjects, subjectId]);

  useEffect(() => {
    if (!file) {
      setPdfUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Handle detail view by ID
  useEffect(() => {
    if (!id) return;
    setStage('uploading');
    
    getDocumentById(id)
      .then((res) => {
        setQuestions(res.content.questions ?? []);
        setPdfUrl(res.content.fileUrl);
        setStage('done');
      })
      .catch(() => {
        toast.error('Không tải được chi tiết PDF.');
        setStage('failed');
      });
  }, [id]);

  const pickFile = useCallback((f: File | undefined) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Chỉ nhận file PDF.');
      return;
    }
    setFile(f);
    setStage('ready');
    setQuestions([]);
    setErrorMsg('');
  }, []);

  const resetFile = useCallback(() => {
    setFile(null);
    setStage('idle');
    setQuestions([]);
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const process = async () => {
    if (!file) return;
    if (!gradeLevelId) {
      toast.error('Vui lòng chọn khối lớp.');
      return;
    }
    setStage('uploading');
    setErrorMsg('');
    try {
      const res = await uploadQuestionPdf(file, subjectId, gradeLevelId);
      setQuestions(res.content.questions ?? []);
      setStage('done');
      toast.success(res.message || 'Xử lý PDF thành công.');
    } catch (err) {
      const msg = apiErrorMessage(err, 'Xử lý PDF thất bại.');
      setErrorMsg(msg);
      setStage('failed');
      toast.error(msg);
    }
  };

  const busy = stage === 'uploading';

  return (
    <PageContainer
      title={id ? "Chi tiết truy xuất PDF" : "Thêm câu hỏi từ PDF"}
      subtitle={id ? "Xem chi tiết PDF và danh sách câu hỏi" : "Tải lên PDF (≤20 trang) và phân tách thành câu hỏi. Sửa & duyệt trực tiếp."}
      maxWidth="wide"
      headerAction={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History className="size-4" /> Lịch sử
          </Button>
          <Button variant="back" onClick={() => navigate('/admin-portal/question-bank')}>
            <ArrowLeft className="size-4" /> Về danh sách
          </Button>
        </div>
      }
    >
      {/* config bar */}
      {!id && (
        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="grid gap-1.5">
            <Label>Môn</Label>
            <Select
              value={subjectId ? String(subjectId) : ''}
              onValueChange={(v) => setSubjectId(Number(v))}
              items={subjects.map((s) => ({ value: String(s.subjectId), label: s.subjectName }))}
            >
              <SelectTrigger className="w-40">
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
          <div className="grid gap-1.5">
            <Label>Khối lớp *</Label>
            <Select
              value={gradeLevelId ? String(gradeLevelId) : ''}
              onValueChange={(v) => setGradeLevelId(Number(v))}
              items={grades.map((g) => ({ value: String(g.gradeLevelId), label: g.gradeName }))}
            >
              <SelectTrigger className="w-40">
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
          <div className="ml-auto">
            <Button onClick={process} disabled={!file || busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              {busy ? 'Đang xử lý...' : 'Bắt đầu xử lý'}
            </Button>
          </div>
        </div>
      )}

      {/* 2-panel resizable — cao ngay từ đầu để không bị bóp nhỏ */}
      <PanelGroup orientation="horizontal" className="h-[calc(100vh-16rem)] min-h-140 rounded-xl border bg-white shadow-sm">
        {/* LEFT: PDF */}
        <Panel defaultSize={50} minSize={25}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-medium text-slate-600">
              <span className="truncate">{file ? file.name : 'Chưa chọn file'}</span>
              {file && !id && stage !== 'uploading' && (
                <Button
                  size="sm"
                  variant="urgent"
                  className="h-7 shrink-0 gap-1 px-2"
                  onClick={resetFile}
                >
                  <X className="size-3.5" /> Huỷ
                </Button>
              )}
            </div>
            {pdfUrl ? (
              <iframe title="pdf-preview" src={pdfUrl} className="flex-1" />
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className="m-4 flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 transition hover:border-primary/40 hover:bg-slate-50"
              >
                <img src="/images/icons/icon_pdf.png" alt="PDF" className="size-20 opacity-90" />
                <div className="text-center">
                  <p className="text-base font-medium text-slate-600">Kéo thả PDF vào đây</p>
                  <p className="mt-1 text-sm text-slate-400">hoặc bấm để chọn file (≤20 trang)</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </div>
            )}
          </div>
        </Panel>

        <PanelResizeHandle className="group flex w-2 items-center justify-center bg-slate-100 hover:bg-slate-200">
          <GripVertical className="size-4 text-slate-400" />
        </PanelResizeHandle>

        {/* RIGHT: câu hỏi / state */}
        <Panel defaultSize={50} minSize={30}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-medium text-slate-600">
              <span>Câu hỏi trích xuất {questions.length > 0 && `(${questions.length})`}</span>
              {stage === 'done' && (
                <Button size="sm" variant="ghost" onClick={() => navigate('/admin-portal/question-bank')}>
                  Xem tất cả
                </Button>
              )}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {stage === 'idle' && <Hint text="Chọn file PDF ở bên trái để bắt đầu." />}
              {stage === 'ready' && <Hint text="Chọn khối lớp rồi bấm 'Bắt đầu xử lý'." />}
              {stage === 'uploading' && (
                <div className="flex h-full flex-col items-center justify-center gap-5 text-slate-500">
                  <img src="/images/loading/scan_pdf.svg" alt="Đang quét" className="size-40" />
                  <div className="max-w-xs text-center">
                    <p className="text-base font-medium text-slate-700">Đang trích xuất câu hỏi…</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Quá trình này có thể mất một chút thời gian. Chúng tôi sẽ thông báo cho bạn ngay khi hoàn thành.
                    </p>
                  </div>
                </div>
              )}
              {stage === 'failed' && (
                <div className="flex flex-col items-center gap-3 pt-10 text-red-500">
                  <XCircle className="size-8" />
                  <p className="text-sm">{errorMsg}</p>
                  <Button variant="outline" size="sm" onClick={process}>
                    Thử lại
                  </Button>
                </div>
              )}
              {stage === 'done' &&
                (questions.length === 0 ? (
                  <Hint text="Không tách được câu hỏi nào từ PDF." />
                ) : (
                  questions.map((q, i) => (
                    <ExtractedQuestionCard
                      key={q.id}
                      index={i}
                      question={q}
                      onEdit={() => setEditingQuestion(q)}
                      onRemoved={(qId) => setQuestions((qs) => qs.filter((x) => x.id !== qId))}
                    />
                  ))
                ))}
            </div>
          </div>
        </Panel>
      </PanelGroup>

      {showHistory && <DocumentHistoryModal onClose={() => setShowHistory(false)} />}
      
      {editingQuestion && (
        <QuestionFormModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => {
            // refresh data after save if in detail mode, or we can just refetch getDocumentById
            if (id) {
              getDocumentById(id).then((res) => {
                setQuestions(res.content.questions ?? []);
              });
            } else {
              // Note: if editing a newly extracted but not-yet-saved-to-document question, 
              // we might need to manually update it in the local state, but they are already saved to DB.
              // We can refetch by sourceDocumentId if we tracked it, but simple approach is to update local state from the form.
              // For now, since they are saved to DB, updating local state is easiest.
              // To be safe, we just close it and let user know. 
              // A better way is to pass back the updated question from onSaved, but let's just close for now.
              // Wait, we need the updated data. Let's just refetch if we have the sourceDocumentId.
              const docId = questions[0]?.sourceDocumentId;
              if (docId) {
                getDocumentById(docId).then((res) => {
                  setQuestions(res.content.questions ?? []);
                });
              }
            }
            setEditingQuestion(null);
          }}
        />
      )}
    </PageContainer>
  );
};

const Hint: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
    {text}
  </div>
);

export default UploadPdfPage;
