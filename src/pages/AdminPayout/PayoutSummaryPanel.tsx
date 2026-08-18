import React from 'react';

/**
 * Tấm tóm tắt dùng chung cho các màn payout: một con số lớn bên trái, vài dữ kiện phụ bên phải.
 * Trước đây markup này nằm riêng trong từng trang, nên khi dọn CSS ở 8df2e8a thì trang Chuyển tiền
 * chủ động mất sạch style mà không ai phát hiện. Gom về một chỗ để hai màn không lệch nhau nữa.
 */

export const PayoutSummaryFact = ({
    icon,
    label,
    children,
    className,
}: {
    icon: string;
    label: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={`payout-summary-fact ${className || ''}`}>
        <span className="payout-summary-fact__icon material-symbols-outlined" aria-hidden="true">
            {icon}
        </span>
        <div className="payout-summary-fact__copy">
            <span>{label}</span>
            <div>{children}</div>
        </div>
    </div>
);

interface PayoutSummaryPanelProps {
    /** Nhãn của con số chính, ví dụ "Số tiền cần chuyển". */
    label: string;
    /** Con số chính đã format sẵn. */
    amount: React.ReactNode;
    /** Dòng chú thích nhỏ dưới con số. */
    hint?: React.ReactNode;
    /** Các <PayoutSummaryFact> hiển thị ở cột phải. */
    children: React.ReactNode;
    ariaLabel: string;
}

const PayoutSummaryPanel: React.FC<PayoutSummaryPanelProps> = ({
    label,
    amount,
    hint,
    children,
    ariaLabel,
}) => (
    <section className="payout-summary-panel" aria-label={ariaLabel}>
        <div className="payout-summary-panel__amount">
            <span className="payout-summary-panel__label">{label}</span>
            <strong>{amount}</strong>
            {hint && <small>{hint}</small>}
        </div>

        <div className="payout-summary-panel__facts">{children}</div>
    </section>
);

export default PayoutSummaryPanel;
