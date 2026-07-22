import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { useAccess } from '../../../contexts/AccessContext';
import {
  getAdminQuestionTypes,
  deleteQuestionType,
  reorderQuestionTypes,
} from '../../../services/adminLookup.service';
import type { AdminQuestionType } from '../../../types/lookup.type';
import { QuestionTypeFormModal } from './QuestionTypeFormModal';
import { ConfirmDialog } from '../../../components/shared';
import { SortableDataTable, type RowAction } from '../../../components/shared';
import { useReorder } from '../../../hooks/useReorder';
import { apiErrorMessage } from '../../../utils/apiError';
import { matchesSearch } from '../../../utils/vietnameseSearch';
import { matchesStatus, type StatusFilter } from '../../../components/CatalogueControls';
import { CatalogueToolbar, ActiveBadge } from '../../../components/CatalogueControls';

export const QuestionTypesTab: React.FC = () => {
  const { can } = useAccess();
  const [items, setItems] = useState<AdminQuestionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<AdminQuestionType | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<AdminQuestionType | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAdminQuestionTypes());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Không tải được danh sách loại câu hỏi.'));
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
        (t) => matchesStatus(status, t.isActive) && matchesSearch(search, t.name, t.slug),
      ),
    [items, search, status],
  );

  // Chỉ cho kéo khi đang xem đủ danh sách — kéo trên tập đã lọc sẽ ra thứ tự sai.
  const isFiltered = !!search.trim() || status !== 'all';

  const handleReorder = useReorder<AdminQuestionType>({
    items,
    setItems,
    save: reorderQuestionTypes,
    applyOrder: (t, order) => ({ ...t, displayOrder: order }),
  });

  const confirmDelete = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      await deleteQuestionType(confirming.id);
      toast.success('Đã xoá loại câu hỏi.');
      setConfirming(null);
      void fetchData();
    } catch (err) {
      // BE chặn 409 kèm lý do khi loại này còn câu hỏi -> hiện nguyên văn.
      toast.error(apiErrorMessage(err, 'Xoá loại câu hỏi thất bại.'));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<AdminQuestionType>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên loại câu hỏi',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'slug',
        header: 'Slug',
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.slug}</span>,
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

  const actions = useMemo<RowAction<AdminQuestionType>[]>(() => {
    const list: RowAction<AdminQuestionType>[] = [];
    if (can('lookup.update')) {
      list.push({ label: 'Chỉnh sửa', onSelect: (t) => setEditing(t) });
    }
    if (can('lookup.delete')) {
      list.push({
        label: 'Xoá',
        destructive: true,
        separatorBefore: true,
        disabled: (t) => t.questionCount > 0,
        disabledReason: 'Đang có câu hỏi',
        onSelect: (t) => setConfirming(t),
      });
    }
    return list;
  }, [can]);

  return (
    <div className="space-y-4">
      <CatalogueToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm loại câu hỏi..."
        status={status}
        onStatusChange={setStatus}
        action={
          can('lookup.create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Thêm loại câu hỏi
            </Button>
          )
        }
      />

      <SortableDataTable
        data={filtered}
        columns={columns}
        loading={loading}
        emptyText={
          search || status !== 'all'
            ? 'Không có loại câu hỏi phù hợp.'
            : 'Chưa có loại câu hỏi nào.'
        }
        isDimmed={(t) => !t.isActive}
        actions={actions}
        onReorder={can('lookup.update') && !isFiltered ? handleReorder : undefined}
        reorderDisabledReason="Bỏ lọc/tìm kiếm để kéo đổi thứ tự"
      />

      {(creating || editing) && (
        <QuestionTypeFormModal
          questionType={editing}
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
        title="Xoá loại câu hỏi?"
        description={
          <>
            Loại <strong>{confirming?.name}</strong> sẽ bị xoá vĩnh viễn, không khôi phục được.
            Nếu chỉ muốn ẩn tạm thời, hãy sửa và bỏ chọn "Đang hoạt động".
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
