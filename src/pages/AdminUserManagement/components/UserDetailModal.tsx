import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import { mockGetUserWarnings, mockGetUserSuspensions } from '../mockData';
import type { FlatUserDetail } from '../mockData';
import { getRoleDisplay } from '../roleDisplay';
import { Can, useAccess } from '../../../contexts/AccessContext';

interface UserWarningRow {
    warningid: string;
    createdat: string;
    reason: string;
    severity: string;
    issuedby: string;
    relatedbookingid?: string;
}

interface UserSuspensionRow {
    suspensionid: string;
    startdate: string;
    enddate: string;
    reason: string;
    durationdays: number;
    status: string;
}

interface UserDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: FlatUserDetail | null;
    onBlockUser: () => void;
    onUnblockUser: () => void;
    onIssueWarning: () => void;
    onSuspendUser: () => void;
    /** Open the edit form for this user. */
    onEditUser?: () => void;
    /** Permanently delete this user (Admin only). */
    onDeleteUser?: () => void;
    /**
     * Optional — only render the "Đặt lại mật khẩu" button when provided.
     * BE has no admin reset-password endpoint yet, so the page can simply
     * omit this prop to hide the button. Once BE adds support, wire it
     * back through and the button reappears with no other code change.
     */
    onResetPassword?: () => void;
}

const STATUS_META: Record<string, { label: string; variant: string }> = {
    active: { label: 'Hoạt động', variant: 'success' },
    suspended: { label: 'Tạm ngưng', variant: 'warning' },
    blocked: { label: 'Bị chặn', variant: 'danger' },
};

const SEVERITY_META: Record<string, { label: string; variant: string }> = {
    high: { label: 'Cao', variant: 'danger' },
    medium: { label: 'Trung bình', variant: 'warning' },
    low: { label: 'Thấp', variant: 'neutral' },
};

const UserDetailModal = ({
    isOpen,
    onClose,
    user,
    onBlockUser,
    onUnblockUser,
    onIssueWarning,
    onSuspendUser,
    onEditUser,
    onDeleteUser,
    onResetPassword,
}: UserDetailModalProps) => {
    const { isAdmin } = useAccess();
    const [warnings, setWarnings] = useState<UserWarningRow[]>([]);
    const [suspensions, setSuspensions] = useState<UserSuspensionRow[]>([]);
    const [loading, setLoading] = useState(false);

    const userId = user?.userid;

    const fetchUserData = useCallback(async () => {
        if (!userId) return;
        try {
            setLoading(true);
            const [warningsData, suspensionsData] = await Promise.all([
                mockGetUserWarnings(userId),
                mockGetUserSuspensions(userId),
            ]);
            setWarnings(warningsData as UserWarningRow[]);
            setSuspensions(suspensionsData as UserSuspensionRow[]);
        } catch (err) {
            console.error('Error fetching user data:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Tải lịch sử cảnh cáo / tạm ngưng mỗi lần mở modal cho một user.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen && userId) void fetchUserData();
    }, [isOpen, userId, fetchUserData]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!isOpen || !user) return null;

    const isTutor = user.primaryrole?.toLowerCase() === 'tutor';
    const isBlocked = user.accountstatus === 'blocked';
    const roleDisplay = getRoleDisplay(user.primaryrole);
    const status = STATUS_META[user.accountstatus] ?? { label: user.accountstatus, variant: 'neutral' };

    return (
        <div className="um-overlay" onClick={onClose} onKeyDown={(event) => event.key === 'Escape' && onClose()}>
            <div
                className="um-modal um-modal-lg"
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-detail-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header: danh tính ────────────────────────────────── */}
                <div className="um-modal-head">
                    <div className="um-detail-head">
                        <div className="um-detail-avatar" style={{ backgroundImage: `url('${user.avatarurl}')` }} />
                        <div className="um-detail-headinfo">
                            <div className="um-detail-name-row">
                                <h2 id="user-detail-dialog-title" className="um-detail-name">
                                    {user.fullname}
                                </h2>
                                <span className={`um-badge um-badge-${status.variant}`}>{status.label}</span>
                                {user.isidentityverified && (
                                    <span className="um-badge um-badge-info">
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                            verified
                                        </span>
                                        Đã xác minh
                                    </span>
                                )}
                            </div>
                            <div className="um-detail-meta">
                                <span className="um-detail-meta-item">
                                    <span className="material-symbols-outlined">{roleDisplay.icon}</span>
                                    {roleDisplay.label}
                                </span>
                                <span className="um-detail-meta-item">
                                    <span className="material-symbols-outlined">badge</span>
                                    <code>{user.userid}</code>
                                </span>
                            </div>
                        </div>
                    </div>

                    <button type="button" className="um-modal-close" onClick={onClose} aria-label="Đóng">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* ── Body ─────────────────────────────────────────────── */}
                <div className="um-modal-body">
                    <section className="um-section">
                        <div className="um-section-head">
                            <h3 className="um-section-title">
                                <span className="material-symbols-outlined">description</span>
                                Thông tin liên hệ
                            </h3>
                        </div>
                        <div className="um-info-grid">
                            <div className="um-info-item">
                                <span className="um-info-label">Email</span>
                                <p className="um-info-value">{user.email || '—'}</p>
                            </div>
                            <div className="um-info-item">
                                <span className="um-info-label">Số điện thoại</span>
                                <p className="um-info-value">{user.phone || '—'}</p>
                            </div>
                            <div className="um-info-item">
                                <span className="um-info-label">Ngày tham gia</span>
                                <p className="um-info-value">{new Date(user.createdat).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <div className="um-info-item">
                                <span className="um-info-label">Đăng nhập cuối</span>
                                <p className="um-info-value">
                                    {user.lastloginat ? formatDateTime(user.lastloginat) : 'Chưa đăng nhập'}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Ví điện tử — chỉ gia sư mới có dòng tiền */}
                    {isTutor && (
                        <section className="um-section">
                            <div className="um-section-head">
                                <h3 className="um-section-title">
                                    <span className="material-symbols-outlined">account_balance_wallet</span>
                                    Ví điện tử
                                </h3>
                            </div>
                            <div className="um-stat-grid">
                                <div className="um-stat">
                                    <span className="um-stat-label">Khả dụng</span>
                                    <p className="um-stat-value um-stat-value-ok">
                                        {formatCurrency(user.walletbalance || 0)}
                                    </p>
                                </div>
                                <div className="um-stat">
                                    <span className="um-stat-label">Ký quỹ</span>
                                    <p className="um-stat-value um-stat-value-hold">
                                        {formatCurrency(user.escrowbalance || 0)}
                                    </p>
                                </div>
                                <div className="um-stat">
                                    <span className="um-stat-label">Tổng thu nhập</span>
                                    <p className="um-stat-value">{formatCurrency(user.totalearnings || 0)}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Lịch sử cảnh cáo */}
                    <section className="um-section">
                        <div className="um-section-head">
                            <h3 className="um-section-title">
                                <span className="material-symbols-outlined">warning</span>
                                Lịch sử cảnh cáo
                            </h3>
                            <span
                                className={`um-badge ${warnings.length > 0 ? 'um-badge-warning' : 'um-badge-neutral'}`}
                            >
                                {warnings.length} cảnh cáo
                            </span>
                        </div>

                        {loading ? (
                            <p className="um-loading">Đang tải…</p>
                        ) : warnings.length === 0 ? (
                            <div className="um-empty">Không có cảnh cáo nào</div>
                        ) : (
                            <div className="um-table-wrap">
                                <table className="um-table">
                                    <thead>
                                        <tr>
                                            <th>Ngày</th>
                                            <th>Lý do</th>
                                            <th className="um-center">Mức độ</th>
                                            <th>Người xử lý</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {warnings.map((warning) => {
                                            const sev = SEVERITY_META[warning.severity] ?? SEVERITY_META.low;
                                            return (
                                                <tr key={warning.warningid}>
                                                    <td>{new Date(warning.createdat).toLocaleDateString('vi-VN')}</td>
                                                    <td>
                                                        {warning.reason}
                                                        {warning.relatedbookingid && (
                                                            <span className="um-table-note">
                                                                #{warning.relatedbookingid}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="um-center">
                                                        <span className={`um-badge um-badge-${sev.variant}`}>
                                                            {sev.label}
                                                        </span>
                                                    </td>
                                                    <td>{warning.issuedby}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Lịch sử tạm ngưng */}
                    <section className="um-section">
                        <div className="um-section-head">
                            <h3 className="um-section-title">
                                <span className="material-symbols-outlined">pause_circle</span>
                                Lịch sử tạm ngưng
                            </h3>
                            <span
                                className={`um-badge ${suspensions.length > 0 ? 'um-badge-danger' : 'um-badge-neutral'}`}
                            >
                                {suspensions.length} lần
                            </span>
                        </div>

                        {loading ? (
                            <p className="um-loading">Đang tải…</p>
                        ) : suspensions.length === 0 ? (
                            <div className="um-empty">Chưa bao giờ bị tạm ngưng</div>
                        ) : (
                            <div className="um-table-wrap">
                                <table className="um-table">
                                    <thead>
                                        <tr>
                                            <th>Bắt đầu</th>
                                            <th>Kết thúc</th>
                                            <th>Lý do</th>
                                            <th className="um-center">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {suspensions.map((suspension) => (
                                            <tr key={suspension.suspensionid}>
                                                <td>{new Date(suspension.startdate).toLocaleDateString('vi-VN')}</td>
                                                <td>{new Date(suspension.enddate).toLocaleDateString('vi-VN')}</td>
                                                <td>
                                                    {suspension.reason}
                                                    <span className="um-table-note">
                                                        ({suspension.durationdays} ngày)
                                                    </span>
                                                </td>
                                                <td className="um-center">
                                                    <span
                                                        className={`um-badge ${suspension.status === 'active' ? 'um-badge-danger' : 'um-badge-neutral'}`}
                                                    >
                                                        {suspension.status === 'active' ? 'Đang áp dụng' : 'Đã hết hạn'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                {/* ── Footer: hành động ────────────────────────────────── */}
                <div className="um-modal-foot">
                    {/* Nhóm nguy hiểm tách sang trái để tránh bấm nhầm. */}
                    <div className="um-foot-left">
                        {onDeleteUser && isAdmin && (
                            <button className="um-btn um-btn-danger-soft" onClick={onDeleteUser}>
                                <span className="material-symbols-outlined">delete</span>
                                Xóa
                            </button>
                        )}
                        {onResetPassword && (
                            <button className="um-btn um-btn-secondary" onClick={onResetPassword}>
                                <span className="material-symbols-outlined">lock_reset</span>
                                Đặt lại mật khẩu
                            </button>
                        )}
                    </div>

                    {onEditUser && (
                        <Can permission="user.update">
                            <button className="um-btn um-btn-secondary" onClick={onEditUser}>
                                <span className="material-symbols-outlined">edit</span>
                                Chỉnh sửa
                            </button>
                        </Can>
                    )}

                    <Can permission="warning.create">
                        <button className="um-btn um-btn-warn" onClick={onIssueWarning}>
                            <span className="material-symbols-outlined">warning</span>
                            Cảnh cáo
                        </button>
                    </Can>

                    {isTutor && !isBlocked && (
                        <Can permission="suspension.manage">
                            <button className="um-btn um-btn-secondary" onClick={onSuspendUser}>
                                <span className="material-symbols-outlined">pause_circle</span>
                                Tạm ngưng
                            </button>
                        </Can>
                    )}

                    {isBlocked ? (
                        <Can permission="user.deactivate">
                            <button className="um-btn um-btn-primary" onClick={onUnblockUser}>
                                <span className="material-symbols-outlined">check_circle</span>
                                Mở khóa
                            </button>
                        </Can>
                    ) : (
                        <Can permission="user.deactivate">
                            <button className="um-btn um-btn-danger" onClick={onBlockUser}>
                                <span className="material-symbols-outlined">block</span>
                                Chặn tài khoản
                            </button>
                        </Can>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDetailModal;
