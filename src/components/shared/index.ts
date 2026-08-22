/**
 * Shared Components — Barrel Export
 *
 * Reusable UI components based on TutorPortal design system.
 * Import from here for consistent styling across all portals:
 *
 * ```tsx
 * import { StatCard, StatusBadge, SectionCard, FilterTabs, PageContainer } from '@/components/shared';
 * ```
 */

export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps, StatusVariant } from './StatusBadge';

export { SectionCard } from './SectionCard';
export type { SectionCardProps } from './SectionCard';

export { FilterTabs } from './FilterTabs';
export type { FilterTabsProps, TabItem } from './FilterTabs';

export { PageContainer } from './PageContainer';
export type { PageContainerProps } from './PageContainer';

export { DataTable, TablePagination } from './DataTable';
export type { DataTableProps, DataTableColumn, PaginationConfig } from './DataTable';

export { SortableDataTable } from './SortableDataTable';
export type { RowAction } from './SortableDataTable';

export { ConfirmDialog } from './ConfirmDialog';

export { PortalLayout } from './PortalLayout';
export type { PortalLayoutProps, NavItem } from './PortalLayout';

export { Breadcrumb } from './Breadcrumb';
export type { BreadcrumbItem } from './Breadcrumb';

export { ErrorBoundary, ErrorFallback } from './ErrorBoundary';
export type { ErrorFallbackProps } from './ErrorBoundary';

export { SessionLogPanel } from './SessionLogPanel';

export { TutorReliabilityCard } from './TutorReliabilityCard';

export { ProtectedImage, useProtectedImage } from './ProtectedImage';
