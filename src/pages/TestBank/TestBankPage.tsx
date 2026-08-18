import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Plus, Search, ChevronDown, ArrowUpDown, X } from 'lucide-react';
import { PageContainer, TablePagination } from '../../components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { scrollToTop } from '../../utils/scrollToTop';
import { MathText } from '../../components/MathText/MathText';
import { getQuestions, updateQuestion, deleteQuestion } from '../../services/question.service';
import { useLookup } from '../../hooks/useLookup';
import { getChapters } from '../../services/lookup.service';
import { useAccess } from '../../contexts/AccessContext';
import {
  type Question,
  type ReviewStatus,
  type Difficulty,
  type QuestionSortBy,
  type SortDir,
  type UpdateQuestionPayload,
  DIFFICULTY_LABEL,
} from '../../types/question.types';
import type { Chapter } from '../../types/lookup.type';
import { PAGE_SIZE } from '../../constants/questions';
import { TestQuestionFormModal } from '../../components/TestQuestionForm/TestQuestionFormModal';

// 2 tabs, giống Ngân hàng câu hỏi.
const STATUS_TABS: { key: ReviewStatus; label: string }[] = [
  { key: 'published', label: 'Đã duyệt' },
  { key: 'pending_review', label: 'Chờ duyệt' },
];

const STATUS_META: Record<ReviewStatus, { label: string; cls: string }> = {
  pending_review: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  published: { label: 'Đã duyệt', cls: 'bg-green-100 text-green-800 hover:bg-green-100' },
  rejected: { label: 'Từ chối', cls: 'bg-red-100 text-red-800 hover:bg-red-100' },
};

const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_LABEL) as [Difficulty, string][];

const SORT_OPTIONS: { key: QuestionSortBy; label: string }[] = [
  { key: 'updatedAt', label: 'Ngày cập nhật' },
  { key: 'gradeLevel', label: 'Lớp' },
  { key: 'createdAt', label: 'Ngày tạo' },
];

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/**
 * Ngân hàng kiểm tra — CÙNG bảng `questions` với Ngân hàng câu hỏi (AI Homework/RAG), chỉ
 * lọc cứng answerFormat='mc' — câu trắc nghiệm soạn tay có đáp án đúng + giải thích, dùng
 * cho bài test/luyện tập, KHÔNG dùng lời giải tự luận.
 */
const TestBankPage: React.FC = () => {
  const { can } = useAccess();
  const { subjects, grades } = useLookup();

  const [statusTab, setStatusTab] = useState<ReviewStatus>('published');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [gradeLevelId, setGradeLevelId] = useState<number | undefined>();
  const [chapterIds, setChapterIds] = useState<number[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [sortBy, setSortBy] = useState<QuestionSortBy>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [chapters, setChapters] = useState<Chapter[]>([]);

  const [data, setData] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [creating, setCreating] = useState(false);

  const resetPage = () => setPage(1);

  useEffect(() => {
    if (!subjectId || !gradeLevelId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChapters([]);
      return;
    }
    let alive = true;
    getChapters(subjectId, gradeLevelId)
      .then((c) => alive && setChapters(c))
      .catch(() => alive && setChapters([]));
    return () => {
      alive = false;
    };
  }, [subjectId, gradeLevelId]);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const res = await getQuestions(
          {
            pageNumber: page,
            pageSize: PAGE_SIZE,
            reviewStatus: statusTab,
            search: search.trim() || undefined,
            subjectId,
            gradeLevelId,
            chapterIds: chapterIds.length ? chapterIds.join(',') : undefined,
            difficulties: difficulties.length ? difficulties.join(',') : undefined,
            answerFormat: 'mc',
            sortBy,
            sortDir,
          },
          signal,
        );
        setData(res.content.items ?? []);
        setTotal(res.content.totalCount ?? 0);
      } catch (err) {
        if (!(err instanceof Error && err.name === 'CanceledError')) {
          toast.error('Không tải được danh sách câu hỏi.');
        }
      } finally {
        setLoading(false);
      }
    },
    [page, statusTab, search, subjectId, gradeLevelId, chapterIds, difficulties, sortBy, sortDir],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchData]);

  // Giữ nguyên đáp án/giải thích hiện có khi chỉ đổi trạng thái duyệt — nếu không gửi lại,
  // BE sẽ ghi đè các field đó về null (Update thay toàn bộ, không patch từng phần).
  const changeStatus = async (q: Question, reviewStatus: ReviewStatus) => {
    try {
      const payload: UpdateQuestionPayload = {
        subjectId: q.subjectId,
        gradeLevelId: q.gradeLevelId,
        chapterId: q.chapterId,
        questionTypeId: q.questionTypeId,
        difficulty: q.difficulty,
        content: q.content,
        answerFormat: q.answerFormat,
        answerOptions: q.answerOptions,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        reviewStatus,
      };
      await updateQuestion(q.id, payload);
      toast.success('Đã cập nhật trạng thái.');
      fetchData();
    } catch {
      toast.error('Cập nhật thất bại.');
    }
  };

  const handleDelete = async (q: Question) => {
    if (!window.confirm('Xoá câu hỏi này?')) return;
    try {
      await deleteQuestion(q.id);
      toast.success('Đã xoá câu hỏi.');
      fetchData();
    } catch {
      toast.error('Xoá thất bại.');
    }
  };

  const toggleChapter = (id: number) => {
    setChapterIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    resetPage();
  };

  const toggleDifficulty = (d: Difficulty) => {
    setDifficulties((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    resetPage();
  };

  const hasActiveFilters = subjectId || gradeLevelId || chapterIds.length || difficulties.length;

  const clearFilters = () => {
    setSubjectId(undefined);
    setGradeLevelId(undefined);
    setChapterIds([]);
    setDifficulties([]);
    resetPage();
  };

  const chapterName = (id: number) => chapters.find((c) => c.id === id)?.name ?? `Chương #${id}`;

  return (
    <PageContainer
      title="Ngân hàng kiểm tra"
      subtitle="Câu hỏi trắc nghiệm dùng cho bài test/luyện tập — có đáp án đúng + giải thích."
      maxWidth="wide"
      headerAction={
        can('question_bank.create') ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Thêm câu hỏi
          </Button>
        ) : undefined
      }
    >
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setStatusTab(t.key);
                  resetPage();
                }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  statusTab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Tìm nội dung câu hỏi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <SingleSelect
            placeholder="Môn"
            value={subjectId ? String(subjectId) : ''}
            onValueChange={(v) => {
              setSubjectId(v ? Number(v) : undefined);
              setChapterIds([]);
              resetPage();
            }}
            options={subjects.map((s) => ({ value: String(s.subjectId), label: s.subjectName }))}
          />
          <SingleSelect
            placeholder="Lớp"
            value={gradeLevelId ? String(gradeLevelId) : ''}
            onValueChange={(v) => {
              setGradeLevelId(v ? Number(v) : undefined);
              setChapterIds([]);
              resetPage();
            }}
            options={grades.map((g) => ({ value: String(g.gradeLevelId), label: g.gradeName }))}
          />
          <MultiSelect
            placeholder="Chương"
            disabled={!subjectId || !gradeLevelId}
            selected={chapterIds.map(String)}
            onToggle={(v) => toggleChapter(Number(v))}
            options={chapters.map((c) => ({ value: String(c.id), label: c.name }))}
            emptyHint={!subjectId || !gradeLevelId ? 'Chọn Môn + Lớp trước' : 'Không có chương'}
          />
          <MultiSelect
            placeholder="Độ khó"
            selected={difficulties}
            onToggle={(v) => toggleDifficulty(v as Difficulty)}
            options={DIFFICULTY_OPTIONS.map(([k, label]) => ({ value: k, label }))}
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
              <X className="size-3.5" /> Xoá lọc
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <ArrowUpDown className="size-4 text-slate-400" />
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as QuestionSortBy)}
              items={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              title={sortDir === 'asc' ? 'Tăng dần' : 'Giảm dần'}
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        {(chapterIds.length > 0 || difficulties.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {difficulties.map((d) => (
              <FilterChip key={`d-${d}`} label={DIFFICULTY_LABEL[d]} onRemove={() => toggleDifficulty(d)} />
            ))}
            {chapterIds.map((id) => (
              <FilterChip key={`c-${id}`} label={chapterName(id)} onRemove={() => toggleChapter(id)} />
            ))}
          </div>
        )}

        <Table className="mt-4 table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[42%]">Nội dung</TableHead>
              <TableHead className="w-16 text-center">Lớp</TableHead>
              <TableHead className="w-28">Độ khó</TableHead>
              <TableHead className="w-24 text-center">Đáp án đúng</TableHead>
              <TableHead className="w-28 text-center">Trạng thái</TableHead>
              <TableHead className="w-28">Cập nhật</TableHead>
              <TableHead className="w-36 text-center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={`sk-${i}`} />)
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-400">
                  Chưa có câu hỏi trắc nghiệm nào.
                </TableCell>
              </TableRow>
            ) : (
              data.map((q) => (
                <TableRow
                  key={q.id}
                  className={can('question_bank.update') ? 'cursor-pointer' : undefined}
                  onClick={() => can('question_bank.update') && setEditing(q)}
                >
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                      <MathText className="line-clamp-2 text-sm text-slate-800">{q.content}</MathText>
                      <div className="flex flex-wrap gap-1.5">
                        {q.subjectName && (
                          <Badge variant="secondary" className="font-normal">
                            {q.subjectName}
                          </Badge>
                        )}
                        {q.chapterName && (
                          <Badge variant="secondary" className="max-w-48 truncate font-normal">
                            {q.chapterName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-top text-sm">{q.gradeName ?? q.gradeLevelId}</TableCell>
                  <TableCell className="align-top text-sm">
                    {q.difficulty ? DIFFICULTY_LABEL[q.difficulty] : '—'}
                  </TableCell>
                  <TableCell className="text-center align-top text-sm font-medium">
                    {q.correctAnswer ?? '—'}
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <Badge className={STATUS_META[q.reviewStatus].cls}>{STATUS_META[q.reviewStatus].label}</Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-slate-500">{fmtDate(q.updatedAt)}</TableCell>
                  <TableCell className="text-center align-top" onClick={(e) => e.stopPropagation()}>
                    {can('question_bank.update') || can('question_bank.delete') ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="outline" size="sm" className="gap-1 rounded-sm">
                            Chọn hành động
                            <ChevronDown className="size-3.5" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end">
                          {can('question_bank.update') && <DropdownMenuItem onClick={() => setEditing(q)}>Sửa</DropdownMenuItem>}
                          {can('question_bank.update') && q.reviewStatus !== 'published' && (
                            <DropdownMenuItem onClick={() => changeStatus(q, 'published')}>Duyệt</DropdownMenuItem>
                          )}
                          {can('question_bank.update') && q.reviewStatus !== 'rejected' && (
                            <DropdownMenuItem onClick={() => changeStatus(q, 'rejected')}>Từ chối</DropdownMenuItem>
                          )}
                          {can('question_bank.delete') && (
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(q)}>
                              Xoá
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          config={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (nextPage) => {
              setPage(nextPage);
              scrollToTop();
            },
          }}
        />
      </div>

      {(editing || creating) && (
        <TestQuestionFormModal
          question={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            fetchData();
          }}
        />
      )}
    </PageContainer>
  );
};

const SingleSelect: React.FC<{
  placeholder: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}> = ({ placeholder, value, onValueChange, options, disabled }) => {
  const ALL = '__all__';
  const items = [{ value: ALL, label: `Tất cả · ${placeholder}` }, ...options];
  return (
    <Select
      value={value || ALL}
      onValueChange={(v) => onValueChange(v === ALL ? '' : (v ?? ''))}
      items={items}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 w-auto min-w-24 max-w-52">
        <SelectValue placeholder={placeholder} className="truncate" />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const MultiSelect: React.FC<{
  placeholder: string;
  selected: string[];
  onToggle: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  emptyHint?: string;
}> = ({ placeholder, selected, onToggle, options, disabled, emptyHint }) => (
  <DropdownMenu>
    <DropdownMenuTrigger render={
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        className="h-8 min-w-24 justify-between gap-1 font-normal"
      >
        <span className="truncate">
          {placeholder}
          {selected.length > 0 && (
            <span className="ml-1 rounded bg-primary/10 px-1.5 text-xs font-medium text-primary">
              {selected.length}
            </span>
          )}
        </span>
        <ChevronDown className="size-3.5 shrink-0" />
      </Button>
    } />
    <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
      {options.length === 0 ? (
        <div className="px-2 py-4 text-center text-xs text-slate-400">{emptyHint ?? 'Không có dữ liệu'}</div>
      ) : (
        options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            closeOnClick={false}
            onCheckedChange={() => onToggle(o.value)}
          >
            <span className="whitespace-normal wrap-break-word text-sm">{o.label}</span>
          </DropdownMenuCheckboxItem>
        ))
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

const Bar: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded bg-slate-200 ${className ?? ''}`} />
);

const SkeletonRow: React.FC = () => (
  <TableRow>
    <TableCell className="align-top">
      <div className="flex flex-col gap-2">
        <Bar className="h-3.5 w-11/12" />
        <Bar className="h-3.5 w-3/4" />
        <div className="mt-1 flex gap-1.5">
          <Bar className="h-5 w-16 rounded-full" />
          <Bar className="h-5 w-24 rounded-full" />
        </div>
      </div>
    </TableCell>
    <TableCell className="align-top">
      <Bar className="mx-auto h-3.5 w-8" />
    </TableCell>
    <TableCell className="align-top">
      <Bar className="h-3.5 w-16" />
    </TableCell>
    <TableCell className="align-top">
      <Bar className="mx-auto h-3.5 w-5" />
    </TableCell>
    <TableCell className="align-top">
      <Bar className="mx-auto h-5 w-16 rounded-full" />
    </TableCell>
    <TableCell className="align-top">
      <Bar className="h-3.5 w-16" />
    </TableCell>
    <TableCell className="align-top">
      <Bar className="mx-auto h-7 w-28 rounded-md" />
    </TableCell>
  </TableRow>
);

const FilterChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex max-w-64 items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-medium text-primary">
    <span className="truncate">{label}</span>
    <button
      type="button"
      onClick={onRemove}
      className="flex size-4 shrink-0 items-center justify-center rounded-full hover:bg-primary/20"
      aria-label="Bỏ lọc"
    >
      <X className="size-3" />
    </button>
  </span>
);

export default TestBankPage;
