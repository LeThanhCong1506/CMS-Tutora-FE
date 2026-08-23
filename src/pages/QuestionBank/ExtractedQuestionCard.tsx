import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Check, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import katexModule from 'katex';
import 'katex/dist/katex.min.css';
import { updateQuestion, deleteQuestion } from '../../services/question.service';
import type { Question, UpdateQuestionPayload } from '../../types/question.types';
import { apiErrorMessage } from '../../utils/apiError';

const katex = katexModule;

interface Props {
  question: Question;
  index: number;
  onRemoved: (id: string) => void;
  /** Gọi khi bấm nút Chỉnh sửa */
  onEdit?: () => void;
}

const renderHtmlWithMath = (html?: string) => {
  if (!html) return { __html: '' };
  
  const parsed = html.replace(/\$\$(.*?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: true, throwOnError: false });
    } catch { return `$$${math}$$`; }
  }).replace(/\$(.*?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math, { displayMode: false, throwOnError: false });
    } catch { return `$${math}$`; }
  });
  
  return { __html: parsed };
};

/** 1 câu extract — hiển thị MathText, Lưu hoặc Duyệt từng câu. */
export const ExtractedQuestionCard: React.FC<Props> = ({ question, index, onRemoved, onEdit }) => {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'published' | null>(null);

  const save = async (publish: boolean) => {
    setBusy(true);
    try {
      const payload: UpdateQuestionPayload = {
        subjectId: question.subjectId,
        gradeLevelId: question.gradeLevelId,
        chapterId: question.chapterId,
        questionTypeId: question.questionTypeId,
        difficulty: question.difficulty,
        content: question.content,
        solution: question.solution,
        solutionSource: question.solutionSource,
        reviewStatus: publish ? 'published' : 'pending_review',
      };
      await updateQuestion(question.id, payload);
      if (publish) {
        setDone('published');
        toast.success(`Câu ${index + 1} đã duyệt.`);
      } else {
        toast.success(`Câu ${index + 1} đã lưu.`);
      }
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Lưu thất bại.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Xoá câu này?')) return;
    setBusy(true);
    try {
      await deleteQuestion(question.id);
      onRemoved(question.id);
      toast.success(`Đã xoá câu ${index + 1}.`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Xoá thất bại.'));
      setBusy(false);
    }
  };

  if (done === 'published') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        <Check className="size-4" /> Câu {index + 1} đã được duyệt (published).
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Câu {index + 1}</span>
          {question.questionTypeName && (
            <Badge variant="secondary" className="font-normal">
              {question.questionTypeName}
            </Badge>
          )}
          {question.chapterName && (
            <Badge variant="outline" className="font-normal">
              {question.chapterName}
            </Badge>
          )}
          {question.sourcePage && (
            <span className="text-xs text-slate-400">trang {question.sourcePage}</span>
          )}
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit} disabled={busy}>
              <Edit3 className="size-3.5 mr-1" /> Chỉnh sửa
            </Button>
          )}
        </div>
      </div>

      <div className="mb-2">
        <label className="mb-1 block text-xs font-medium text-slate-500">Đề bài</label>
        <div
          className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={renderHtmlWithMath(question.content)}
        />
      </div>

      {question.imageUrls?.length > 0 && (
        <div className="mb-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Hình ảnh ({question.imageUrls.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {question.imageUrls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-lg border bg-white transition hover:shadow-md"
              >
                <img
                  src={url}
                  alt={`Hình ${i + 1}`}
                  className="max-h-48 w-auto object-contain transition group-hover:scale-[1.02]"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {question.solution && (
        <div className="mb-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Lời giải</label>
          <div 
            className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={renderHtmlWithMath(question.solution)}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
          <Button size="sm" variant="urgent" onClick={remove} disabled={busy}>
            <Trash2 className="size-4" />
          </Button>
          <Button size="sm" variant="drag" onClick={() => save(false)} disabled={busy}>
            Lưu
          </Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => save(true)}
            disabled={busy}
          >
            Duyệt
          </Button>
        </div>
    </div>
  );
};
