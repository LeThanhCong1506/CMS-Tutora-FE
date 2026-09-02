import React from 'react';
import InfoHint from './InfoHint';

/** Màu nền ô icon. Mặc định trung tính — chỉ nhuộm khi con số tự nó mang sắc thái. */
export type MetricTone = 'neutral' | 'green' | 'blue' | 'orange' | 'red';

/**
 * Tô nền cho CHÍNH CON SỐ, khác `MetricTone` (vốn chỉ nhuộm ô icon).
 *
 * Đặt tên theo NGHĨA chứ không theo màu, vì đây là cặp đối lập chạy suốt cụm báo cáo:
 *
 *   recognised — tiền đã thành thật. Xanh emerald #10b981, đúng màu ĐƯỜNG LIỀN "Doanh thu đã
 *                ghi nhận" và viên thuốc `.rev-block-figure` ở đầu biểu đồ.
 *   pending    — tiền chưa chín. Vàng amber #f59e0b, đúng màu ĐƯỜNG ĐỨT "Doanh thu tạm tính"
 *                và nền con số tạm tính ở thẻ Phân bổ (tab Doanh thu).
 *
 * Trùng màu với biểu đồ thì mắt tự nối hai chỗ, khỏi cần thêm chú giải. Đổi bảng màu sau này
 * thì sửa ở CSS, tên prop vẫn đúng.
 */
export type MetricValueTone = 'recognised' | 'pending';

export interface MetricCardProps {
    icon: string;
    value: React.ReactNode;
    label: string;
    subLabel?: React.ReactNode;
    badge?: string;
    badgeVariant?: 'green' | 'blue' | 'orange' | 'dark' | 'red';
    tone?: MetricTone;
    /** Tô nền con số — xem `MetricValueTone`. Bỏ trống thì con số để trơn. */
    valueTone?: MetricValueTone;
    /** Định nghĩa con số — bắt buộc với thẻ tài chính để không ai phải đoán. */
    hint: string;
}

/**
 * Thẻ chỉ số cho báo cáo tài chính.
 *
 * Khác `StatCard` dùng chung ở chỗ có tooltip ⓘ giải thích con số.
 *
 * Bố cục ngang (icon trái — số/nhãn phải) thay cho bản xếp dọc cũ: một con số không
 * đáng chiếm 180px chiều cao, mà hàng chỉ số nào cũng nằm ngay đầu tab nên chiều cao
 * của nó quyết định người đọc thấy được bao nhiêu nội dung ở màn hình đầu tiên.
 */
const MetricCard: React.FC<MetricCardProps> = ({
    icon,
    value,
    label,
    subLabel,
    badge,
    badgeVariant = 'green',
    tone = 'neutral',
    valueTone,
    hint,
}) => (
    <div className="rev-metric">
        <span
            className={`rev-metric-icon material-symbols-outlined${
                tone === 'neutral' ? '' : ` rev-tone-${tone}`
            }`}
            aria-hidden="true"
        >
            {icon}
        </span>
        <div className="rev-metric-body">
            <div className="rev-metric-top">
                <span
                    className={`rev-metric-value${valueTone ? ` is-${valueTone}` : ''}`}
                >
                    {value}
                </span>
                {badge && (
                    <span className={`rev-metric-badge rev-badge-${badgeVariant}`}>{badge}</span>
                )}
            </div>
            <div className="rev-metric-label">
                {label}
                <InfoHint text={hint} />
            </div>
            {subLabel && <div className="rev-metric-sub">{subLabel}</div>}
        </div>
    </div>
);

export default MetricCard;
