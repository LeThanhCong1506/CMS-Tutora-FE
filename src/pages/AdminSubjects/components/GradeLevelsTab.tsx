import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { useAccess } from '../../../contexts/AccessContext';
import {
  getAdminGradeLevels,
  deleteGradeLevel,
  updateGradeLevel,
  reorderGradeLevels,
} from '../../../services/adminLookup.service';
import type { AdminGradeLevel } from '../../../types/lookup.type';
import { GradeLevelFormModal } from './GradeLevelFormModal';
import { ConfirmDialog } from '../../../components/shared';
import { SortableDataTable, type RowAction } from '../../../components/shared';
import { useReorder } from '../../../hooks/useReorder';
import { apiErrorMessage } from '../../../utils/apiError';
import { matchesSearch } from '../../../utils/vietnameseSearch';
import { matchesStatus, type StatusFilter } from '../../../components/CatalogueControls';
import { CatalogueToolbar, ActiveBadge } from '../../../components/CatalogueControls';

/** SortableDataTable cần khoá `id`; GradeLevel dùng gradeLevelId nên map sang. */
type GradeRow = AdminGradeLevel & { id: number };

export const GradeLevelsTab: React.FC = () => {
  const { can } = useAccess();
  const [items, setItems] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<AdminGradeLevel | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<AdminGradeLevel | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminGradeLevels();
      setItems(data.map((g) => ({ ...g, id: g.gradeLevelId })));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không tải được danh sách khối lớp.'));
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
        (g) => matchesStatus(status, g.isActive) && matchesSearch(search, g.gradeName),
      ),
    [items, search, status],
  );

  const nextLevelOrder = useMemo(
    () => items.reduce((max, g) => Math.max(max, g.levelOrder), 0) + 1,
    [items],
  );

  // Chỉ cho kéo khi đang xem đủ danh sách — kéo trên tập đã lọc sẽ ra thứ tự sai.
  const isFiltered = !!search.trim() || status !== 'all';

  const handleReorder = useReorder<GradeRow>({
    items,
    setItems,
    save: reorderGradeLevels,
    applyOrder: (g, order) => ({ ...g, levelOrder: order }),
  });

  const restore = async (g: AdminGradeLevel) => {
    try {
      await updateGradeLevel(g.gradeLevelId, {
        gradeName: g.gradeName,
        levelOrder: g.levelOrder,
        isActive: true,
      });
      toast.success('Đã khôi phục khối lớp.');
      void fetchData();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Khôi phục thất bại.'));
    }
  };

  const confirmDeactivate = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      toast.success(await deleteGradeLevel(confirming.gradeLevelId));
      setConfirming(null);
      void fetchData();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Ngừng hoạt động khối lớp thất bại.'));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<GradeRow>[]>(
    () => [
      {
        accessorKey: 'gradeName',
        header: 'Tên khối lớp',
        cell: ({ row }) => <span className="font-medium">{row.original.gradeName}</span>,
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
    ],
    [],
  );

  const actions = useMemo<RowAction<GradeRow>[]>(() => {
    const list: RowAction<GradeRow>[] = [];
    if (can('lookup.update')) {
      list.push({ label: 'Chỉnh sửa', onSelect: (g) => setEditing(g) });
      list.push({
        label: 'Khôi phục',
        hidden: (g) => g.isActive,
        onSelect: (g) => void restore(g),
      });
    }
    if (can('lookup.delete')) {
      list.push({
        label: 'Ngừng hoạt động',
        hidden: (g) => !g.isActive,
        destructive: true,
        separatorBefore: true,
        onSelect: (g) => setConfirming(g),
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
        searchPlaceholder="Tìm khối lớp..."
        status={status}
        onStatusChange={setStatus}
        action={
          can('lookup.create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Thêm khối lớp
            </Button>
          )
        }
      />

      <SortableDataTable
        data={filtered}
        columns={columns}
        loading={loading}
        emptyText={
          search || status !== 'all' ? 'Không có khối lớp phù hợp.' : 'Chưa có khối lớp nào.'
        }
        isDimmed={(g) => !g.isActive}
        actions={actions}
        onReorder={can('lookup.update') && !isFiltered ? handleReorder : undefined}
        reorderDisabledReason="Bỏ lọc/tìm kiếm để kéo đổi thứ tự"
      />

      {(creating || editing) && (
        <GradeLevelFormModal
          grade={editing}
          nextLevelOrder={nextLevelOrder}
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
        title="Ngừng hoạt động khối lớp?"
        description={
          <>
            Khối <strong>{confirming?.gradeName}</strong> sẽ bị ẩn khỏi các lựa chọn mới. Câu hỏi,
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
