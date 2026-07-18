import { useState, useEffect } from 'react';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import { mockGetUserWarnings, mockGetUserSuspensions } from '../mockData';
import type { FlatUserDetail } from '../mockData';
import { getRoleDisplay } from '../roleDisplay';
import { Can } from '../../../contexts/AccessContext';

interface UserDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: FlatUserDetail | null;
    onBlockUser: () => void;
    onUnblockUser: () => void;
    onIssueWarning: () => void;
    onSuspendUser: () => void;
    /**
     * Optional — only render the "Đặt lại mật khẩu" button when provided.
     * BE has no admin reset-password endpoint yet, so the page can simply
     * omit this prop to hide the button. Once BE adds support, wire it
     * back through and the button reappears with no other code change.
     */
    onResetPassword?: () => void;
}

const UserDetailModal = ({
    isOpen,
    onClose,
    user,
    onBlockUser,
    onUnblockUser,
    onIssueWarning,
    onSuspendUser,
    onResetPassword,
}: UserDetailModalProps) => {
    const [warnings, setWarnings] = useState<any[]>([]);
    const [suspensions, setSuspensions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch warnings and suspensions when modal opens
    useEffect(() => {
        if (isOpen && user) {
            fetchUserData();
        }
    }, [isOpen, user]);

    const fetchUserData = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const [warningsData, suspensionsData] = await Promise.all([
                mockGetUserWarnings(user.userid),
                mockGetUserSuspensions(user.userid),
            ]);

            setWarnings(warningsData);
            setSuspensions(suspensionsData);
        } catch (err) {
            console.error('Error fetching user data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Get status badge class
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'active':
                return 'user-detail-status-active';
            case 'suspended':
                return 'user-detail-status-suspended';
            case 'blocked':
                return 'user-detail-status-blocked';
            default:
                return 'user-detail-status-pending';
        }
    };

    // Get severity badge class
    const getSeverityClass = (severity: string) => {
        switch (severity) {
            case 'high':
                return 'user-detail-severity-high';
            case 'medium':
                return 'user-detail-severity-medium';
            case 'low':
                return 'user-detail-severity-low';
            default:
                return 'user-detail-severity-low';
        }
    };

    if (!isOpen || !user) return null;

    const isTutor = user.primaryrole === 'tutor';
    const isBlocked = user.accountstatus === 'blocked';
    const roleDisplay = getRoleDisplay(user.primaryrole);

    return (
        <div className="vetting-modal-overlay" onClick={onClose}>
            <div
                className="vetting-modal-container user-detail-modal"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="vetting-modal-header user-detail-header">
                    <div className="user-detail-header-content">
                        {/* Avatar */}
                        <div
                            className="user-detail-avatar"
                            style={{ backgroundImage: `url('${user.avatarurl}')` }}
                        />

                        {/* User Info */}
                        <div className="user-detail-info">
                            <div className="user-detail-name-row">
                                <h2 className="user-detail-name">{user.fullname}</h2>
                                <span className={`user-detail-status ${getStatusClass(user.accountstatus)}`}>
                                    {user.accountstatus === 'active'
                                        ? 'Hoạt động'
                                        : user.accountstatus === 'suspended'
                                            ? 'Tạm ngưng'
                                            : 'Bị chặn'}
                                </span>
                                {user.isidentityverified && (
                                    <span className="user-detail-verified">
                                        <span className="material-symbols-outlined">verified</span>
                                        Đã xác minh
                                    </span>
                                )}
                            </div>
                            <div className="user-detail-meta">
                                <span className="user-detail-meta-item">
                                    <span className="material-symbols-outlined">badge</span>
                                    <code>{user.userid}</code>
                                </span>
                                <span className="user-detail-meta-item">
                                    <span className="material-symbols-outlined">
                                        {roleDisplay.icon}
                                    </span>
                                    {roleDisplay.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Close button */}
                    <button className="vetting-modal-close-btn" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="vetting-modal-body">
                    {/* User Details Section */}
                    <section className="user-detail-section">
                        <h3 className="user-detail-section-title">
                            <span className="material-symbols-outlined">description</span>
                            Thông tin chi tiết
                        </h3>
                        <div className="vetting-info-grid">
                            <div className="vetting-info-item">
                                <label>Email</label>
                                <p>{user.email}</p>
                            </div>
                            <div className="vetting-info-item">
                                <label>Số điện thoại</label>
                                <p>{user.phone}</p>
                            </div>
                            <div className="vetting-info-item">
                                <label>Ngày đăng ký</label>
                                <p>{new Date(user.createdat).toLocaleDateString('vi-VN')}</p>
                            </div>
                            <div className="vetting-info-item">
                                <label>Đăng nhập lần cuối</label>
                                <p>{formatDateTime(user.lastloginat)}</p>
                            </div>
                        </div>
                    </section>

                    {/* Wallet Section (Tutors only) */}
                    {isTutor && (
                        <section className="user-detail-section user-detail-wallet">
                            <h3 className="user-detail-section-title">
                                <span className="material-symbols-outlined">account_balance_wallet</span>
                                Ví điện tử
                            </h3>
                            <div className="user-detail-wallet-grid">
                                <div className="user-detail-wallet-item">
                                    <label>Số dư khả dụng</label>
                                    <p className="user-detail-wallet-available">
                                        {formatCurrency(user.walletbalance || 0)}
                                    </p>
                                </div>
                                <div className="user-detail-wallet-item">
                                    <label>Số dư ký quỹ</label>
                                    <p className="user-detail-wallet-escrow">
                                        {formatCurrency(user.escrowbalance || 0)}
                                    </p>
                                </div>
                                <div className="user-detail-wallet-item">
                                    <label>Tổng thu nhập</label>
                                    <p className="user-detail-wallet-total">
                                        {formatCurrency(user.totalearnings || 0)}
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Warnings Section */}
                    <section className="user-detail-section">
                        <div className="user-detail-section-header">
                            <h3 className="user-detail-section-title">
                                <span className="material-symbols-outlined">warning</span>
                                Lịch sử cảnh cáo
                            </h3>
                            <span className={`user-detail-count ${warnings.length > 0 ? 'has-items' : ''}`}>
                                {warnings.length} cảnh cáo
                            </span>
                        </div>

                        {loading ? (
                            <p className="user-detail-loading">Đang tải...</p>
                        ) : warnings.length === 0 ? (
                            <p className="vetting-empty-message">Không có cảnh cáo nào</p>
                        ) : (
                            <div className="vetting-subjects-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Ngày</th>
                                            <th>Lý do</th>
                                            <th style={{ textAlign: 'center' }}>Mức độ</th>
                                            <th>Người cảnh cáo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {warnings.map((warning) => (
                                            <tr key={warning.warningid}>
                                                <td>{new Date(warning.createdat).toLocaleDateString('vi-VN')}</td>
                                                <td>
                                                    {warning.reason}
                                                    {warning.relatedbookingid && (
                                                        <span className="user-detail-booking-ref">
                                                            (#{warning.relatedbookingid})
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`user-detail-severity ${getSeverityClass(warning.severity)}`}>
                                                        {warning.severity === 'high' ? 'Cao' : warning.severity === 'medium' ? 'TB' : 'Thấp'}
                                                    </span>
                                                </td>
                                                <td>{warning.issuedby}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Suspensions Section */}
                    <section className="user-detail-section">
                        <div className="user-detail-section-header">
                            <h3 className="user-detail-section-title">
                                <span className="material-symbols-outlined">pause_circle</span>
                                Lịch sử tạm ngưng
                            </h3>
                            <span className={`user-detail-count danger ${suspensions.length > 0 ? 'has-items' : ''}`}>
                                {suspensions.length} lần
                            </span>
                        </div>

                        {loading ? (
                            <p className="user-detail-loading">Đang tải...</p>
                        ) : suspensions.length === 0 ? (
                            <p className="vetting-empty-message">Chưa bao giờ bị tạm ngưng</p>
                        ) : (
                            <div className="vetting-subjects-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Ngày bắt đầu</th>
                                            <th>Ngày kết thúc</th>
                                            <th>Lý do</th>
                                            <th style={{ textAlign: 'center' }}>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {suspensions.map((suspension) => (
                                            <tr key={suspension.suspensionid}>
                                                <td>{new Date(suspension.startdate).toLocaleDateString('vi-VN')}</td>
                                                <td>{new Date(suspension.enddate).toLocaleDateString('vi-VN')}</td>
                                                <td>
                                                    {suspension.reason}
                                                    <span className="user-detail-duration">
                                                        ({suspension.durationdays} ngày)
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className={`user-detail-suspension-status ${suspension.status}`}>
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

                {/* Footer Actions */}
                <div className="vetting-modal-footer">
                    {/* Reset-password is hidden until BE exposes an admin reset endpoint
                        (today only /api/student/{id}/reset-password exists, scoped to
                        students). Once BE adds POST /api/admin/users/{id}/reset-password,
                        pass `onResetPassword` from the page and this button reappears. */}
                    {onResetPassword && (
                        <button className="vetting-btn vetting-btn-secondary" onClick={onResetPassword}>
                            <span className="material-symbols-outlined">lock_reset</span>
                            Đặt lại mật khẩu
                        </button>
                    )}

                    <Can permission="warning.create">
                    <button className="vetting-btn user-detail-btn-warning" onClick={onIssueWarning}>
                        <span className="material-symbols-outlined">warning</span>
                        Cảnh cáo
                    </button>
                    </Can>

                    {isTutor && !isBlocked && (
                        <Can permission="suspension.manage">
                        <button className="vetting-btn user-detail-btn-suspend" onClick={onSuspendUser}>
                            <span className="material-symbols-outlined">pause_circle</span>
                            Tạm ngưng hồ sơ
                        </button>
                        </Can>
                    )}

                    {isBlocked ? (
                        <Can permission="user.deactivate">
                        <button className="vetting-btn vetting-btn-primary" onClick={onUnblockUser}>
                            <span className="material-symbols-outlined">check_circle</span>
                            Mở khóa tài khoản
                        </button>
                        </Can>
                    ) : (
                        <Can permission="user.deactivate">
                        <button className="vetting-btn vetting-btn-danger" onClick={onBlockUser}>
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
