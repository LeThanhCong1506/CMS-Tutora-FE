import * as React from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  EllipsisVertical,
  GripVertical,
} from 'lucide-react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type Row,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PAGE_SIZES = [10, 20, 30, 40, 50];

/** Tay cầm kéo-thả — tách riêng để chỉ phần này nhận sự kiện drag. */
function DragHandle({ id, disabled, title }: { id: number; disabled: boolean; title?: string }) {
  const { attributes, listeners } = useSortable({ id, disabled });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      disabled={disabled}
      title={title}
      className="size-7 cursor-move text-muted-foreground hover:bg-transparent disabled:cursor-not-allowed"
    >
      <GripVertical className="size-3 text-muted-foreground" />
      <span className="sr-only">Kéo để đổi thứ tự</span>
    </Button>
  );
}

function DraggableRow<T>({ row, dimmed }: { row: Row<T>; dimmed: boolean }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: (row.original as { id?: number }).id ?? row.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-dragging={isDragging}
      className={`relative z-0 border-b border-[rgba(62,47,40,0.08)] last:border-0 hover:bg-[#faf9f2] data-[dragging=true]:z-10 data-[dragging=true]:bg-white data-[dragging=true]:opacity-90 ${
        dimmed ? 'opacity-55' : ''
      }`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id} className="px-4 py-3">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export interface RowAction<T> {
  label: string;
  onSelect: (row: T) => void;
  hidden?: (row: T) => boolean;
  /** Khoá mục kèm lý do hiện thay cho nhãn. */
  disabled?: (row: T) => boolean;
  disabledReason?: string;
  /** Vẽ đường kẻ phía trên (tách nhóm hành động phá huỷ). */
  separatorBefore?: boolean;
  destructive?: boolean;
}

interface Props<T> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  emptyText?: string;
  isDimmed?: (row: T) => boolean;
  actions?: RowAction<T>[];
  /**
   * Bật kéo-thả đổi thứ tự; nhận danh sách id theo thứ tự mới.
   * Bỏ trống = khoá kéo (vd đang lọc nên danh sách không đầy đủ).
   */
  onReorder?: (orderedIds: number[]) => void;
  reorderDisabledReason?: string;
}

export function SortableDataTable<T extends { id: number }>({
  data,
  columns,
  loading = false,
  emptyText = 'Chưa có dữ liệu.',
  isDimmed,
  actions,
  onReorder,
  reorderDisabledReason,
}: Props<T>) {
  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor), useSensor(KeyboardSensor));
  const draggable = !!onReorder;

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data.map((d) => d.id), [data]);

  const allColumns = React.useMemo<ColumnDef<T>[]>(() => {
    const dragColumn: ColumnDef<T> = {
      id: 'drag',
      header: () => null,
      cell: ({ row }) => (
        <DragHandle
          id={row.original.id}
          disabled={!draggable}
          title={draggable ? 'Kéo để đổi thứ tự' : reorderDisabledReason}
        />
      ),
    };

    if (!actions?.length) return [dragColumn, ...columns];

    const actionColumn: ColumnDef<T> = {
      id: 'actions',
      cell: ({ row }) => {
        const visible = actions.filter((a) => !a.hidden?.(row.original));
        if (!visible.length) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex size-8 cursor-pointer text-muted-foreground data-[state=open]:bg-muted"
                >
                  <EllipsisVertical />
                  <span className="sr-only">Mở menu thao tác</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-44">
              {visible.map((action) => {
                const disabled = action.disabled?.(row.original) ?? false;
                return (
                  <React.Fragment key={action.label}>
                    {action.separatorBefore && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      disabled={disabled}
                      variant={action.destructive ? 'destructive' : undefined}
                      onClick={() => action.onSelect(row.original)}
                    >
                      {disabled && action.disabledReason ? action.disabledReason : action.label}
                    </DropdownMenuItem>
                  </React.Fragment>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    };

    return [dragColumn, ...columns, actionColumn];
  }, [columns, actions, draggable, reorderDisabledReason]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !onReorder) return;
    const from = dataIds.indexOf(active.id);
    const to = dataIds.indexOf(over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(dataIds, from, to).map(Number));
  };

  const rows = table.getRowModel().rows;

  return (
    <div className="flex flex-col gap-4">
      {/* Thẻ trắng nổi trên nền kem #f2f0e4 của portal — cùng quy ước với SectionCard. */}
      <div className="overflow-hidden rounded-xl border border-[rgba(62,47,40,0.1)] bg-white">
        <DndContext
          id={sortableId}
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader className="bg-[#faf9f2]">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-[rgba(62,47,40,0.12)] hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className="h-11 px-4 text-xs font-semibold tracking-wide text-[rgba(62,47,40,0.65)] uppercase"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : rows.length ? (
                <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                  {rows.map((row) => (
                    <DraggableRow
                      key={row.id}
                      row={row}
                      dimmed={isDimmed?.(row.original) ?? false}
                    />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">
                    {emptyText}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-[rgba(62,47,40,0.1)] bg-white px-4 py-2.5">
        <div className="hidden flex-1 text-sm text-[rgba(62,47,40,0.65)] lg:flex">
          {data.length} mục
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Số dòng mỗi trang
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
              items={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
            >
              <SelectTrigger size="sm" className="w-20 cursor-pointer" id="rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden size-8 cursor-pointer p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Trang đầu</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 cursor-pointer"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Trang trước</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 cursor-pointer"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Trang sau</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden size-8 cursor-pointer lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Trang cuối</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
