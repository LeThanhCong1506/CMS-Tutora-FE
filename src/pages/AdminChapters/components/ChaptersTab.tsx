import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccess } from '../../../contexts/AccessContext';
import {
  getAdminChapters,
  getAdminSubjects,
  getAdminGradeLevels,
  deleteChapter,
  reorderChapters,
} from '../../../services/adminLookup.service';
import type { AdminChapter, AdminSubject, AdminGradeLevel } from '../../../types/lookup.type';
import { ChapterFormModal } from './ChapterFormModal';
import { ConfirmDialog } from '../../../components/shared';
import { SortableDataTable, type RowAction } from '../../../components/shared';
import { useReorder } from '../../../hooks/useReorder';
import { apiErrorMessage } from '../../../utils/apiError';
import { matchesSearch } from '../../../utils/vietnameseSearch';
import { matchesStatus, type StatusFilter } from '../../../components/CatalogueControls';
import { CatalogueToolbar, ActiveBadge } from '../../../components/CatalogueControls';

const ALL = '__all__';

export const ChaptersTab: React.FC = () => {
  const { can } = useAccess();
  const [items, setItems] = useState<AdminChapter[]>([]);
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [grades, setGrades] = useState<AdminGradeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [subjectId, setSubjectId] = useState<number | undefined>();
  const [gradeLevelId, setGradeLevelId] = useState<number | undefined>();
  const [editing, setEditing] = useState<AdminChapter | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<AdminChapter | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([getAdminSubjects(), getAdminGradeLevels()])
      .then(([s, g]) => {
        setSubjects(s);
        setGrades(g);
      })
      .catch(() => toast.error('Không tải được danh mục môn/khối.'));
  }, []);

  // Lọc môn/khối chạy ở server (BE nhận query param), tìm kiếm + trạng thái lọc ở client.
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAdminChapters(subjectId, gradeLevelId));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không tải được danh sách chương.'));
    } finally {
      setLoading(false);
    }
  }, [subjectId, gradeLevelId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const filtered = useMemo(
    () =>
      items.filter(
        (c) =>
          matchesStatus(status, c.isActive) &&
          matchesSearch(search, c.name, c.slug, c.subjectName, c.gradeName),
      ),
    [items, search, status],
  );

  // Thứ tự chương chỉ có nghĩa trong 1 cặp (môn, lớp) -> phải chọn cả hai mới cho kéo.
  const canDrag = !!subjectId && !!gradeLevelId && !search.trim() && status === 'all';

  const handleReorder = useReorder<AdminChapter>({
    items,
    setItems,
    save: reorderChapters,
    applyOrder: (c, order) => ({ ...c, displayOrder: order }),
  });

  const confirmDelete = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      await deleteChapter(confirming.id);
      toast.success('Đã xoá chương.');
      setConfirming(null);
      void fetchData();
    } catch (err) {
      // BE chặn 409 kèm lý do khi chương còn câu hỏi -> hiện nguyên văn.
      toast.error(apiErrorMessage(err, 'Xoá chương thất bại.'));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<AdminChapter>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên chương',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'subjectName',
        header: 'Môn học',
        cell: ({ row }) => row.original.subjectName || '—',
      },
      {
        accessorKey: 'gradeName',
        header: 'Khối lớp',
        cell: ({ row }) => row.original.gradeName || '—',
      },
      {
        accessorKey: 'questionCount',
        header: 'Số câu hỏi',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.questionCount}</span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
    ],
    [],
  );

  const actions = useMemo<RowAction<AdminChapter>[]>(() => {
    const list: RowAction<AdminChapter>[] = [];
    if (can('lookup.update')) {
      list.push({ label: 'Chỉnh sửa', onSelect: (c) => setEditing(c) });
    }
    if (can('lookup.delete')) {
      list.push({
        label: 'Xoá',
        destructive: true,
        separatorBefore: true,
        disabled: (c) => c.questionCount > 0,
        disabledReason: 'Đang có câu hỏi',
        onSelect: (c) => setConfirming(c),
      });
    }
    return list;
  }, [can]);

  return (
    <div className="space-y-4">
      <CatalogueToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm chương..."
        status={status}
        onStatusChange={setStatus}
        filters={
          <>
            <Select
              value={subjectId ? String(subjectId) : ALL}
              onValueChange={(v) => setSubjectId(v === ALL ? undefined : Number(v))}
              items={[
                { value: ALL, label: 'Tất cả môn' },
                ...subjects.map((s) => ({ value: String(s.subjectId), label: s.subjectName })),
              ]}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tất cả môn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả môn</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.subjectId} value={String(s.subjectId)}>
                    {s.subjectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={gradeLevelId ? String(gradeLevelId) : ALL}
              onValueChange={(v) => setGradeLevelId(v === ALL ? undefined : Number(v))}
              items={[
                { value: ALL, label: 'Tất cả khối' },
                ...grades.map((g) => ({ value: String(g.gradeLevelId), label: g.gradeName })),
              ]}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tất cả khối" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả khối</SelectItem>
                {grades.map((g) => (
                  <SelectItem key={g.gradeLevelId} value={String(g.gradeLevelId)}>
                    {g.gradeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        action={
          can('lookup.create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Thêm chương
            </Button>
          )
        }
      />

      <SortableDataTable
        data={filtered}
        columns={columns}
        loading={loading}
        emptyText={
          search || status !== 'all' || subjectId || gradeLevelId
            ? 'Không có chương phù hợp.'
            : 'Chưa có chương nào.'
        }
        isDimmed={(c) => !c.isActive}
        actions={actions}
        onReorder={can('lookup.update') && canDrag ? handleReorder : undefined}
        reorderDisabledReason="Chọn 1 môn và 1 khối (bỏ tìm kiếm/lọc) để kéo đổi thứ tự"
      />

      {(creating || editing) && (
        <ChapterFormModal
          chapter={editing}
          subjects={subjects}
          grades={grades}
          defaultSubjectId={subjectId}
          defaultGradeLevelId={gradeLevelId}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            void fetchData();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirming}
        title="Xoá chương?"
        description={
          <>
            Chương <strong>{confirming?.name}</strong> sẽ bị xoá vĩnh viễn, không khôi phục được.
            Nếu chỉ muốn ẩn tạm thời, hãy sửa chương và bỏ chọn "Đang hoạt động".
          </>
        }
        confirmLabel="Xoá vĩnh viễn"
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
};
