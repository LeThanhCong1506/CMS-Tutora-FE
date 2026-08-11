import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FilterTabs, PageContainer, SectionCard, StatCard, StatusBadge } from '../../components/shared';
import NotificationItem from '../../components/NotificationItem/NotificationItem';
import type { NotificationDTO } from '../../services/notification.service';
import { getMyNotifications, markAllAsRead, markAsRead } from '../../services/notification.service';
import { getNotificationTargetPath } from '../../utils/notificationNavigation';
import { useTabParam } from '../../hooks/useTabParam';
import styles from './styles.module.css';

const NOTIFICATION_FILTERS = ['all', 'unread', 'read'] as const;
type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useTabParam<NotificationFilter>(NOTIFICATION_FILTERS, 'all');
    const navigate = useNavigate();

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getMyNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchNotifications();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchNotifications]);

    const unreadCount = useMemo(
        () => notifications.filter((notification) => !notification.isread).length,
        [notifications],
    );
    const readCount = notifications.length - unreadCount;

    const filteredNotifications = useMemo(() => {
        if (activeFilter === 'unread') {
            return notifications.filter((notification) => !notification.isread);
        }
        if (activeFilter === 'read') {
            return notifications.filter((notification) => notification.isread);
        }
        return notifications;
    }, [activeFilter, notifications]);

    const handleNotificationClick = async (notification: NotificationDTO) => {
        try {
            if (!notification.isread) {
                await markAsRead(notification.notificationid);
                setNotifications((previous) =>
                    previous.map((item) =>
                        item.notificationid === notification.notificationid ? { ...item, isread: true } : item,
                    ),
                );
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            toast.error('Không thể cập nhật trạng thái thông báo');
        }

        navigate(getNotificationTargetPath(notification));
    };

    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0) return;

        try {
            await markAllAsRead();
            setNotifications((previous) => previous.map((notification) => ({ ...notification, isread: true })));
            toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            toast.error('Không thể đánh dấu tất cả thông báo');
        }
    };

    return (
        <PageContainer
            title="Thông báo"
            subtitle="Theo dõi các sự kiện hệ thống, giao dịch và tác vụ cần admin xử lý."
            headerAction={
                <div className="admin-ui-actions">
                    <button
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={() => void fetchNotifications()}
                        type="button"
                    >
                        <span className="material-symbols-outlined">refresh</span>
                        Làm mới
                    </button>
                    {unreadCount > 0 && (
                        <button
                            className="admin-ui-button admin-ui-button-primary"
                            onClick={() => void handleMarkAllAsRead()}
                            type="button"
                        >
                            <span className="material-symbols-outlined">done_all</span>
                            Đánh dấu tất cả đã đọc
                        </button>
                    )}
                </div>
            }
        >
            <div className="admin-ui-kpi-grid">
                <StatCard
                    icon={<span className="material-symbols-outlined">notifications</span>}
                    value={notifications.length}
                    label="Tổng thông báo"
                    subLabel="Trong hộp thông báo của admin"
                    badge="All"
                    badgeVariant="dark"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">mark_email_unread</span>}
                    value={unreadCount}
                    label="Chưa đọc"
                    subLabel="Cần admin xem hoặc xử lý"
                    badge={unreadCount > 0 ? 'Cần xem' : 'Ổn định'}
                    badgeVariant={unreadCount > 0 ? 'orange' : 'green'}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">mark_email_read</span>}
                    value={readCount}
                    label="Đã đọc"
                    subLabel="Đã được admin mở qua"
                    badge="Read"
                    badgeVariant="blue"
                />
            </div>

            <SectionCard
                title="Hộp thông báo"
                subtitle="Click vào từng thông báo để mở đúng màn hình liên quan."
                headerAction={
                    unreadCount > 0 ? (
                        <StatusBadge variant="warning">{unreadCount} chưa đọc</StatusBadge>
                    ) : (
                        <StatusBadge variant="success">Đã xử lý</StatusBadge>
                    )
                }
            >
                <div className="admin-ui-toolbar">
                    <FilterTabs
                        tabs={[
                            { key: 'all', label: `Tất cả (${notifications.length})` },
                            { key: 'unread', label: `Chưa đọc (${unreadCount})` },
                            { key: 'read', label: `Đã đọc (${readCount})` },
                        ]}
                        activeKey={activeFilter}
                        onChange={(key) => setActiveFilter(key as NotificationFilter)}
                    />
                </div>

                {loading ? (
                    <div className="admin-ui-muted-state">Đang tải thông báo...</div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="admin-ui-muted-state">
                        {activeFilter === 'unread'
                            ? 'Không còn thông báo chưa đọc.'
                            : activeFilter === 'read'
                            ? 'Chưa có thông báo đã đọc.'
                            : 'Bạn chưa có thông báo nào.'}
                    </div>
                ) : (
                    <div className={styles.list}>
                        {filteredNotifications.map((notification) => (
                            <NotificationItem
                                key={notification.notificationid}
                                notification={notification}
                                onClick={handleNotificationClick}
                            />
                        ))}
                    </div>
                )}
            </SectionCard>
        </PageContainer>
    );
};

export default NotificationsPage;
