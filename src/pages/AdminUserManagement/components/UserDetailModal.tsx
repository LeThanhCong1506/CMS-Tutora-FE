import { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import type { FlatUserDetail } from '../userTypes';
import type {
    AdminLinkedUser,
    AdminSuspensionHistoryItem,
    AdminUserCccdUrls,
    AdminUserRelationships,
    AdminWarningHistoryItem,
} from '../../../types/admin.types';
import {
    fetchProtectedImage,
    getUserCccdUrls,
    getUserDetail,
    getUserSuspensions,
    getUserWarnings,
    releaseProtectedImage,
} from '../../../services/admin.service';
import { getRoleDisplay } from '../roleDisplay';
import { Can, useAccess } from '../../../contexts/AccessContext';
import '../../../styles/shared/image-preview-overlay.css';

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

/** BE `warninglevel`: 1 = Thấp, 2 = Trung bình, 3 = Cao (3 tự động tạm ngưng). */
const WARNING_LEVEL_META: Record<number, { label: string; variant: string }> = {
    1: { label: 'Thấp', variant: 'neutral' },
    2: { label: 'Trung bình', variant: 'warning' },
    3: { label: 'Cao', variant: 'danger' },
};

// Mức lạ (BE thêm bậc mới) được coi là nặng hơn thay vì nhẹ đi, để admin không
// đánh giá thấp một vi phạm chưa biết.
const getWarningLevelMeta = (level: number) =>
    WARNING_LEVEL_META[level] ?? (level > 3 ? WARNING_LEVEL_META[3] : WARNING_LEVEL_META[1]);

/**
 * DB chứa hai bộ từ vựng cho loại tạm ngưng: 'temporary'/'permanent' do hệ thống
 * tự áp, và 'hidden_1_week'/'account_locked' do admin thao tác từ CMS.
 */
const SUSPENSION_TYPE_LABEL: Record<string, string> = {
    temporary: 'Tạm thời',
    permanent: 'Vĩnh viễn',
    hidden_1_week: 'Ẩn hồ sơ',
    account_locked: 'Khóa tài khoản',
};

/**
 * Còn hiệu lực thật sự = cờ isactive còn bật VÀ chưa tới hạn kết thúc. Job tự gỡ
 * chạy theo giờ nên bản ghi hết hạn có thể vẫn còn cờ bật — đừng chỉ tin isActive.
 *
 * `nowMs` là mốc thời gian lúc tải dữ liệu, không phải lúc render: đọc đồng hồ
 * trong render sẽ cho kết quả đổi theo từng lần re-render.
 */
const isSuspensionInEffect = (suspension: AdminSuspensionHistoryItem, nowMs: number) =>
    suspension.isActive === true &&
    (!suspension.endDate || new Date(suspension.endDate).getTime() > nowMs);

const getSuspensionDurationDays = (suspension: AdminSuspensionHistoryItem) => {
    if (!suspension.startDate || !suspension.endDate) return null;
    const ms = new Date(suspension.endDate).getTime() - new Date(suspension.startDate).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return Math.max(1, Math.round(ms / 86_400_000));
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
    const { isAdmin, can } = useAccess();
    const [warnings, setWarnings] = useState<AdminWarningHistoryItem[]>([]);
    const [warningsLoading, setWarningsLoading] = useState(false);
    const [warningsError, setWarningsError] = useState<string | null>(null);
    const [suspensions, setSuspensions] = useState<AdminSuspensionHistoryItem[]>([]);
    const [suspensionsLoading, setSuspensionsLoading] = useState(false);
    const [suspensionsError, setSuspensionsError] = useState<string | null>(null);
    const [suspensionsLoadedAt, setSuspensionsLoadedAt] = useState(0);
    const [relationships, setRelationships] = useState<AdminUserRelationships>(createEmptyRelationships);
    const [relationshipLoading, setRelationshipLoading] = useState(false);
    const [relationshipError, setRelationshipError] = useState<string | null>(null);
    const [cccd, setCccd] = useState<AdminUserCccdUrls | null>(null);
    const [cccdLoading, setCccdLoading] = useState(false);
    const [cccdError, setCccdError] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imagePreviewError, setImagePreviewError] = useState(false);
    const relationshipRequestRef = useRef<AbortController | null>(null);
    const warningRequestRef = useRef<AbortController | null>(null);
    const suspensionRequestRef = useRef<AbortController | null>(null);
    const cccdRequestRef = useRef<AbortController | null>(null);

    const userId = user?.userid;
    const normalizedRole = user?.primaryrole?.toLowerCase();
    const supportsRelationships = normalizedRole === 'parent' || normalizedRole === 'student';
    // CCCD chỉ áp dụng cho Tutor/Student tự đăng ký (Parent không xác minh CCCD).
    const supportsCccd = normalizedRole === 'tutor' || normalizedRole === 'student';
    // GET /admin/warnings/users/{id} yêu cầu quyền warning.view — không có quyền
    // thì đừng gọi để khỏi nhận 403 rồi hiện lỗi vô nghĩa.
    const canViewWarnings = can('warning.view');
    const canViewCccd = can('tutor_cccd.view');

    const fetchWarnings = useCallback(async () => {
        if (!userId || !canViewWarnings) return;

        warningRequestRef.current?.abort();
        const controller = new AbortController();
        warningRequestRef.current = controller;

        setWarningsError(null);
        setWarningsLoading(true);

        try {
            const summary = await getUserWarnings(userId, controller.signal);
            if (!controller.signal.aborted) setWarnings(summary.warnings);
        } catch (error: unknown) {
            const isCanceled =
                controller.signal.aborted ||
                (error as { code?: string; name?: string })?.code === 'ERR_CANCELED' ||
                (error as { name?: string })?.name === 'AbortError';
            if (!isCanceled) {
                setWarnings([]);
                setWarningsError('Không thể tải lịch sử cảnh cáo. Vui lòng thử lại.');
            }
        } finally {
            if (warningRequestRef.current === controller) {
                warningRequestRef.current = null;
                setWarningsLoading(false);
            }
        }
    }, [canViewWarnings, userId]);

    const fetchSuspensions = useCallback(async () => {
        if (!userId || !canViewWarnings) return;

        suspensionRequestRef.current?.abort();
        const controller = new AbortController();
        suspensionRequestRef.current = controller;

        setSuspensionsError(null);
        setSuspensionsLoading(true);

        try {
            const history = await getUserSuspensions(userId, controller.signal);
            if (!controller.signal.aborted) {
                setSuspensions(history);
                setSuspensionsLoadedAt(Date.now());
            }
        } catch (error: unknown) {
            const isCanceled =
                controller.signal.aborted ||
                (error as { code?: string; name?: string })?.code === 'ERR_CANCELED' ||
                (error as { name?: string })?.name === 'AbortError';
            if (!isCanceled) {
                setSuspensions([]);
                setSuspensionsError('Không thể tải lịch sử tạm ngưng. Vui lòng thử lại.');
            }
        } finally {
            if (suspensionRequestRef.current === controller) {
                suspensionRequestRef.current = null;
                setSuspensionsLoading(false);
            }
        }
    }, [canViewWarnings, userId]);

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

    const fetchCccd = useCallback(async () => {
        if (!userId || !supportsCccd || !canViewCccd) return;

        cccdRequestRef.current?.abort();
        const controller = new AbortController();
        cccdRequestRef.current = controller;

        setCccdError(null);
        setCccdLoading(true);

        try {
            const result = await getUserCccdUrls(userId, controller.signal);
            if (!controller.signal.aborted) setCccd(result);
        } catch (error: unknown) {
            const isCanceled =
                controller.signal.aborted ||
                (error as { code?: string; name?: string })?.code === 'ERR_CANCELED' ||
                (error as { name?: string })?.name === 'AbortError';
            if (!isCanceled) {
                setCccd(null);
                setCccdError('Không thể tải ảnh CCCD. Vui lòng thử lại.');
            }
        } finally {
            if (cccdRequestRef.current === controller) {
                cccdRequestRef.current = null;
                setCccdLoading(false);
            }
        }
    }, [canViewCccd, supportsCccd, userId]);

    // Lịch sử tạm ngưng dùng chung quyền warning.view với cảnh cáo, nhưng tách
    // request riêng để một bên lỗi không giấu mất bên còn lại.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen || !userId || !canViewWarnings) {
            const activeRequest = suspensionRequestRef.current;
            suspensionRequestRef.current = null;
            activeRequest?.abort();
            setSuspensions([]);
            setSuspensionsError(null);
            setSuspensionsLoading(false);
            return undefined;
        }

        void fetchSuspensions();
        return () => {
            const activeRequest = suspensionRequestRef.current;
            suspensionRequestRef.current = null;
            activeRequest?.abort();
        };
    }, [canViewWarnings, fetchSuspensions, isOpen, userId]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Cảnh cáo lấy từ API thật; tách riêng để 403/lỗi mạng ở đây không kéo theo
    // các phần khác của modal, và để hủy được khi admin chuyển nhanh sang user khác.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen || !userId || !canViewWarnings) {
            const activeRequest = warningRequestRef.current;
            warningRequestRef.current = null;
            activeRequest?.abort();
            setWarnings([]);
            setWarningsError(null);
            setWarningsLoading(false);
            return undefined;
        }

        void fetchWarnings();
        return () => {
            const activeRequest = warningRequestRef.current;
            warningRequestRef.current = null;
            activeRequest?.abort();
        };
    }, [canViewWarnings, fetchWarnings, isOpen, userId]);
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

    // Ảnh CCCD là dữ liệu private/nhạy cảm — tải riêng, huỷ khi admin đóng modal hoặc
    // chuyển nhanh sang user khác, không giữ signed URL cũ lâu hơn cần thiết.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen || !userId || !supportsCccd || !canViewCccd) {
            const activeRequest = cccdRequestRef.current;
            cccdRequestRef.current = null;
            activeRequest?.abort();
            setCccd(null);
            setCccdError(null);
            setCccdLoading(false);
            return undefined;
        }

        void fetchCccd();
        return () => {
            const activeRequest = cccdRequestRef.current;
            cccdRequestRef.current = null;
            activeRequest?.abort();
        };
    }, [canViewCccd, fetchCccd, isOpen, supportsCccd, userId]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Endpoint file private đòi JWT + đúng quyền nên phải tải bằng JS rồi đổi sang blob URL,
    // không gán thẳng link vào <img src> được (thẻ img không gửi được token).
    const openCccdImage = useCallback(async (signedUrl?: string | null) => {
        if (!signedUrl) return;
        setImagePreviewError(false);
        try {
            const objectUrl = await fetchProtectedImage(signedUrl);
            setImagePreview((prev) => {
                releaseProtectedImage(prev);
                return objectUrl;
            });
        } catch {
            setImagePreview(signedUrl);
            setImagePreviewError(true);
        }
    }, []);

    const closeImagePreview = useCallback(() => {
        setImagePreview((prev) => {
            releaseProtectedImage(prev);
            return null;
        });
        setImagePreviewError(false);
    }, []);

    // Đóng overlay xem ảnh CCCD bằng Escape (không đóng luôn cả modal chi tiết).
    useEffect(() => {
        if (!imagePreview) return undefined;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeImagePreview();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeImagePreview, imagePreview]);

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
        <>
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

                    {/* Ảnh CCCD — chỉ Tutor/Student (Parent không tự xác minh CCCD). Link là signed URL,
                        hết hạn sau ~15 phút, chỉ Admin có quyền tutor_cccd.view mới xem được. */}
                    {supportsCccd && (
                        <section className="um-section" aria-labelledby="user-cccd-title">
                            <div className="um-section-head">
                                <h3 id="user-cccd-title" className="um-section-title">
                                    <span className="material-symbols-outlined">badge</span>
                                    Xác minh CCCD
                                </h3>
                            </div>

                            {!canViewCccd ? (
                                <div className="um-empty">Bạn không có quyền xem ảnh CCCD người dùng.</div>
                            ) : cccdLoading ? (
                                <p className="um-loading">Đang tải…</p>
                            ) : cccdError ? (
                                <div className="um-relationship-error" role="alert">
                                    <span className="material-symbols-outlined">cloud_off</span>
                                    <div>
                                        <strong>Chưa thể tải ảnh CCCD</strong>
                                        <span>{cccdError}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="um-btn um-btn-secondary"
                                        onClick={() => void fetchCccd()}
                                    >
                                        <span className="material-symbols-outlined">refresh</span>
                                        Thử lại
                                    </button>
                                </div>
                            ) : !cccd?.frontImageUrl && !cccd?.backImageUrl ? (
                                <div className="um-empty">Chưa có ảnh CCCD được lưu trong hệ thống.</div>
                            ) : (
                                <div className="um-cccd-actions">
                                    {cccd.frontImageUrl && (
                                        <button
                                            type="button"
                                            className="um-btn um-btn-secondary"
                                            onClick={() => void openCccdImage(cccd.frontImageUrl)}
                                        >
                                            <span className="material-symbols-outlined">visibility</span>
                                            Xem mặt trước
                                        </button>
                                    )}
                                    {cccd.backImageUrl && (
                                        <button
                                            type="button"
                                            className="um-btn um-btn-secondary"
                                            onClick={() => void openCccdImage(cccd.backImageUrl)}
                                        >
                                            <span className="material-symbols-outlined">visibility</span>
                                            Xem mặt sau
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

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
                            {canViewWarnings && !warningsLoading && !warningsError && (
                                <span
                                    className={`um-badge ${warnings.length > 0 ? 'um-badge-warning' : 'um-badge-neutral'}`}
                                >
                                    {warnings.length} cảnh cáo
                                </span>
                            )}
                        </div>

                        {!canViewWarnings ? (
                            <div className="um-empty">Bạn không có quyền xem lịch sử cảnh cáo.</div>
                        ) : warningsLoading ? (
                            <p className="um-loading">Đang tải…</p>
                        ) : warningsError ? (
                            <div className="um-relationship-error" role="alert">
                                <span className="material-symbols-outlined">cloud_off</span>
                                <div>
                                    <strong>Chưa thể tải cảnh cáo</strong>
                                    <span>{warningsError}</span>
                                </div>
                                <button
                                    type="button"
                                    className="um-btn um-btn-secondary"
                                    onClick={() => void fetchWarnings()}
                                >
                                    <span className="material-symbols-outlined">refresh</span>
                                    Thử lại
                                </button>
                            </div>
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
                                            const sev = getWarningLevelMeta(warning.warningLevel);
                                            return (
                                                <tr key={warning.warningId}>
                                                    <td>
                                                        {warning.createdAt
                                                            ? new Date(warning.createdAt).toLocaleDateString('vi-VN')
                                                            : '—'}
                                                    </td>
                                                    <td>
                                                        {warning.reason || '—'}
                                                        {warning.relatedBookingId != null && (
                                                            <span className="um-table-note">
                                                                #{warning.relatedBookingId}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="um-center">
                                                        <span className={`um-badge um-badge-${sev.variant}`}>
                                                            {sev.label}
                                                        </span>
                                                    </td>
                                                    {/* Cảnh cáo tự động không có admin đứng tên. */}
                                                    <td>{warning.issuedByName || 'Hệ thống'}</td>
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
                            {canViewWarnings && !suspensionsLoading && !suspensionsError && (
                                <span
                                    className={`um-badge ${suspensions.length > 0 ? 'um-badge-danger' : 'um-badge-neutral'}`}
                                >
                                    {suspensions.length} lần
                                </span>
                            )}
                        </div>

                        {!canViewWarnings ? (
                            <div className="um-empty">Bạn không có quyền xem lịch sử tạm ngưng.</div>
                        ) : suspensionsLoading ? (
                            <p className="um-loading">Đang tải…</p>
                        ) : suspensionsError ? (
                            <div className="um-relationship-error" role="alert">
                                <span className="material-symbols-outlined">cloud_off</span>
                                <div>
                                    <strong>Chưa thể tải lịch sử tạm ngưng</strong>
                                    <span>{suspensionsError}</span>
                                </div>
                                <button
                                    type="button"
                                    className="um-btn um-btn-secondary"
                                    onClick={() => void fetchSuspensions()}
                                >
                                    <span className="material-symbols-outlined">refresh</span>
                                    Thử lại
                                </button>
                            </div>
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
                                        {suspensions.map((suspension) => {
                                            const inEffect = isSuspensionInEffect(suspension, suspensionsLoadedAt);
                                            const durationDays = getSuspensionDurationDays(suspension);
                                            const typeLabel =
                                                SUSPENSION_TYPE_LABEL[suspension.suspensionType] ??
                                                suspension.suspensionType;
                                            return (
                                                <tr key={suspension.suspensionId}>
                                                    <td>
                                                        {suspension.startDate
                                                            ? new Date(suspension.startDate).toLocaleDateString('vi-VN')
                                                            : '—'}
                                                    </td>
                                                    <td>
                                                        {suspension.endDate
                                                            ? new Date(suspension.endDate).toLocaleDateString('vi-VN')
                                                            : 'Vĩnh viễn'}
                                                    </td>
                                                    <td>
                                                        {suspension.reason || '—'}
                                                        <span className="um-table-note">
                                                            {durationDays != null
                                                                ? `${typeLabel} · ${durationDays} ngày`
                                                                : typeLabel}
                                                        </span>
                                                    </td>
                                                    <td className="um-center">
                                                        <span
                                                            className={`um-badge ${inEffect ? 'um-badge-danger' : 'um-badge-neutral'}`}
                                                        >
                                                            {inEffect ? 'Đang áp dụng' : 'Đã hết hạn'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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

        {imagePreview && (
            <div
                className="detail-image-preview-overlay"
                onMouseDown={closeImagePreview}
            >
                <div className="detail-image-preview-container" onMouseDown={(event) => event.stopPropagation()}>
                    <button
                        type="button"
                        className="detail-image-preview-close"
                        onClick={closeImagePreview}
                        aria-label="Đóng ảnh xem trước"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                    {imagePreviewError ? (
                        <div className="detail-image-preview-error">
                            <span className="material-symbols-outlined">broken_image</span>
                            <strong>Không thể tải ảnh xem trước</strong>
                            <a href={imagePreview} target="_blank" rel="noopener noreferrer">
                                Mở ảnh ở tab mới
                                <span className="material-symbols-outlined">open_in_new</span>
                            </a>
                        </div>
                    ) : (
                        <img
                            src={imagePreview}
                            alt="Ảnh CCCD xem trước"
                            className="detail-image-preview-img"
                            onError={() => setImagePreviewError(true)}
                        />
                    )}
                </div>
            </div>
        )}
        </>
    );
};

export default UserDetailModal;
