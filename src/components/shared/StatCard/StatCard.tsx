import React from 'react';
import styles from './StatCard.module.css';

// Ẩn danh, style khớp bộ icon SVG stroke đã dùng ở InputGroup.tsx.
const InfoIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    /** Short label below the value */
    label: string;
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
    label,
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
                <div className={styles.statIcon}>{icon}</div>
                {badge && (
                    <span className={`${styles.statBadge} ${styles[`badge_${badgeVariant}`]}`}>
                        {badge}
                    </span>
                )}
            </div>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabelRow}>
                <span className={styles.statLabel}>{label}</span>
                {infoTooltip && (
                    <span
                        className={styles.infoTooltip}
                        tabIndex={0}
                        role="img"
                        aria-label={`Thông tin: ${infoTooltip}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <InfoIcon />
                        <span className={styles.infoTooltipBubble}>{infoTooltip}</span>
                    </span>
                )}
            </div>
            {subLabel && <div className={styles.statSubLabel}>{subLabel}</div>}
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                className={`${styles.statCard} ${styles.clickable} ${className || ''}`}
                onClick={onClick}
            >
                {content}
            </button>
        );
    }

    return (
        <div className={`${styles.statCard} ${className || ''}`}>
            {content}
        </div>
    );
};

export default StatCard;
