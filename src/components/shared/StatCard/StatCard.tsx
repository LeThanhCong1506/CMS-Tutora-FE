import React from 'react';
import styles from './StatCard.module.css';

export interface StatCardProps {
    /** Icon element displayed in the card header */
    icon: React.ReactNode;
    /** The main numeric/text value */
    value: React.ReactNode;
    /** Short label below the value */
    label: string;
    /** Optional sub-label for supplementary info */
    subLabel?: React.ReactNode;
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
    badge,
    badgeVariant = 'green',
    onClick,
    className,
}) => {
    return (
        <div
            className={`${styles.statCard} ${onClick ? styles.clickable : ''} ${className || ''}`}
            onClick={onClick}
        >
            <div className={styles.statHeader}>
                <div className={styles.statIcon}>{icon}</div>
                {badge && (
                    <span className={`${styles.statBadge} ${styles[`badge_${badgeVariant}`]}`}>
                        {badge}
                    </span>
                )}
            </div>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
            {subLabel && <div className={styles.statSubLabel}>{subLabel}</div>}
        </div>
    );
};

export default StatCard;
