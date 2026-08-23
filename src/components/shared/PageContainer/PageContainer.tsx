import React from 'react';
import styles from './PageContainer.module.css';

export interface PageContainerProps {
    /** Small contextual label shown above the title */
    eyebrow?: React.ReactNode;
    /** Optional tooltip explaining the page, shown beside the eyebrow */
    eyebrowInfo?: string;
    /** Page title (h1) */
    title?: string;
    /** Optional tooltip explaining the page, shown via a help icon beside the title */
    titleInfo?: string;
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
    eyebrowInfo,
    title,
    titleInfo,
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
                        {eyebrow && (
                            <div className={styles.pageEyebrowRow}>
                                <span className={styles.pageEyebrow}>{eyebrow}</span>
                                {eyebrowInfo && (
                                    <button
                                        type="button"
                                        className={`${styles.pageTitleInfo} ${styles.pageEyebrowInfo}`}
                                        aria-label={`Thông tin: ${eyebrowInfo}`}
                                    >
                                        <span className="material-symbols-outlined" aria-hidden="true">
                                            help
                                        </span>
                                        <span
                                            className={`${styles.pageTitleInfoBubble} ${styles.pageEyebrowInfoBubble}`}
                                            role="tooltip"
                                        >
                                            {eyebrowInfo}
                                        </span>
                                    </button>
                                )}
                            </div>
                        )}
                        {title && (
                            <div className={styles.pageTitleRow}>
                                <h1 className={styles.pageTitle}>{title}</h1>
                                {titleInfo && (
                                    <button
                                        type="button"
                                        className={styles.pageTitleInfo}
                                        aria-label={`Thông tin: ${titleInfo}`}
                                    >
                                        <span className="material-symbols-outlined" aria-hidden="true">
                                            help
                                        </span>
                                        <span className={styles.pageTitleInfoBubble} role="tooltip">
                                            {titleInfo}
                                        </span>
                                    </button>
                                )}
                            </div>
                        )}
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
