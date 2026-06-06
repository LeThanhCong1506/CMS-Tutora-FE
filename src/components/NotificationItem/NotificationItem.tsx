import type { KeyboardEvent } from 'react';
import type { NotificationDTO } from '../../services/notification.service';
import styles from './NotificationItem.module.css';

interface NotificationItemProps {
    notification: NotificationDTO;
    onClick?: (notification: NotificationDTO) => void;
}

const getNotificationIcon = (notification: NotificationDTO) => {
    const title = `${notification.title} ${notification.message}`.toLowerCase();

    if (title.includes('booking') || title.includes('request') || title.includes('đặt lịch')) {
        return 'event_available';
    }
    if (title.includes('payment') || title.includes('paid') || title.includes('payout') || title.includes('thanh toán')) {
        return 'payments';
    }
    if (title.includes('message') || title.includes('chat') || title.includes('tin nhắn')) {
        return 'forum';
    }
    if (title.includes('warning') || title.includes('cảnh báo') || title.includes('suspend')) {
        return 'warning';
    }

    return 'notifications';
};

const getTimeAgo = (createdAt?: string | null) => {
    if (!createdAt) return '';

    const created = new Date(createdAt);
    const diffMs = Date.now() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return created.toLocaleDateString('vi-VN');
};

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onClick?.(notification);
    };

    return (
        <div
            className={`${styles.notificationItem} ${!notification.isread ? styles.unread : ''}`}
            onClick={() => onClick?.(notification)}
            onKeyDown={handleKeyDown}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <div className={styles.iconWrapper}>
                <span className={`material-symbols-outlined ${styles.icon}`}>
                    {getNotificationIcon(notification)}
                </span>
            </div>
            <div className={styles.content}>
                <div className={styles.titleRow}>
                    <h4 className={styles.title}>{notification.title}</h4>
                    {!notification.isread && <span className={styles.unreadBadge}>Mới</span>}
                </div>
                <p className={styles.message}>{notification.message}</p>
                <span className={styles.time}>{getTimeAgo(notification.createdat)}</span>
            </div>
        </div>
    );
};

export default NotificationItem;
