import React from 'react';
import styles from './PageContainer.module.css';

export interface PageContainerProps {
    /** Small contextual label shown above the title */
    eyebrow?: React.ReactNode;
    /** Page title (h1) */
    title?: string;
    /** Optional subtitle or date text displayed beside the title */
    subtitle?: React.ReactNode;
    /** Optional action element (button/link) rendered on the right side of the header */
    headerAction?: React.ReactNode;
    /** Content width constraint. Default: standard */
    maxWidth?: 'standard' | 'wide' | 'full';
    /** Page content */
    children: React.ReactNode;
    /** Custom className */
    className?: string;
}

/**
 * Reusable page container component that wraps page content with
 * consistent padding, max-width, and an optional page header (title + subtitle + action).
 * Design based on TutorPortal dashboard's ".dashboard" + ".header" pattern.
 */
const PageContainer: React.FC<PageContainerProps> = ({
    eyebrow,
    title,
    subtitle,
    headerAction,
    maxWidth = 'standard',
    children,
    className,
}) => {
    const hasHeader = eyebrow || title || subtitle || headerAction;

    return (
        <div className={`${styles.pageContainer} ${styles[`max_${maxWidth}`]} ${className || ''}`}>
            {hasHeader && (
                <div className={styles.pageHeader}>
                    <div className={styles.pageHeaderLeft}>
                        {eyebrow && <span className={styles.pageEyebrow}>{eyebrow}</span>}
                        {title && <h1 className={styles.pageTitle}>{title}</h1>}
                        {subtitle && <span className={styles.pageSubtitle}>{subtitle}</span>}
                    </div>
                    {headerAction && (
                        <div className={styles.pageHeaderRight}>{headerAction}</div>
                    )}
                </div>
            )}
            {children}
        </div>
    );
};

export default PageContainer;
