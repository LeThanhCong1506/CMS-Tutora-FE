import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationDTO } from '../../services/notification.service';
import {
    getMyNotifications,
    getUnreadNotifications,
    markAsRead,
    markAllAsRead,
} from '../../services/notification.service';
import { getPortalPrefix, getNotificationTargetPath } from '../../utils/notificationNavigation';
import NotificationItem from '../NotificationItem/NotificationItem';
import styles from './NotificationDropdown.module.css';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onCountUpdate?: () => void;
}

type Tab = 'unread' | 'all';

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose, onCountUpdate }) => {
    const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('unread');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Fetch khi dropdown mở hoặc đổi tab
    useEffect(() => {
        if (!isOpen) return;
        const fetcher = activeTab === 'unread' ? getUnreadNotifications : getMyNotifications;
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const data = await fetcher();
                if (!cancelled) setNotifications(data);
            } catch (error) {
                console.error('Failed to fetch notifications:', error);
                if (!cancelled) setNotifications([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, activeTab]);

    // Close khi click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Đếm số chưa đọc trong list hiện tại (tab 'unread' = length; tab 'all' = filter).
    const unreadCount = useMemo(
        () => (activeTab === 'unread' ? notifications.length : notifications.filter((n) => !n.isread).length),
        [activeTab, notifications],
    );

    const handleNotificationClick = async (notification: NotificationDTO) => {
        try {
            if (!notification.isread) {
                await markAsRead(notification.notificationid);
                // Cập nhật local list:
                //   - Tab 'all': flip isread sang true (giữ item)
                //   - Tab 'unread': bỏ khỏi list
                setNotifications((prev) =>
                    activeTab === 'all'
                        ? prev.map((n) =>
                              n.notificationid === notification.notificationid ? { ...n, isread: true } : n,
                          )
                        : prev.filter((n) => n.notificationid !== notification.notificationid),
                );
                onCountUpdate?.();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
        onClose();
        navigate(getNotificationTargetPath(notification));
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            // Tab 'all': flip mọi item về isread=true. Tab 'unread': rỗng list.
            setNotifications((prev) =>
                activeTab === 'all' ? prev.map((n) => ({ ...n, isread: true })) : [],
            );
            onCountUpdate?.();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleViewAll = () => {
        onClose();
        navigate(`${getPortalPrefix()}/notifications`);
    };

    if (!isOpen) return null;

    return (
        <div ref={dropdownRef} className={styles.dropdown}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h3 className={styles.title}>Thông báo</h3>
                    {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                </div>
                <div className={styles.headerActions}>
                    {unreadCount > 0 && (
                        <button className={styles.markAllBtn} onClick={handleMarkAllAsRead}>
                            Đọc tất cả
                        </button>
                    )}
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                d="M6 6l12 12M6 18L18 6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tabs: Chưa đọc / Tất cả */}
            <div className={styles.tabs} role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'unread'}
                    className={`${styles.tab} ${activeTab === 'unread' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('unread')}
                >
                    <span>Chưa đọc</span>
                    {activeTab === 'unread' && notifications.length > 0 && (
                        <span className={styles.tabBadge}>{notifications.length}</span>
                    )}
                    {activeTab !== 'unread' && unreadCount > 0 && (
                        <span className={styles.tabBadge}>{unreadCount}</span>
                    )}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'all'}
                    className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    <span>Tất cả</span>
                    {activeTab === 'all' && notifications.length > 0 && (
                        <span className={styles.tabBadge}>{notifications.length}</span>
                    )}
                </button>
            </div>

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Đang tải thông báo...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className={styles.empty}>
                        <div className={styles.emptyIcon}>
                            <span className="material-symbols-outlined">notifications_off</span>
                        </div>
                        <p className={styles.emptyTitle}>
                            {activeTab === 'unread' ? 'Không có thông báo mới' : 'Bạn chưa có thông báo nào'}
                        </p>
                        <p className={styles.emptySubtitle}>
                            {activeTab === 'unread'
                                ? 'Bạn đã xem hết tất cả thông báo rồi!'
                                : 'Thông báo sẽ xuất hiện ở đây khi có hoạt động mới.'}
                        </p>
                    </div>
                ) : (
                    <div className={styles.notificationList}>
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.notificationid}
                                notification={notification}
                                onClick={handleNotificationClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.footer}>
                <button className={styles.viewAllBtn} onClick={handleViewAll}>
                    Xem tất cả thông báo
                </button>
            </div>
        </div>
    );
};

export default NotificationDropdown;
