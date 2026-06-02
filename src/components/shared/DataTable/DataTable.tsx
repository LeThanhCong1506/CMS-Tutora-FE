import React, { useMemo } from 'react';
import styles from './DataTable.module.css';

// ─── Column Definition ─────────────────────────────────

export interface DataTableColumn<T = any> {
    /** Unique key for this column */
    key: string;
    /** Column header text */
    title: string;
    /** Property name to read from the data item (for simple text display) */
    dataIndex?: keyof T;
    /** Custom render function for the cell content */
    render?: (record: T, index: number) => React.ReactNode;
    /** Text alignment. Default: 'left' */
    align?: 'left' | 'center' | 'right';
    /** Minimum width in px (for responsive horizontal scrolling) */
    minWidth?: number;
    /** Maximum width in px */
    maxWidth?: number;
    /** Width (fixed) */
    width?: number | string;
    /** If true, this column is hidden on screens < 768px */
    hideOnMobile?: boolean;
}

// ─── Pagination Config ──────────────────────────────────

export interface PaginationConfig {
    /** Current page (1-indexed) */
    current: number;
    /** Items per page */
    pageSize: number;
    /** Total items count (if known from server) */
    total: number;
    /** Called when page changes */
    onChange: (page: number) => void;
}

// ─── Component Props ────────────────────────────────────

export interface DataTableProps<T = any> {
    /** Column definitions */
    columns: DataTableColumn<T>[];
    /** Data array to display */
    data: T[];
    /** Unique key extractor for each row */
    rowKey: keyof T | ((record: T) => string | number);
    /** Show loading spinner */
    loading?: boolean;
    /** Custom loading text */
    loadingText?: string;
    /** Custom empty state message */
    emptyText?: string;
    /** Custom empty icon (React node) */
    emptyIcon?: React.ReactNode;
    /** Whether rows are clickable */
    onRowClick?: (record: T, index: number) => void;
    /** Optional pagination config. If omitted, no pagination is shown. */
    pagination?: PaginationConfig;
    /** Custom className for the outer wrapper */
    className?: string;
    /** Minimum table width (for horizontal scroll on mobile). Default: 700 */
    minWidth?: number;
}

// ─── Pagination Sub-component ───────────────────────────

const ChevronLeftIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 3L5 7L9 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 3L9 7L5 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

function TablePagination({ config }: { config: PaginationConfig }) {
    const { current, pageSize, total, onChange } = config;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (totalPages <= 1) return null;

    // Calculate visible page numbers (show max 5 pages)
    const pageNumbers = useMemo(() => {
        const pages: number[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (current <= 3) {
            for (let i = 1; i <= maxVisible; i++) pages.push(i);
        } else if (current >= totalPages - 2) {
            for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
        } else {
            for (let i = current - 2; i <= current + 2; i++) pages.push(i);
        }
        return pages;
    }, [current, totalPages]);

    const startItem = (current - 1) * pageSize + 1;
    const endItem = Math.min(current * pageSize, total);

    return (
        <div className={styles.pagination}>
            <span className={styles.paginationInfo}>
                Hiển thị {startItem}–{endItem} trong số {total}
            </span>
            <div className={styles.paginationControls}>
                <button
                    className={styles.pageBtn}
                    onClick={() => onChange(current - 1)}
                    disabled={current === 1}
                    aria-label="Trang trước"
                >
                    <ChevronLeftIcon />
                </button>

                {pageNumbers.map((num) => (
                    <button
                        key={num}
                        className={`${styles.pageNumber} ${current === num ? styles.pageActive : ''}`}
                        onClick={() => onChange(num)}
                    >
                        {num}
                    </button>
                ))}

                {totalPages > 5 && current < totalPages - 2 && (
                    <>
                        <span className={styles.paginationEllipsis}>…</span>
                        <button
                            className={styles.pageNumber}
                            onClick={() => onChange(totalPages)}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    className={styles.pageBtn}
                    onClick={() => onChange(current + 1)}
                    disabled={current === totalPages}
                    aria-label="Trang tiếp"
                >
                    <ChevronRightIcon />
                </button>
            </div>
        </div>
    );
}

// ─── Loading Spinner ────────────────────────────────────

function LoadingSpinner({ text }: { text: string }) {
    return (
        <div className={styles.stateContainer}>
            <div className={styles.spinner} />
            <p className={styles.stateText}>{text}</p>
        </div>
    );
}

// ─── Empty State ────────────────────────────────────────

function EmptyState({ text, icon }: { text: string; icon?: React.ReactNode }) {
    return (
        <div className={styles.stateContainer}>
            {icon || (
                <svg className={styles.emptyIcon} width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M4 14H36" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M16 22H24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M18 26H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            )}
            <p className={styles.stateText}>{text}</p>
        </div>
    );
}

// ─── Main DataTable Component ───────────────────────────

function DataTable<T extends Record<string, any>>({
    columns,
    data,
    rowKey,
    loading = false,
    loadingText = 'Đang tải dữ liệu...',
    emptyText = 'Chưa có dữ liệu',
    emptyIcon,
    onRowClick,
    pagination,
    className,
    minWidth = 700,
}: DataTableProps<T>) {
    const getRowKey = (record: T, index: number): string | number => {
        if (typeof rowKey === 'function') return rowKey(record);
        return record[rowKey] as string | number ?? index;
    };

    const getCellContent = (column: DataTableColumn<T>, record: T, index: number): React.ReactNode => {
        if (column.render) return column.render(record, index);
        if (column.dataIndex) return record[column.dataIndex] as React.ReactNode;
        return null;
    };

    return (
        <div className={`${styles.tableWrapper} ${className || ''}`}>
            {loading ? (
                <LoadingSpinner text={loadingText} />
            ) : data.length === 0 ? (
                <EmptyState text={emptyText} icon={emptyIcon} />
            ) : (
                <>
                    <div className={styles.tableScroll}>
                        <table className={styles.table} style={{ minWidth }}>
                            <thead>
                                <tr>
                                    {columns.map((col) => (
                                        <th
                                            key={col.key}
                                            className={`${styles.th} ${col.hideOnMobile ? styles.hideOnMobile : ''}`}
                                            style={{
                                                textAlign: col.align || 'left',
                                                minWidth: col.minWidth,
                                                maxWidth: col.maxWidth,
                                                width: col.width,
                                            }}
                                        >
                                            {col.title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((record, rowIndex) => (
                                    <tr
                                        key={getRowKey(record, rowIndex)}
                                        className={`${styles.row} ${onRowClick ? styles.clickableRow : ''}`}
                                        onClick={() => onRowClick?.(record, rowIndex)}
                                    >
                                        {columns.map((col) => (
                                            <td
                                                key={col.key}
                                                className={`${styles.td} ${col.hideOnMobile ? styles.hideOnMobile : ''}`}
                                                style={{
                                                    textAlign: col.align || 'left',
                                                    minWidth: col.minWidth,
                                                    maxWidth: col.maxWidth,
                                                    width: col.width,
                                                }}
                                            >
                                                {getCellContent(col, record, rowIndex)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pagination && <TablePagination config={pagination} />}
                </>
            )}
        </div>
    );
}

export default DataTable;
