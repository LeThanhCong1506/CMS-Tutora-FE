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
    /**
     * Biểu đồ chính của khối. Bỏ trống khi khối chỉ gồm những biểu đồ ngang hàng nhau —
     * lúc đó tất cả nằm trong `split` và không cái nào được phóng to hơn cái nào.
     */
    children?: React.ReactNode;
    /** Cho phép cuộn ngang nội dung (bảng rộng) */
    scrollX?: boolean;
    /**
     * Biểu đồ phụ cùng chủ đề, nằm trong CÙNG khung với biểu đồ chính, ngăn nhau bằng
     * đường kẻ dọc.
     *
     * Trước đây mỗi biểu đồ là một `ChartBlock` riêng, nên hai biểu đồ cùng kể một câu
     * chuyện thành hai khung trắng, hai tiêu đề serif 15px và một khe 16px ở giữa. Gộp
     * vào đây thì còn một khung và một tiêu đề chính.
     *
     * `label` cố ý nhỏ hơn tiêu đề khối (12.5px, không phải h4 serif): tiêu đề khối đã
     * nói các biểu đồ này thuộc về nhau rồi, nhãn con chỉ cần phân biệt chúng với nhau.
     * Nhưng `hint` thì PHẢI giữ nguyên câu của biểu đồ cũ — gộp khung không được phép
     * làm mất lời giải thích, nếu không người đọc phải đoán từng biểu đồ qua trục.
     */
    split?: { label: string; hint?: string; node: React.ReactNode }[];
}

export const ChartBlock: React.FC<ChartBlockProps> = ({
    title,
    hint,
    subtitle,
    action,
    children,
    scrollX,
    split,
}) => (
    /* `rev-block-chart` chỉ làm một việc: gỡ `overflow: hidden` của `.rev-block`, vì cái đó đang
       cắt cụt hộp định nghĩa ⓘ ở tiêu đề — hộp dài hơn chiều cao thẻ thì mất phần đuôi.
       Không bỏ `overflow: hidden` ở `.rev-block` chung được: `DataTableShell` dùng chính nó để
       bọc bảng theo góc bo. Khối biểu đồ thì không cần: `.rev-block-body` đã chừa 8px nên
       không có gì chạm tới góc. Xem admin-revenue-reports.css. */
    <section className="rev-block rev-block-chart">
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
        {children && (
            <div className={scrollX ? 'rev-block-body rev-scroll-x' : 'rev-block-body'}>
                {children}
            </div>
        )}
        {split && split.length > 0 && (
            <div className="rev-split">
                {split.map((item) => (
                    <div className="rev-split-cell" key={item.label}>
                        <h5 className="rev-split-label">
                            {item.label}
                            {item.hint && <InfoHint text={item.hint} />}
                        </h5>
                        {item.node}
                    </div>
                ))}
            </div>
        )}
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
     * Không bảng nào trong cụm này còn `tfoot` cộng tổng — bỏ hết 02/09/2026. Các con số tổng
     * đều đã đứng ở dải chỉ số đầu tab, nơi chúng neo theo KỲ báo cáo; dòng tổng dưới bảng lại
     * cộng theo TẬP ĐANG LỌC, nên hai chỗ in hai con số khác nhau dưới cùng một chữ "tổng".
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
