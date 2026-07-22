import React from 'react';
import { Search, CircleCheck, CircleSlash, CircleX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_FILTERS, type StatusFilter } from './statusFilter';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  filters?: React.ReactNode;
  action?: React.ReactNode;
}

export const CatalogueToolbar: React.FC<Props> = ({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  filters,
  action,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="w-64 pl-8"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {filters}
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={status}
        onValueChange={(v) => onStatusChange(v as StatusFilter)}
        items={STATUS_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTERS.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {action}
    </div>
  </div>
);

export const ActiveBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <Badge variant="outline" className="gap-1.5 px-2 font-normal text-muted-foreground">
    {isActive ? (
      <CircleCheck className="size-3.5 text-green-600" />
    ) : (
      <CircleSlash className="size-3.5 text-muted-foreground" />
    )}
    {isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
  </Badge>
);

/** Badge Bật/Tắt — dùng cho cột "Giải bài tập". */
export const OnOffBadge: React.FC<{ on: boolean }> = ({ on }) => (
  <Badge variant="outline" className="gap-1.5 px-2 font-normal text-muted-foreground">
    {on ? (
      <CircleCheck className="size-3.5 text-green-600" />
    ) : (
      <CircleX className="size-3.5 text-red-500" />
    )}
    {on ? 'Bật' : 'Tắt'}
  </Badge>
);
