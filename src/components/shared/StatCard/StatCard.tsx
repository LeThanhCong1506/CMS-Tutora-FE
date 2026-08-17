import React from 'react';
import styles from './StatCard.module.css';

// Ẩn danh, style khớp bộ icon SVG stroke đã dùng ở InputGroup.tsx.
const InfoIcon = () => (
    <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
    >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

export interface StatCardProps {
    /** Icon element displayed in the card header */
    icon: React.ReactNode;
    /** The main numeric/text value */
    value: React.ReactNode;
    /** Optional className for the main value (for example, exact long currency values) */
    valueClassName?: string;
    /** Short label below the value */
    label: string;
    /** Optional className for the label */
    labelClassName?: string;
    /** Optional sub-label for supplementary info */
    subLabel?: React.ReactNode;
    /** Optional tooltip explaining what this card means, shown via an info icon next to the label */
    infoTooltip?: string;
    /** Optional badge text shown next to the icon (e.g. "+12%", "Tuần này") */
    badge?: string;
    /** Badge color variant */
    badgeVariant?: 'green' | 'blue' | 'orange' | 'dark' | 'red';
    /** Click handler for the whole card */
    onClick?: () => void;
    /** Custom className to append */
    className?: string;
}

/**
 * Reusable stat card component used across all portal dashboards.
 * Design based on the Tutor Portal dashboard "statCard" pattern.
 */
const StatCard: React.FC<StatCardProps> = ({
    icon,
    value,
    valueClassName,
    label,
    labelClassName,
    subLabel,
    infoTooltip,
    badge,
    badgeVariant = 'green',
    onClick,
    className,
}) => {
    const content = (
        <>
            <div className={styles.statHeader}>
                <div className={styles.statIcon} aria-hidden="true">
                    {icon}
                </div>
                {badge && <span className={`${styles.statBadge} ${styles[`badge_${badgeVariant}`]}`}>{badge}</span>}
            </div>
            <div className={`${styles.statValue} ${valueClassName || ''}`}>{value}</div>
            <div className={styles.statLabelRow}>
                <span className={`${styles.statLabel} ${labelClassName || ''}`}>{label}</span>
                {infoTooltip && (
                    <button
                        type="button"
                        className={styles.infoTooltip}
                        aria-label={`Giải thích chỉ số: ${infoTooltip}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <InfoIcon />
                        <span className={styles.infoTooltipBubble} role="tooltip">
                            {infoTooltip}
                        </span>
                    </button>
                )}
            </div>
            {subLabel && <div className={styles.statSubLabel}>{subLabel}</div>}
        </>
    );

    if (onClick) {
        return (
            <div className={`${styles.statCard} ${styles.clickable} ${className || ''}`}>
                <button
                    type="button"
                    className={styles.cardClickTarget}
                    onClick={onClick}
                    aria-label={`Mở chi tiết: ${label}`}
                />
                {content}
            </div>
        );
    }

    return <div className={`${styles.statCard} ${className || ''}`}>{content}</div>;
};

export default StatCard;
