import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Search, ChevronDown, ArrowUpDown, X, Clock, ListChecks } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { scrollToTop } from '../../utils/scrollToTop';
import { useLookup } from '../../hooks/useLookup';
import {
  getAssessments,
  deleteAssessment,
  updateAssessmentStatus,
} from '../../services/assessment.service';
import {
  ASSESSMENT_STATUS_LABEL,
  type Assessment,
  type AssessmentSortBy,
  type AssessmentStatus,
  type SortDir,
} from '../../types/assessment.types';
import { AssessmentFormModal } from '../../components/AssessmentForm/AssessmentFormModal';
import { PAGE_SIZE } from '../../constants/questions';

const STATUS_TABS: { key: AssessmentStatus; label: string }[] = [
  { key: 'published', label: 'Đang dùng' },
  { key: 'draft', label: 'Nháp' },
  { key: 'archived', label: 'Lưu trữ' },
];

const STATUS_META: Record<AssessmentStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 hover:bg-slate-100',
  published: 'bg-green-100 text-green-800 hover:bg-green-100',
  archived: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
};

const SORT_OPTIONS: { key: AssessmentSortBy; label: string }[] = [
  { key: 'updatedAt', label: 'Ngày cập nhật' },
  { key: 'title', label: 'Tên đề' },
  { key: 'gradeLevel', label: 'Lớp' },
  { key: 'createdAt', label: 'Ngày tạo' },
];

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/** Danh sách bộ đề. Câu hỏi quản lý ở trang chi tiết. */
const AssessmentsPage: React.FC = () => {
  const { subjects, grades } = useLookup();
  const navigate = useNavigate();

  const [statusTab, setStatusTab] = useState<AssessmentStatus>('published');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [gradeLevelId, setGradeLevelId] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<AssessmentSortBy>('updatedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [data, setData] = useState<Assessment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Assessment | null>(null);
  const [creating, setCreating] = useState(false);

  const resetPage = () => setPage(1);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const res = await getAssessments(
          {
            pageNumber: page,
            pageSize: PAGE_SIZE,
            status: statusTab,
            search: search.trim() || undefined,
            subjectId,
            gradeLevelId,
            sortBy,
            sortDir,
          },
          signal,
        );
        setData(res.content.items ?? []);
        setTotal(res.content.totalCount ?? 0);
      } catch (err) {
        if (!(err instanceof Error && err.name === 'CanceledError')) {
          toast.error('Không tải được danh sách bộ đề.');
        }
      } finally {
        setLoading(false);
      }
    },
    [page, statusTab, search, subjectId, gradeLevelId, sortBy, sortDir],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchData]);

  const changeStatus = async (a: Assessment, status: AssessmentStatus) => {
    try {
      await updateAssessmentStatus(a.id, status);
      toast.success('Đã cập nhật trạng thái.');
      fetchData();
    } catch (err) {
      // BE chặn phát hành đề thiếu câu -> hiện lý do.
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Cập nhật trạng thái thất bại.';
      toast.error(message);
    }
  };

  const handleDelete = async (a: Assessment) => {
    if (!window.confirm(`Xoá bộ đề "${a.title}" cùng toàn bộ câu hỏi trong đề?`)) return;
    try {
      await deleteAssessment(a.id);
      toast.success('Đã xoá bộ đề.');
      fetchData();
    } catch {
      toast.error('Xoá thất bại.');
    }
  };

  const hasActiveFilters = subjectId || gradeLevelId;

  const clearFilters = () => {
    setSubjectId(undefined);
    setGradeLevelId(undefined);
    resetPage();
  };

  return (
    <PageContainer
      title="Bộ đề đánh giá"
      subtitle="Đề đánh giá đầu vào — học sinh làm để hệ thống xác định trình độ và gợi ý lộ trình học."
      maxWidth="wide"
      headerAction={
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> Thêm bộ đề
        </Button>
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
              placeholder="Tìm tên bộ đề..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <FilterSelect
            placeholder="Môn"
            value={subjectId ? String(subjectId) : ''}
            onValueChange={(v) => {
              setSubjectId(v ? Number(v) : undefined);
              resetPage();
            }}
            options={subjects.map((s) => ({ value: String(s.subjectId), label: s.subjectName }))}
          />
          <FilterSelect
            placeholder="Lớp"
            value={gradeLevelId ? String(gradeLevelId) : ''}
            onValueChange={(v) => {
              setGradeLevelId(v ? Number(v) : undefined);
              resetPage();
            }}
            options={grades.map((g) => ({ value: String(g.gradeLevelId), label: g.gradeName }))}
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
              onValueChange={(v) => setSortBy(v as AssessmentSortBy)}
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

        <Table className="mt-4 table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[38%]">Tên đề</TableHead>
              <TableHead className="w-16 text-center">Lớp</TableHead>
              <TableHead className="w-28 text-center">Số câu</TableHead>
              <TableHead className="w-24 text-center">Thời gian</TableHead>
              <TableHead className="w-24 text-center">Trạng thái</TableHead>
              <TableHead className="w-28">Cập nhật</TableHead>
              <TableHead className="w-36 text-center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={`sk-${i}`} />)
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-slate-400">
                  Chưa có bộ đề nào.
                </TableCell>
              </TableRow>
            ) : (
              data.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/admin-portal/assessments/${a.id}`)}
                >
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1.5 overflow-hidden">
                      <span className="line-clamp-2 text-sm font-medium text-slate-800">{a.title}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {a.subjectName && (
                          <Badge variant="secondary" className="font-normal">
                            {a.subjectName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center align-top text-sm">{a.gradeName ?? a.gradeLevelId}</TableCell>
                  <TableCell className="text-center align-top text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <ListChecks className="size-3.5 text-slate-400" />
                      {a.assignedQuestionCount}
                      {a.questionCount != null && (
                        <span className={a.isReady ? 'text-slate-400' : 'text-amber-600'}>/{a.questionCount}</span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-center align-top text-sm text-slate-600">
                    {a.durationMinutes != null ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5 text-slate-400" />
                        {a.durationMinutes}'
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-center align-top">
                    <Badge className={STATUS_META[a.status]}>{ASSESSMENT_STATUS_LABEL[a.status]}</Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-slate-500">{fmtDate(a.updatedAt)}</TableCell>
                  <TableCell className="text-center align-top" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="outline" size="sm" className="gap-1 rounded-sm">
                            Chọn hành động
                            <ChevronDown className="size-3.5" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin-portal/assessments/${a.id}`)}>
                            Xem câu hỏi
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditing(a)}>Sửa thông tin</DropdownMenuItem>
                          {a.status !== 'published' && (
                            <DropdownMenuItem onClick={() => changeStatus(a, 'published')}>
                              Phát hành
                            </DropdownMenuItem>
                          )}
                          {a.status === 'published' && (
                            <DropdownMenuItem onClick={() => changeStatus(a, 'draft')}>
                              Chuyển về nháp
                            </DropdownMenuItem>
                          )}
                          {a.status !== 'archived' && (
                            <DropdownMenuItem onClick={() => changeStatus(a, 'archived')}>Lưu trữ</DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDelete(a)}
                          >
                            Xoá
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
        <AssessmentFormModal
          assessment={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={(saved) => {
            const wasCreating = creating;
            setEditing(null);
            setCreating(false);
            // Đề mới rỗng câu -> vào luôn trang chi tiết.
            if (wasCreating) navigate(`/admin-portal/assessments/${saved.id}`);
            else fetchData();
          }}
        />
      )}
    </PageContainer>
  );
};

const FilterSelect: React.FC<{
  placeholder: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ placeholder, value, onValueChange, options }) => {
  const ALL = '__all__';
  const items = [{ value: ALL, label: `Tất cả · ${placeholder}` }, ...options];
  return (
    <Select value={value || ALL} onValueChange={(v) => onValueChange(v === ALL ? '' : (v ?? ''))} items={items}>
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

const Bar: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded bg-slate-200 ${className ?? ''}`} />
);

const SkeletonRow: React.FC = () => (
  <TableRow>
    <TableCell className="align-top">
      <div className="flex flex-col gap-2">
        <Bar className="h-3.5 w-3/4" />
        <div className="mt-1 flex gap-1.5">
          <Bar className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </TableCell>
    <TableCell className="align-top">
      <Bar className="mx-auto h-3.5 w-8" />
    </TableCell>
    <TableCell className="align-top">
      <Bar className="mx-auto h-3.5 w-10" />
    </TableCell>
    <TableCell className="align-top">
      <Bar className="mx-auto h-3.5 w-10" />
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

export default AssessmentsPage;
