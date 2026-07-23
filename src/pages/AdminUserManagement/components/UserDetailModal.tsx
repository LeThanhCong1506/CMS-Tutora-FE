import { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import { mockGetUserWarnings, mockGetUserSuspensions } from '../mockData';
import type { FlatUserDetail } from '../mockData';
import type { AdminLinkedUser, AdminUserRelationships } from '../../../types/admin.types';
import { getUserDetail } from '../../../services/admin.service';
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

const createEmptyRelationships = (): AdminUserRelationships => ({ parent: null, students: [] });

const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
    const [relationships, setRelationships] = useState<AdminUserRelationships>(createEmptyRelationships);
    const [relationshipLoading, setRelationshipLoading] = useState(false);
    const [relationshipError, setRelationshipError] = useState<string | null>(null);
    const relationshipRequestRef = useRef<AbortController | null>(null);

    const userId = user?.userid;
    const normalizedRole = user?.primaryrole?.toLowerCase();
    const supportsRelationships = normalizedRole === 'parent' || normalizedRole === 'student';

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

    const fetchRelationships = useCallback(async () => {
        if (!userId || !supportsRelationships) return;

        relationshipRequestRef.current?.abort();
        const controller = new AbortController();
        relationshipRequestRef.current = controller;

        setRelationships(createEmptyRelationships());
        setRelationshipError(null);
        setRelationshipLoading(true);

        try {
            const detail = await getUserDetail(userId, controller.signal);
            if (!controller.signal.aborted) {
                setRelationships(detail.relationships ?? createEmptyRelationships());
            }
        } catch (error: unknown) {
            const isCanceled =
                controller.signal.aborted ||
                (error as { code?: string; name?: string })?.code === 'ERR_CANCELED' ||
                (error as { name?: string })?.name === 'AbortError';
            if (!isCanceled) {
                setRelationshipError('Không thể tải thông tin liên kết. Vui lòng thử lại.');
            }
        } finally {
            if (relationshipRequestRef.current === controller) {
                relationshipRequestRef.current = null;
                setRelationshipLoading(false);
            }
        }
    }, [supportsRelationships, userId]);

    // Tải lịch sử cảnh cáo / tạm ngưng mỗi lần mở modal cho một user.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen && userId) void fetchUserData();
    }, [isOpen, userId, fetchUserData]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Quan hệ gia đình là dữ liệu admin-only, tải riêng để lỗi API này không
    // làm mất lịch sử cảnh cáo/tạm ngưng trong cùng modal.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen || !userId || !supportsRelationships) {
            const activeRequest = relationshipRequestRef.current;
            relationshipRequestRef.current = null;
            activeRequest?.abort();
            setRelationships(createEmptyRelationships());
            setRelationshipError(null);
            setRelationshipLoading(false);
            return undefined;
        }

        void fetchRelationships();
        return () => {
            const activeRequest = relationshipRequestRef.current;
            relationshipRequestRef.current = null;
            activeRequest?.abort();
        };
    }, [fetchRelationships, isOpen, supportsRelationships, userId]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!isOpen || !user) return null;

    const isTutor = normalizedRole === 'tutor';
    const isParent = normalizedRole === 'parent';
    const relatedUsers: AdminLinkedUser[] = isParent
        ? relationships.students
        : relationships.parent
          ? [relationships.parent]
          : [];
    const relationshipCountLabel = isParent
        ? `${relatedUsers.length} học sinh`
        : relatedUsers.length > 0
          ? 'Đã liên kết'
          : 'Chưa liên kết';
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

                    {/* Quan hệ Parent ↔ Student được lấy từ student_profiles. */}
                    {supportsRelationships && (
                        <section className="um-section" aria-labelledby="user-relationships-title">
                            <div className="um-section-head">
                                <h3 id="user-relationships-title" className="um-section-title">
                                    <span className="material-symbols-outlined">family_restroom</span>
                                    {isParent ? 'Học sinh liên kết' : 'Phụ huynh liên kết'}
                                </h3>
                                {!relationshipLoading && !relationshipError && (
                                    <span
                                        className={`um-badge ${relatedUsers.length > 0 ? 'um-badge-info' : 'um-badge-neutral'}`}
                                    >
                                        {relationshipCountLabel}
                                    </span>
                                )}
                            </div>

                            {relationshipLoading ? (
                                <div className="um-relationship-state" role="status" aria-live="polite">
                                    <span className="material-symbols-outlined um-relationship-spin">
                                        progress_activity
                                    </span>
                                    Đang tải thông tin liên kết…
                                </div>
                            ) : relationshipError ? (
                                <div className="um-relationship-error" role="alert">
                                    <span className="material-symbols-outlined">cloud_off</span>
                                    <div>
                                        <strong>Chưa thể tải liên kết</strong>
                                        <span>{relationshipError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="um-btn um-btn-secondary"
                                        onClick={() => void fetchRelationships()}
                                    >
                                        <span className="material-symbols-outlined">refresh</span>
                                        Thử lại
                                    </button>
                                </div>
                            ) : relatedUsers.length === 0 ? (
                                <div className="um-empty">
                                    {isParent
                                        ? 'Phụ huynh này chưa có học sinh liên kết.'
                                        : 'Học sinh này chưa liên kết với phụ huynh.'}
                                </div>
                            ) : (
                                <ul className="um-relationship-list">
                                    {relatedUsers.map((relatedUser) => {
                                        const relatedRole = getRoleDisplay(relatedUser.role);
                                        return (
                                            <li
                                                key={
                                                    relatedUser.userId ??
                                                    relatedUser.studentProfileId ??
                                                    relatedUser.fullName
                                                }
                                                className="um-relationship-card"
                                            >
                                                <div className="um-relationship-avatar" aria-hidden="true">
                                                    {relatedUser.avatarUrl ? (
                                                        <img src={relatedUser.avatarUrl} alt="" loading="lazy" />
                                                    ) : (
                                                        <span>{getInitials(relatedUser.fullName)}</span>
                                                    )}
                                                </div>
                                                <div className="um-relationship-content">
                                                    <div className="um-relationship-name-row">
                                                        <strong>{relatedUser.fullName}</strong>
                                                        <span className="um-badge um-badge-neutral">
                                                            {relatedRole.label}
                                                        </span>
                                                    </div>
                                                    <div className="um-relationship-meta">
                                                        {relatedUser.email && (
                                                            <span>
                                                                <span className="material-symbols-outlined">mail</span>
                                                                {relatedUser.email}
                                                            </span>
                                                        )}
                                                        {relatedUser.phone && (
                                                            <span>
                                                                <span className="material-symbols-outlined">call</span>
                                                                {relatedUser.phone}
                                                            </span>
                                                        )}
                                                        {!relatedUser.hasAccount && (
                                                            <span className="um-relationship-account-state">
                                                                <span className="material-symbols-outlined">person_off</span>
                                                                Chưa có tài khoản đăng nhập
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </section>
                    )}

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
