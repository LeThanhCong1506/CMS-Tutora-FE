import React from 'react';
import { TablePagination } from '@/components/shared';
import type { PaginationConfig } from '@/components/shared';
import InfoHint from './InfoHint';

// Trạng thái lỗi / rỗng
export const ReportError: React.FC<{ message: string; onRetry?: () => void }> = ({
    message,
    onRetry,
}) => (
    <div className="rev-state rev-state-error">
        <span className="material-symbols-outlined">error</span>
        <p>{message}</p>
        {onRetry && (
            <button type="button" className="rev-retry" onClick={onRetry}>
                Thử lại
            </button>
        )}
    </div>
);

export const ReportEmpty: React.FC<{ label?: string }> = ({
    label = 'Chưa có dữ liệu trong khoảng thời gian này',
}) => (
    <div className="rev-state">
        <span className="material-symbols-outlined">bar_chart</span>
        <p>{label}</p>
    </div>
);

// Khối biểu đồ
interface ChartBlockProps {
    title: string;
    /** Câu hỏi biểu đồ trả lời */
    hint?: string;
    subtitle?: string;
    /** Nội dung phụ ở góc phải header */
    action?: React.ReactNode;
    children: React.ReactNode;
    /** Cho phép cuộn ngang nội dung (bảng rộng) */
    scrollX?: boolean;
}

export const ChartBlock: React.FC<ChartBlockProps> = ({
    title,
    hint,
    subtitle,
    action,
    children,
    scrollX,
}) => (
    <section className="rev-block">
        <header className="rev-block-head">
            <div className="rev-block-text">
                <h4>
                    {title}
                    {hint && <InfoHint text={hint} />}
                </h4>
                {subtitle && <p>{subtitle}</p>}
            </div>
            {action && <div className="rev-block-action">{action}</div>}
        </header>
        <div className={scrollX ? 'rev-block-body rev-scroll-x' : 'rev-block-body'}>
            {children}
        </div>
    </section>
);

// Bảng
export const DataTableShell: React.FC<{
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    /** Nội dung phụ ở góc phải header — bộ chọn cách sắp xếp, nút xuất dữ liệu… */
    action?: React.ReactNode;
    /**
     * Phân trang phía client. Bảng chi tiết ở các tab này nhận nguyên mảng từ API nên khi dữ
     * liệu nhiều, trang bị kéo dài hàng nghìn dòng. `TablePagination` tự ẩn khi chỉ có một
     * trang, nên truyền vào luôn kể cả với bảng ngắn.
     *
     * Dòng tổng ở `tfoot` vẫn phải cộng trên TOÀN BỘ dữ liệu, không phải trên trang đang xem.
     */
    pagination?: PaginationConfig;
}> = ({ title, subtitle, children, action, pagination }) => (
    <section className="rev-block">
        <header className="rev-block-head">
            <div className="rev-block-text">
                <h4>{title}</h4>
                {subtitle && <p>{subtitle}</p>}
            </div>
            {action && <div className="rev-block-action">{action}</div>}
        </header>
        <div className="rev-table-wrap">{children}</div>
        {pagination && (
            <div className="rev-table-pagination">
                <TablePagination config={pagination} />
            </div>
        )}
    </section>
);
