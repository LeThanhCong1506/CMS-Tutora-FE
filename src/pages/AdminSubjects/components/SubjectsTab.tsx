import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus, BookOpen } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { useAccess } from '../../../contexts/AccessContext';
import {
  getAdminSubjects,
  deleteSubject,
  updateSubject,
  reorderSubjects,
} from '../../../services/adminLookup.service';
import type { AdminSubject } from '../../../types/lookup.type';
import { SubjectFormModal } from './SubjectFormModal';
import { ConfirmDialog } from '../../../components/shared';
import { SortableDataTable, type RowAction } from '../../../components/shared';
import { useReorder } from '../../../hooks/useReorder';
import { apiErrorMessage } from '../../../utils/apiError';
import { matchesSearch } from '../../../utils/vietnameseSearch';
import { matchesStatus, type StatusFilter } from '../../../components/CatalogueControls';
import { CatalogueToolbar, ActiveBadge, OnOffBadge } from '../../../components/CatalogueControls';

/** SortableDataTable cần khoá `id`; Subject dùng subjectId nên map sang. */
type SubjectRow = AdminSubject & { id: number };

export const SubjectsTab: React.FC = () => {
  const { can } = useAccess();
  const [items, setItems] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<AdminSubject | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<AdminSubject | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminSubjects();
      setItems(data.map((s) => ({ ...s, id: s.subjectId })));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không tải được danh sách môn học.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const filtered = useMemo(
    () =>
      items.filter(
        (s) =>
          matchesStatus(status, s.isActive) &&
          matchesSearch(search, s.subjectName, s.slug, s.description),
      ),
    [items, search, status],
  );

  // Chỉ cho kéo khi đang xem đủ danh sách — kéo trên tập đã lọc sẽ ra thứ tự sai.
  const isFiltered = !!search.trim() || status !== 'all';

  const handleReorder = useReorder<SubjectRow>({
    items,
    setItems,
    save: reorderSubjects,
    applyOrder: (s, order) => ({ ...s, displayOrder: order }),
  });

  const restore = async (s: AdminSubject) => {
    try {
      await updateSubject(s.subjectId, {
        subjectName: s.subjectName,
        description: s.description,
        slug: s.slug,
        iconUrl: s.iconUrl,
        isHomeworkEnabled: s.isHomeworkEnabled,
        displayOrder: s.displayOrder,
        isActive: true,
      });
      toast.success('Đã khôi phục môn học.');
      void fetchData();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Khôi phục thất bại.'));
    }
  };

  const confirmDeactivate = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      // BE trả message kèm số gói giá tutor bị ảnh hưởng -> hiện nguyên văn.
      toast.success(await deleteSubject(confirming.subjectId));
      setConfirming(null);
      void fetchData();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Ngừng hoạt động môn học thất bại.'));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<SubjectRow>[]>(
    () => [
      {
        id: 'icon',
        header: 'Icon',
        cell: ({ row }) => (
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
            {row.original.iconUrl ? (
              <img src={row.original.iconUrl} alt="" className="size-full object-contain" />
            ) : (
              <BookOpen className="size-4 text-muted-foreground" />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'subjectName',
        header: 'Tên môn học',
        cell: ({ row }) => (
          <div className="min-w-40">
            <div className="font-medium">{row.original.subjectName}</div>
            {row.original.description && (
              <div className="line-clamp-1 text-xs text-muted-foreground">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.slug || '—'}</span>
        ),
      },
      {
        accessorKey: 'isHomeworkEnabled',
        header: 'Giải bài tập',
        cell: ({ row }) => <OnOffBadge on={row.original.isHomeworkEnabled} />,
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
    ],
    [],
  );

  const actions = useMemo<RowAction<SubjectRow>[]>(() => {
    const list: RowAction<SubjectRow>[] = [];
    if (can('lookup.update')) {
      list.push({ label: 'Chỉnh sửa', onSelect: (s) => setEditing(s) });
      list.push({
        label: 'Khôi phục',
        hidden: (s) => s.isActive,
        onSelect: (s) => void restore(s),
      });
    }
    if (can('lookup.delete')) {
      list.push({
        label: 'Ngừng hoạt động',
        hidden: (s) => !s.isActive,
        destructive: true,
        separatorBefore: true,
        onSelect: (s) => setConfirming(s),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [can]);

  return (
    <div className="space-y-4">
      <CatalogueToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm môn học..."
        status={status}
        onStatusChange={setStatus}
        action={
          can('lookup.create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Thêm môn học
            </Button>
          )
        }
      />

      <SortableDataTable
        data={filtered}
        columns={columns}
        loading={loading}
        emptyText={
          search || status !== 'all' ? 'Không có môn học phù hợp.' : 'Chưa có môn học nào.'
        }
        isDimmed={(s) => !s.isActive}
        actions={actions}
        onReorder={can('lookup.update') && !isFiltered ? handleReorder : undefined}
        reorderDisabledReason="Bỏ lọc/tìm kiếm để kéo đổi thứ tự"
      />

      {(creating || editing) && (
        <SubjectFormModal
          subject={editing}
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
        title="Ngừng hoạt động môn học?"
        description={
          <>
            Môn <strong>{confirming?.subjectName}</strong> sẽ bị ẩn khỏi các lựa chọn mới. Câu hỏi,
            chương và booking hiện có vẫn giữ nguyên, và bạn có thể khôi phục lại sau.
          </>
        }
        confirmLabel="Ngừng hoạt động"
        busy={busy}
        onConfirm={() => void confirmDeactivate()}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
};
