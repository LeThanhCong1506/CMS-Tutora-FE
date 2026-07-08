import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './PortalLayout.module.css';

import NotificationDropdown from '../../NotificationDropdown/NotificationDropdown';
import { clearUserFromStorage, getUserInfoFromToken, getUserProfile } from '../../../services/auth.service';
import { getUnreadCount } from '../../../services/notification.service';
import { signalRService } from '../../../services/signalr.service';

// Admin repo: web-only. Original Agora-Frontend has a Zalo Mini App branch
// (sidebar hidden, bottom nav shown). Stripped here — inMiniApp is always false.
const inMiniApp = false;

// ─── Shared Icons (Logo, Menu, Close, Logout, Notification) ───

const LogoIcon = () => (
    <img src="/tutora-logo.png" alt="Tutora" width="28" height="28" />
);

const NotificationIcon = () => (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="currentColor">
        <path d="M9 0C5.68629 0 3 2.68629 3 6V11L1 14V15H17V14L15 11V6C15 2.68629 12.3137 0 9 0Z" />
        <path d="M9 20C10.6569 20 12 18.6569 12 17H6C6 18.6569 7.34315 20 9 20Z" />
    </svg>
);

const MenuIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 5H17M3 10H17M3 15H17" strokeLinecap="round" />
    </svg>
);

const CloseIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 5L15 15M15 5L5 15" strokeLinecap="round" />
    </svg>
);

const LogoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 16H3C2.44772 16 2 15.5523 2 15V3C2 2.44772 2.44772 2 3 2H6" strokeLinecap="round" />
        <path d="M12 12L16 9L12 6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9H7" strokeLinecap="round" />
    </svg>
);

// ─── Types ───

export interface NavItem {
    path: string;
    label: string;
    /** React component icon (SVG) — used by Tutor, Parent, Student portals */
    icon?: React.ComponentType;
    /** Material Symbols icon name — used by Admin portal */
    materialIcon?: string;
    /** Show a numeric badge next to the label */
    badge?: number;
    /** data-tour attribute value */
    dataTour?: string;
    /** Optional sub-items. When present, clicking the item toggles an
     *  expandable group instead of navigating. */
    children?: NavItem[];
}

export interface PortalLayoutProps {
    /** Navigation items for the sidebar */
    navItems: NavItem[];
    /** Role label displayed next to user name in header (fallback from token) */
    userRole?: string;
    /** Custom active-path matcher. Defaults to `location.pathname.startsWith(path)` */
    isActive?: (path: string, locationPathname: string) => boolean;
    /** Extra content rendered on the left side of the header (e.g., next lesson indicator) */
    headerLeft?: React.ReactNode;
    /** Extra items appended at the bottom of the nav list (e.g., tour replay button) */
    sidebarNavFooter?: React.ReactNode;
    /** Whether to show the user card at the bottom of sidebar. Default: true */
    showSidebarUserCard?: boolean;
    /** Whether to show avatar image (from profile API) or just initials. Default: true */
    showAvatarImage?: boolean;
    /** Whether to show notification dropdown (with SignalR). Default: true */
    showNotificationDropdown?: boolean;
    /** Additional content rendered after the layout (e.g., tour modal) */
    extras?: React.ReactNode;
    /** data-tour attribute on the sidebar element */
    sidebarDataTour?: string;
    /** Callback when sidebar opens (for tour integration) */
    onSidebarOpen?: () => void;
    /** Callback when sidebar closes (for tour integration) */
    onSidebarClose?: () => void;
    /** External sidebar open state control (for tour) */
    sidebarOpenExternal?: boolean;
    children?: React.ReactNode;
}

// ─── Helpers ───

const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const generateAvatarUrl = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3d4a3e&color=f2f0e4&size=128`;

const getNotificationUserId = (notification: unknown) => {
    if (!notification || typeof notification !== 'object') return undefined;

    const { userid } = notification as { userid?: unknown };
    return typeof userid === 'string' ? userid : undefined;
};

// ─── Component ───

const PortalLayout: React.FC<PortalLayoutProps> = ({
    navItems,
    userRole,
    isActive: isActiveProp,
    headerLeft,
    sidebarNavFooter,
    showSidebarUserCard = true,
    showAvatarImage = true,
    showNotificationDropdown: showNotifDropdownProp = true,
    extras,
    sidebarDataTour,
    onSidebarOpen,
    onSidebarClose,
    sidebarOpenExternal,
    children,
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    // ── Sidebar state ──
    const [sidebarOpenInternal, setSidebarOpenInternal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    // Expand/collapse state for nav groups (items with children), keyed by path.
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const sidebarOpen = sidebarOpenExternal ?? sidebarOpenInternal;

    const setSidebarOpen = (open: boolean) => {
        setSidebarOpenInternal(open);
        if (open) onSidebarOpen?.();
        else onSidebarClose?.();
    };

    // Close sidebar on route change
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSidebarOpenInternal(false);
    }, [location.pathname]);

    // Scroll lock when sidebar open on mobile
    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    useEffect(() => {
        if (!showLogoutConfirm) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowLogoutConfirm(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showLogoutConfirm]);

    // ── User data ──
    const [viewingAvatar, setViewingAvatar] = useState(false);
    const [userData, setUserData] = useState({
        name: 'User',
        initials: 'U',
        role: userRole || 'USER',
        avatar: generateAvatarUrl('User'),
    });

    useEffect(() => {
        const user = getUserInfoFromToken();
        if (!user) return;

        const displayName = user.fullname ||
            (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
            user.email?.split('@')[0] ||
            'User';
        const initials = getInitials(displayName);

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUserData({
            name: displayName,
            initials,
            role: userRole || user.role || 'USER',
            avatar: generateAvatarUrl(displayName),
        });

        // Fetch real avatar from profile API (token-based; no id needed)
        if (showAvatarImage && user.userId) {
            getUserProfile().then((profile) => {
                const avatar = profile?.content?.avatarUrl || profile?.content?.avatarurl;
                if (avatar) {
                    setUserData(prev => ({ ...prev, avatar }));
                }
            }).catch(() => { /* keep fallback avatar */ });
        }
    }, [userRole, showAvatarImage]);

    // Listen for avatar updates dispatched by account pages after upload
    useEffect(() => {
        const handleAvatarUpdated = (e: Event) => {
            const newUrl = (e as CustomEvent<string>).detail;
            if (newUrl) {
                setUserData(prev => ({ ...prev, avatar: newUrl }));
            }
        };
        window.addEventListener('avatar-updated', handleAvatarUpdated);
        return () => window.removeEventListener('avatar-updated', handleAvatarUpdated);
    }, []);

    // ── Notifications ──
    const [notificationCount, setNotificationCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const count = await getUnreadCount();
                setNotificationCount(count);
            } catch { /* keep 0 */ }
        };
        fetchCount();

        const handleCountUpdate = (count: number) => setNotificationCount(count);
        const handleNewNotification = (notification: unknown) => {
            const user = getUserInfoFromToken();
            const currentUserId = user?.userId || user?.sub;
            const notificationUserId = getNotificationUserId(notification);
            if (notificationUserId && currentUserId && notificationUserId !== currentUserId) return;
            setNotificationCount(prev => prev + 1);
        };

        signalRService.onNotificationCountUpdated(handleCountUpdate);
        signalRService.onNotificationReceived(handleNewNotification);
        signalRService.connect().catch(() => {});

        return () => {
            signalRService.offNotificationCountUpdated();
            signalRService.offNotificationReceived();
        };
    }, []);

    const handleRefreshNotificationCount = async () => {
        try {
            const count = await getUnreadCount();
            setNotificationCount(count);
        } catch { /* ignore */ }
    };

    // ── Active path check ──
    const checkActive = (path: string) => {
        if (isActiveProp) return isActiveProp(path, location.pathname);
        return location.pathname.startsWith(path);
    };

    const handleConfirmLogout = () => {
        clearUserFromStorage();
        setShowLogoutConfirm(false);
        toast.success('Đăng xuất thành công!');
        navigate('/login');
    };

    // Icon + label + badge — shared by flat items, group toggles and sub-items.
    const renderNavContent = (item: NavItem) => (
        <>
            {item.icon ? (
                <item.icon />
            ) : item.materialIcon ? (
                <span className={`material-symbols-outlined ${styles.materialIcon}`}>
                    {item.materialIcon}
                </span>
            ) : null}
            <span className={styles.navText}>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
                <>
                    {/* Floating dot — hiển thị khi sidebar collapsed */}
                    <span className={styles.navBadgeDot}>
                        {item.badge > 99 ? '99+' : item.badge}
                    </span>
                    {/* Inline badge — hiển thị khi sidebar expanded */}
                    <span className={styles.navBadge}>{item.badge}</span>
                </>
            )}
        </>
    );

    // ── Render ──
    return (
        <div className={styles.layout}>
            {/* Mobile Sidebar Overlay — ẩn trong Mini App */}
            {!inMiniApp && sidebarOpen && (
                <div
                    className={styles.sidebarOverlay}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — ẩn trong Mini App (dùng bottom nav thay thế) */}
            {!inMiniApp && <aside
                className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
                {...(sidebarDataTour ? { 'data-tour': sidebarDataTour } : {})}
            >
                {/* Logo */}
                <div className={styles.sidebarLogo}>
                    <Link to="/admin-portal/dashboard" className={styles.logoLink}>
                        <LogoIcon />
                        <span className={styles.logoText}>TUTORA</span>
                    </Link>
                    <button
                        className={styles.sidebarClose}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Navigation */}
                <nav className={styles.sidebarNav}>
                    {navItems.map((item) => {
                        // ── Group item with sub-items: toggles expansion ──
                        if (item.children && item.children.length > 0) {
                            const anyChildActive = item.children.some((c) => checkActive(c.path));
                            const expanded = expandedGroups[item.path] ?? anyChildActive;

                            return (
                                <div key={item.path} className={styles.navGroup}>
                                    <button
                                        type="button"
                                        className={`${styles.navItem} ${anyChildActive ? styles.navItemGroupActive : ''}`}
                                        title={item.label}
                                        aria-expanded={expanded}
                                        {...(item.dataTour ? { 'data-tour': item.dataTour } : {})}
                                        onClick={() =>
                                            setExpandedGroups((prev) => ({
                                                ...prev,
                                                [item.path]: !(prev[item.path] ?? anyChildActive),
                                            }))
                                        }
                                    >
                                        {renderNavContent(item)}
                                        <span
                                            className={`material-symbols-outlined ${styles.navChevron} ${expanded ? styles.navChevronOpen : ''}`}
                                        >
                                            expand_more
                                        </span>
                                    </button>

                                    {expanded && (
                                        <div className={styles.navSubmenu}>
                                            {item.children.map((child) => {
                                                const childActive = checkActive(child.path);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={child.path}
                                                        className={`${styles.navSubItem} ${childActive ? styles.navSubItemActive : ''}`}
                                                        title={child.label}
                                                        aria-current={childActive ? 'page' : undefined}
                                                        {...(child.dataTour ? { 'data-tour': child.dataTour } : {})}
                                                        onClick={() => {
                                                            navigate(child.path);
                                                            setSidebarOpen(false);
                                                        }}
                                                    >
                                                        {renderNavContent(child)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // ── Flat item: navigates ──
                        const active = checkActive(item.path);

                        return (
                            <button
                            type="button"
                            key={item.path}
                            className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                            title={item.label}
                            aria-current={active ? 'page' : undefined}
                            {...(item.dataTour ? { 'data-tour': item.dataTour } : {})}
                            onClick={() => {
                                navigate(item.path);
                                setSidebarOpen(false);
                            }}
                        >
                            {renderNavContent(item)}
                            </button>
                        );
                    })}
                    {sidebarNavFooter}
                </nav>

                {/* User Card at bottom of sidebar */}
                {showSidebarUserCard && (
                    <div className={styles.sidebarUser}>
                        <div className={styles.userCard}>
                            <div className={styles.userAvatar}>
                                {showAvatarImage ? (
                                    <>
                                        <img
                                            src={userData.avatar}
                                            alt={userData.name}
                                            className={styles.userAvatarImg}
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                const span = e.currentTarget.parentElement?.querySelector('span');
                                                if (span) (span as HTMLElement).style.display = 'flex';
                                            }}
                                        />
                                        <span className={styles.userInitials} style={{ display: 'none' }}>
                                            {userData.initials}
                                        </span>
                                    </>
                                ) : (
                                    <span className={styles.userInitials}>{userData.initials}</span>
                                )}
                            </div>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>{userData.name}</span>
                                <span className={styles.userRoleText}>{userData.role}</span>
                            </div>
                        </div>
                    </div>
                )}
            </aside>}

            {/* Main Content */}
            <main
                className={styles.main}
                style={inMiniApp ? { marginLeft: 0, paddingBottom: '60px' } : undefined}
            >
                {/* Header — ẩn trong Mini App (Zalo cung cấp app bar riêng) */}
                {!inMiniApp && <header className={styles.header}>
                    <div className={styles.headerContainer}>
                        {/* Mobile Menu Button */}
                        <button
                            className={styles.menuBtn}
                            onClick={() => setSidebarOpen(true)}
                        >
                            <MenuIcon />
                        </button>

                        {/* Header Left (portal-specific) */}
                        {headerLeft && (
                            <div className={styles.headerLeft}>{headerLeft}</div>
                        )}

                        {/* Spacer */}
                        <div style={{ flex: 1 }} />

                        {/* Header Right */}
                        <div className={styles.headerRight}>
                            {/* Notification Bell */}
                            <div style={{ position: 'relative' }}>
                                <button
                                    className={styles.notificationBtn}
                                    data-tour="notification-btn"
                                    onClick={() => {
                                        if (showNotifDropdownProp) {
                                            setShowNotifDropdown(!showNotifDropdown);
                                        }
                                    }}
                                >
                                    <div className={styles.notificationIconWrap}>
                                        <NotificationIcon />
                                    </div>
                                    {notificationCount > 0 && (
                                        <div className={styles.notificationBadge}>
                                            <span>{notificationCount}</span>
                                        </div>
                                    )}
                                </button>
                                {showNotifDropdownProp && (
                                    <NotificationDropdown
                                        isOpen={showNotifDropdown}
                                        onClose={() => setShowNotifDropdown(false)}
                                        onCountUpdate={handleRefreshNotificationCount}
                                    />
                                )}
                            </div>

                            {/* User Info */}
                            <div className={styles.headerUser}>
                                <div className={styles.headerUserInfo}>
                                    <span className={styles.headerUserName}>{userData.name}</span>
                                    <span className={styles.headerUserRole}>{userData.role}</span>
                                </div>
                                {showAvatarImage ? (
                                    <div
                                        className={styles.headerAvatarWrap}
                                        onClick={() => setViewingAvatar(true)}
                                        title="Nhấn để xem ảnh"
                                    >
                                        <img
                                            className={styles.headerAvatarImg}
                                            src={userData.avatar}
                                            alt="User avatar"
                                        />
                                        <div className={styles.headerAvatarHover}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.headerAvatar}>
                                        <span>{userData.initials}</span>
                                    </div>
                                )}
                            </div>

                            {/* Logout */}
                            <button
                                className={styles.logoutBtn}
                                title="Đăng xuất"
                                aria-haspopup="dialog"
                                onClick={() => setShowLogoutConfirm(true)}
                            >
                                <LogoutIcon />
                            </button>
                        </div>
                    </div>
                </header>}

                {/* Page Content */}
                <div className={styles.contentArea}>
                    {children || <Outlet />}
                </div>
            </main>

            {/* Portal-specific extras (tour modals, etc.) */}
            {extras}

            {showLogoutConfirm && (
                <div
                    className={styles.confirmOverlay}
                    role="presentation"
                    onClick={() => setShowLogoutConfirm(false)}
                >
                    <div
                        className={styles.confirmDialog}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-confirm-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className={styles.confirmIcon}>
                            <LogoutIcon />
                        </div>
                        <h2 id="logout-confirm-title" className={styles.confirmTitle}>
                            Đăng xuất
                        </h2>
                        <p className={styles.confirmMessage}>
                            Bạn có chắc muốn kết thúc phiên làm việc hiện tại không?
                        </p>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmCancelBtn}
                                onClick={() => setShowLogoutConfirm(false)}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className={styles.confirmDangerBtn}
                                onClick={handleConfirmLogout}
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Tab Navigation — chỉ hiển thị trong Zalo Mini App */}
            {inMiniApp && (
                <nav style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px',
                    backgroundColor: '#1a2238', display: 'flex', alignItems: 'stretch',
                    zIndex: 100, borderTop: '1px solid rgba(255,255,255,0.1)',
                }}>
                    {navItems.slice(0, 5).map((item) => {
                        const active = checkActive(item.path);
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                style={{
                                    flex: 1, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', gap: 3,
                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                    color: active ? '#d4b483' : 'rgba(242,240,228,0.55)',
                                    padding: '4px 2px',
                                }}
                            >
                                {item.icon ? <item.icon /> : item.materialIcon ? (
                                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                        {item.materialIcon}
                                    </span>
                                ) : null}
                                <span style={{
                                    fontSize: 10, lineHeight: '13px', fontFamily: "'IBM Plex Sans', sans-serif",
                                    whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {item.label}
                                </span>
                                {item.badge != null && item.badge > 0 && (
                                    <span style={{
                                        position: 'absolute', top: 6, right: 'calc(50% - 14px)',
                                        backgroundColor: '#ef4444', color: '#fff',
                                        borderRadius: 9999, fontSize: 9, padding: '1px 4px',
                                        lineHeight: '12px',
                                    }}>{item.badge}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            )}

            {/* Avatar Lightbox */}
            {viewingAvatar && showAvatarImage && (
                <div className={styles.lightboxOverlay} onClick={() => setViewingAvatar(false)}>
                    <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
                        <button className={styles.lightboxClose} onClick={() => setViewingAvatar(false)} aria-label="Đóng">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                        <img src={userData.avatar} alt={userData.name} className={styles.lightboxImg} />
                        <div className={styles.lightboxInfo}>
                            <p className={styles.lightboxName}>{userData.name}</p>
                            <span className={styles.lightboxRole}>{userData.role}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PortalLayout;
