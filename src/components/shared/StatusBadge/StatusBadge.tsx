import React from 'react';
import styles from './StatusBadge.module.css';

export type StatusVariant =
    | 'success'    // green — đã xác nhận, hoàn thành, đã duyệt
    | 'warning'    // orange/amber — chờ xử lý, sắp tới
    | 'error'      // red — đã hủy, từ chối, leo thang
    | 'info'       // blue — đã liên kết, đang xử lý
    | 'neutral'    // grey — nháp, mặc định
    | 'dark';      // dark — đang chờ duyệt

export interface StatusBadgeProps {
    /** Display text of the badge */
    children: React.ReactNode;
    /** Color variant */
    variant?: StatusVariant;
    /** Render as pill (border-radius full) or tag (smaller radius). Default: 'pill' */
    shape?: 'pill' | 'tag';
    /** Custom className */
    className?: string;
}

/**
 * Reusable status badge component for displaying states like
 * "Đã xác nhận", "Chờ xử lý", "Đã hủy", etc.
 * Design based on TutorPortal's lessonStatus / pendingBadge patterns.
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
    children,
    variant = 'neutral',
    shape = 'pill',
    className,
}) => {
    return (
        <span
            className={`${styles.badge} ${styles[variant]} ${styles[shape]} ${className || ''}`}
        >
            {children}
        </span>
    );
};

export default StatusBadge;
