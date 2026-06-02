import type { NotificationDTO } from '../../services/notification.service';
import styles from './NotificationItem.module.css';
import { ReadOutlined, MessageOutlined, CreditCardOutlined, CalendarOutlined } from '@ant-design/icons';

interface NotificationItemProps {
    notification: NotificationDTO;
    onClick?: (notification: NotificationDTO) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClick }) => {
    const getNotificationIcon = () => {
        const title = notification.title.toLowerCase();
        if (title.includes('booking') || title.includes('request')) {
            return <ReadOutlined className={styles.icon} />;
        }
        if (title.includes('message')) {
            return <MessageOutlined className={styles.icon} />;
        }
        if (title.includes('payment') || title.includes('paid')) {
            return <CreditCardOutlined className={styles.icon} />;
        }
        if (title.includes('schedule') || title.includes('session')) {
            return <CalendarOutlined className={styles.icon} />;
        }
        return <MessageOutlined className={styles.icon} />;
    };

    const getTimeAgo = () => {
        if (!notification.createdat) return '';
        const now = new Date();
        const utc7Offset = 7 * 60 * 60 * 1000;
        const created = new Date(new Date(notification.createdat).getTime() + utc7Offset);
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return created.toLocaleDateString('vi-VN');
    };

    return (
        <div
            className={`${styles.notificationItem} ${!notification.isread ? styles.unread : ''}`}
            onClick={() => onClick?.(notification)}
        >
            <div className={styles.iconWrapper}>
                {getNotificationIcon()}
            </div>
            <div className={styles.content}>
                <h4 className={styles.title}>{notification.title}</h4>
                <p className={styles.message}>{notification.message}</p>
                <span className={styles.time}>{getTimeAgo()}</span>
            </div>
        </div>
    );
};

export default NotificationItem;
