export type StatusFilter = 'all' | 'active' | 'inactive';

export const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'inactive', label: 'Ngừng hoạt động' },
];

export const matchesStatus = (status: StatusFilter, isActive: boolean): boolean =>
  status === 'all' || (status === 'active' ? isActive : !isActive);
