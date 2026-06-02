import React from 'react';
import styles from './SectionCard.module.css';

export interface SectionCardProps {
    /** Optional title displayed in the card header */
    title?: string;
    /** Optional action element (button/link) rendered on the right side of the header */
    headerAction?: React.ReactNode;
    /** Whether the header has a bottom border separator. Default: true */
    headerBorder?: boolean;
    /** Card content */
    children: React.ReactNode;
    /** If true, children are wrapped with default padding. Default: false (no padding, full control) */
    padded?: boolean;
    /** Custom className */
    className?: string;
    /** Custom data attributes for tour/testing */
    dataTour?: string;
}

/**
 * Reusable section card component — the white rounded container used throughout all portals.
 * Design based on TutorPortal's ".sectionCard" pattern.
 */
const SectionCard: React.FC<SectionCardProps> = ({
    title,
    headerAction,
    headerBorder = true,
    children,
    padded = false,
    className,
    dataTour,
}) => {
    const hasHeader = title || headerAction;

    return (
        <div
            className={`${styles.sectionCard} ${className || ''}`}
            data-tour={dataTour}
        >
            {hasHeader && (
                <div className={`${styles.sectionHeader} ${headerBorder ? styles.withBorder : ''}`}>
                    {title && <h3 className={styles.sectionTitle}>{title}</h3>}
                    {headerAction && <div className={styles.headerAction}>{headerAction}</div>}
                </div>
            )}
            <div className={padded ? styles.paddedContent : undefined}>
                {children}
            </div>
        </div>
    );
};

export default SectionCard;
