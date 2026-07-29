import React from 'react';
import InfoHint from './InfoHint';

export interface MetricCardProps {
    icon: string;
    value: React.ReactNode;
    label: string;
    subLabel?: React.ReactNode;
    badge?: string;
    badgeVariant?: 'green' | 'blue' | 'orange' | 'dark' | 'red';
    /** Định nghĩa con số — bắt buộc với thẻ tài chính để không ai phải đoán. */
    hint: string;
}

/**
 * Thẻ chỉ số cho báo cáo tài chính.
 *
 * Khác `StatCard` dùng chung ở chỗ có tooltip ⓘ giải thích con số.
 */
const MetricCard: React.FC<MetricCardProps> = ({
    icon,
    value,
    label,
    subLabel,
    badge,
    badgeVariant = 'green',
    hint,
}) => (
    <div className="rev-metric">
        <div className="rev-metric-head">
            <span className="rev-metric-icon material-symbols-outlined">{icon}</span>
            {badge && (
                <span className={`rev-metric-badge rev-badge-${badgeVariant}`}>{badge}</span>
            )}
        </div>
        <div className="rev-metric-value">{value}</div>
        <div className="rev-metric-label">
            {label}
            <InfoHint text={hint} />
        </div>
        {subLabel && <div className="rev-metric-sub">{subLabel}</div>}
    </div>
);

export default MetricCard;
