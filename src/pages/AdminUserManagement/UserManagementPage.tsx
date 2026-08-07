import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
    getAllUsers,
    deactivateUser,
    reactivateUser,
    issueWarning,
    suspendTutor,
    deleteUser,
} from '../../services/admin.service';
import { DataTable, PageContainer, SectionCard } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import { useAccess } from '../../contexts/AccessContext';
import type { UserListItem } from '../../types/admin.types';
import type { FlatUserDetail } from './userTypes';
import UserDetailModal from './components/UserDetailModal';
import BlockUserModal from './components/BlockUserModal';
import IssueWarningModal from './components/IssueWarningModal';
import SuspendUserModal from './components/SuspendUserModal';
import UserFormModal from './components/UserFormModal';
import { getRoleDisplay } from './roleDisplay';
import { formatDateTime } from '../../utils/formatters';

/** Customer roles this page can be scoped to (via the sidebar sub-menu). */
export type CustomerRole = 'Student' | 'Parent' | 'Tutor';

interface UserManagementPageProps {
    /** When set, the page is locked to a single role: the role filter is hidden,
     *  the title reflects the role, and "Thêm người dùng" defaults to it. */
    lockedRole?: CustomerRole;
}

const UserManagementPage = ({ lockedRole }: UserManagementPageProps) => {
    const { can } = useAccess();

    // State
    const [users, setUsers] = useState<FlatUserDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(ADMIN_PAGE_SIZE);

    // Filters. When the view is locked to a role, that role is the effective
    // filter and the dropdown is hidden.
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const effectiveRole = lockedRole ?? roleFilter;
    // searchInput: live value of the text box (changes on every keystroke)
    // searchQuery: committed value sent to BE — only updates when the user
    //              clicks the "Tìm kiếm" button or presses Enter. Keeping
    //              these split avoids 1 API call per keystroke.
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Tracks the in-flight fetch so a newer request can cancel an older one,
    // preventing late responses from overwriting fresh results.
    const fetchAbortRef = useRef<AbortController | null>(null);

    // Modals
    const [selectedUser, setSelectedUser] = useState<FlatUserDetail | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchUsers = useCallback(async () => {
        // Abort any in-flight fetch — protects against out-of-order responses
        // when filters change quickly (e.g. user switches role then status).
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        try {
            setLoading(true);
            setLoadError(null);
            const params: {
                searchTerm?: string;
                role?: string;
                status?: number;
                pageNumber: number;
                pageSize: number;
            } = { pageNumber: page, pageSize: limit };

            if (searchQuery) params.searchTerm = searchQuery;
            if (effectiveRole !== 'all') params.role = effectiveRole;
            // BE status is a 0/1 column — map UI selections accordingly.
            if (statusFilter === 'active') params.status = 1;
            else if (statusFilter === 'blocked') params.status = 0;

            const { users: data, total: totalCount } = await getAllUsers(params, controller.signal);

            // If a newer request has already started, drop this stale response.
            if (controller.signal.aborted) return;

            // Map UserListItem → FlatUserDetail
            const mapped: FlatUserDetail[] = data.map((u: UserListItem) => ({
                userid: u.userid,
                fullname: u.fullname,
                email: u.email,
                phone: u.phone || '',
                avatarurl:
                    u.avatarurl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullname)}&background=random`,
                primaryrole: u.primaryrole || 'student',
                accountstatus: u.status === 'active' ? 'active' : u.status === 'inactive' ? 'blocked' : u.status,
                isidentityverified: false,
                createdat: u.createdat || '',
                lastloginat: u.lastloginat || '',
                warningcount: u.warningsCount ?? 0,
                suspensioncount: u.suspensionsCount ?? 0,
            }));

            const maxPage = Math.max(1, Math.ceil(totalCount / limit));
            if (page > maxPage) {
                setPage(maxPage);
                return;
            }

            setUsers(mapped);
            setTotal(totalCount);

            // Modal chi tiết giữ bản sao user chụp lúc bấm mở. Các thao tác đổi
            // trạng thái (cảnh cáo mức Cao tự tạm ngưng, chặn, tạm ngưng) có gọi
            // lại fetchUsers nhưng bản sao đó thì không được cập nhật, nên modal
            // vẫn hiện trạng thái cũ và sai nút Chặn/Mở khóa cho tới khi F5.
            // Đồng bộ lại theo dữ liệu vừa tải; giữ nguyên nếu user đã rơi khỏi
            // trang hiện tại do bộ lọc, vì lúc đó không có gì mới hơn để dùng.
            setSelectedUser((current) =>
                current ? (mapped.find((item) => item.userid === current.userid) ?? current) : current
            );
        } catch (err: unknown) {
            // Aborted requests throw — silently ignore them, only surface real errors.
            const isAbort =
                (err as { name?: string; code?: string })?.name === 'CanceledError' ||
                (err as { name?: string; code?: string })?.code === 'ERR_CANCELED';
            if (isAbort) return;
            console.error('Error fetching users:', err);
            setUsers([]);
            setTotal(0);
            setLoadError('Không thể tải danh sách người dùng. Vui lòng thử lại.');
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            // Only clear loading if THIS request is still the active one;
            // otherwise the newer request will manage the loading state.
            if (fetchAbortRef.current === controller) {
                setLoading(false);
            }
        }
    }, [limit, page, effectiveRole, searchQuery, statusFilter]);

    // Fetch users on mount, page change, or any committed filter change.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchUsers();
        return () => fetchAbortRef.current?.abort();
    }, [fetchUsers]);

    // Reset to page 1 when switching between role-scoped views (Student → Parent).
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
    }, [lockedRole]);

    // Handlers
    const handleUserClick = (user: FlatUserDetail) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
    };

    const handleBlockUser = async (userId: string, reason: string) => {
        void reason;

        try {
            await deactivateUser(userId);
            toast.success('Đã vô hiệu hóa tài khoản người dùng');
            setIsBlockModalOpen(false);
            setIsDetailModalOpen(false);
            await fetchUsers();
        } catch {
            toast.error('Không thể vô hiệu hóa tài khoản');
        }
    };

    const handleUnblockUser = async () => {
        if (!selectedUser) return;
        try {
            // Dedicated reactivate endpoint: restores status = 1 and, for an
            // Active tutor, also re-publishes the profile (Ispublic = true).
            await reactivateUser(selectedUser.userid);
            toast.success(`Đã mở khóa tài khoản ${selectedUser.fullname}`);
            setIsDetailModalOpen(false);
            await fetchUsers();
        } catch {
            toast.error('Không thể mở khóa tài khoản');
        }
    };

    const handleIssueWarning = async (userId: string, reason: string, severity: string, relatedBookingId?: string) => {
        // BE có đủ 3 mức (WarningLevel.cs): 1 = Thấp, 2 = Trung bình, 3 = Cao.
        // Mức 3 khiến BE tạm ngưng tài khoản ngay lập tức; mức 1-2 chỉ tạm ngưng
        // khi tích lũy đủ 3 cảnh cáo trong 30 ngày.
        const warninglevel = severity === 'low' ? 1 : severity === 'medium' ? 2 : 3;
        try {
            await issueWarning({
                userid: userId,
                warninglevel,
                reason,
                relatedbookingid: relatedBookingId,
            });
            // The modal owns its own success toast; we just refresh the list
            // so warningcount in the row updates without needing a manual reload.
            setIsWarningModalOpen(false);
            setIsDetailModalOpen(false);
            await fetchUsers();
        } catch (err) {
            // Re-throw so the modal can keep itself open and surface its own error toast.
            console.error('issueWarning failed:', err);
            throw err;
        }
    };

    const handleSuspendUser = async (userId: string, reason: string, durationDays: number) => {
        try {
            await suspendTutor({
                userid: userId,
                // FE doesn't have a type selector — fall back to the same heuristic
                // used in AdminDisputes: long suspensions = full lock, short = soft hide.
                suspensiontype: durationDays > 30 ? 'account_locked' : 'hidden_1_week',
                reason,
                durationDays,
            });
            setIsSuspendModalOpen(false);
            setIsDetailModalOpen(false);
            await fetchUsers();
        } catch (err) {
            console.error('suspendTutor failed:', err);
            throw err;
        }
    };

    const openCreateModal = () => {
        setFormMode('create');
        setSelectedUser(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = () => {
        // Opened from the detail modal — keep selectedUser, swap to the form.
        setFormMode('edit');
        setIsDetailModalOpen(false);
        setIsFormModalOpen(true);
    };

    const openUserActionModal = (open: (value: boolean) => void) => {
        setIsDetailModalOpen(false);
        open(true);
    };

    const closeUserActionModal = (close: (value: boolean) => void) => {
        close(false);
        setIsDetailModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setIsDetailModalOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        try {
            setIsDeleting(true);
            await deleteUser(selectedUser.userid);
            toast.success(`Đã xóa tài khoản ${selectedUser.fullname}`);
            setIsDeleteModalOpen(false);
            setIsDetailModalOpen(false);
            setSelectedUser(null);
            await fetchUsers();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || 'Không thể xóa tài khoản');
        } finally {
            setIsDeleting(false);
        }
    };

    /** Reset-password is intentionally not wired: BE has no endpoint for an
     *  admin-initiated password reset (only student self-service). The button
     *  is hidden in the UserDetailModal until BE adds support. */

    /** Commit the current input value as the search query — this is the
     *  one place where an API call is triggered. Called by the search
     *  button and by Enter inside the input. Trim avoids whitespace-only
     *  searches hitting the BE. */
    const commitSearch = () => {
        const next = searchInput.trim();
        // No-op if nothing actually changed (avoids redundant fetch when the
        // user clicks the button without changing the query).
        if (next === searchQuery) return;
        setSearchQuery(next);
        setPage(1);
    };

    /** Clear the box and, if a search was active, refetch the unfiltered list. */
    const clearSearch = () => {
        setSearchInput('');
        if (searchQuery) {
            setSearchQuery('');
            setPage(1);
        }
    };

    const hasActiveFilters = Boolean(
        searchInput || searchQuery || statusFilter !== 'all' || (!lockedRole && roleFilter !== 'all'),
    );

    const resetFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setStatusFilter('all');
        setRoleFilter('all');
        setPage(1);
    };

    const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
        switch (status) {
            case 'active':
                return 'success';
            case 'suspended':
                return 'warning';
            case 'blocked':
                return 'error';
            default:
                return 'neutral';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active':
                return 'Hoạt động';
            case 'suspended':
                return 'Tạm ngưng';
            case 'blocked':
                return 'Bị chặn';
            default:
                return status;
        }
    };

    const roleColumn: DataTableColumn<FlatUserDetail> = {
        key: 'role',
        title: 'Vai trò',
        render: (user) => {
            const { label, variant } = getRoleDisplay(user.primaryrole);
            return <span className={`um-badge um-badge-${variant === 'dark' ? 'neutral' : variant}`}>{label}</span>;
        },
        hideOnMobile: true,
        width: 110,
    };

    const userColumns: DataTableColumn<FlatUserDetail>[] = [
        {
            key: 'identity',
            title: 'Người dùng',
            render: (user) => (
                <div className="um-cell-user">
                    <img className="um-avatar" src={user.avatarurl} alt="" loading="lazy" />
                    <div className="um-cell-text">
                        <span className="um-cell-name" title={user.fullname}>
                            {user.fullname}
                        </span>
                        <span className="um-cell-sub" title={user.email}>
                            {user.email}
                        </span>
                        <span className="um-cell-mobile-meta">
                            {!lockedRole && getRoleDisplay(user.primaryrole).label}
                            {!lockedRole && user.phone ? ' · ' : ''}
                            {user.phone || (lockedRole ? 'Chưa có số điện thoại' : '')}
                        </span>
                    </div>
                </div>
            ),
            minWidth: 220,
        },
        ...(!lockedRole ? [roleColumn] : []),
        {
            key: 'contact',
            title: 'Số điện thoại',
            render: (user) => <span className={`um-meta ${user.phone ? '' : 'um-meta-dim'}`}>{user.phone || '—'}</span>,
            hideOnMobile: true,
            hideOnTablet: true,
            width: 130,
        },
        {
            key: 'joinDate',
            title: 'Tham gia',
            render: (user) => (
                <span className="um-meta">
                    {user.createdat ? new Date(user.createdat).toLocaleDateString('vi-VN') : '—'}
                </span>
            ),
            hideOnMobile: true,
            hideOnTablet: true,
            width: 110,
        },
        {
            key: 'lastLoginAt',
            title: 'Đăng nhập cuối',
            render: (user) => (
                <span className={`um-meta ${user.lastloginat ? '' : 'um-meta-dim'}`}>
                    {user.lastloginat ? formatDateTime(user.lastloginat) : 'Chưa đăng nhập'}
                </span>
            ),
            hideOnMobile: true,
            width: 150,
        },
        {
            key: 'history',
            title: 'Lịch sử',
            render: (user) => {
                if (user.warningcount > 0) {
                    return (
                        <span className="um-flag um-flag-warn">
                            <span className="material-symbols-outlined icon-filled">warning</span>
                            {user.warningcount} cảnh cáo
                        </span>
                    );
                }
                if (user.suspensioncount > 0) {
                    return (
                        <span className="um-flag um-flag-suspend">
                            <span className="material-symbols-outlined icon-filled">flag</span>
                            {user.suspensioncount} lần tạm ngưng
                        </span>
                    );
                }
                return <span className="um-flag um-flag-ok">Tốt</span>;
            },
            hideOnMobile: true,
            hideOnTablet: true,
            width: 140,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (user) => {
                const variant = getStatusVariant(user.accountstatus);
                return (
                    <span className={`um-badge um-badge-${variant === 'error' ? 'danger' : variant}`}>
                        {getStatusLabel(user.accountstatus)}
                    </span>
                );
            },
            width: 110,
            mobileWidth: 96,
        },
        {
            key: 'actions',
            title: '',
            align: 'right',
            render: (user) => (
                <button
                    type="button"
                    className="um-row-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(user);
                    }}
                    aria-label={`Xem chi tiết ${user.fullname}`}
                >
                    <span className="material-symbols-outlined">visibility</span>
                    <span className="um-row-btn-label">Xem</span>
                </button>
            ),
            width: 84,
            mobileWidth: 48,
        },
    ];

    const scopedRoleLabel = lockedRole ? getRoleDisplay(lockedRole).label : '';
    const roleLabel = scopedRoleLabel.toLowerCase();
    const pageTitle = lockedRole ? scopedRoleLabel : 'Quản lý người dùng';
    const pageSubtitle = lockedRole
        ? `Theo dõi hồ sơ và trạng thái tài khoản ${roleLabel} trong hệ thống.`
        : 'Theo dõi học viên, phụ huynh và gia sư trong cùng một không gian vận hành.';
    const addButtonLabel = lockedRole ? `Thêm ${roleLabel}` : 'Thêm người dùng';
    const hasCommittedFilters = Boolean(searchQuery || statusFilter !== 'all' || (!lockedRole && roleFilter !== 'all'));
    const resultSummary = loading
        ? 'Đang cập nhật danh sách…'
        : hasCommittedFilters
          ? `${total.toLocaleString('vi-VN')} kết quả phù hợp`
          : `${total.toLocaleString('vi-VN')} tài khoản`;

    return (
        <>
            <PageContainer
                eyebrow="Tài khoản"
                title={pageTitle}
                subtitle={pageSubtitle}
                maxWidth="wide"
                headerAction={
                    can('user.update') ? (
                        <div className="admin-ui-actions um-page-actions">
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-primary"
                                onClick={openCreateModal}
                            >
                                <span className="material-symbols-outlined">person_add</span>
                                {addButtonLabel}
                            </button>
                        </div>
                    ) : undefined
                }
            >
                <SectionCard className="um-list-card">
                    <div className="um-scope">
                        <div className="um-toolbar">
                            <form
                                className="um-search-form"
                                role="search"
                                aria-label="Tìm người dùng"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    commitSearch();
                                }}
                            >
                                <div className="um-search">
                                    <label className="um-visually-hidden" htmlFor="user-management-search">
                                        Tên, email hoặc số điện thoại
                                    </label>
                                    <span className="material-symbols-outlined um-search-icon">search</span>
                                    <input
                                        id="user-management-search"
                                        className="um-search-input"
                                        placeholder="Tìm theo tên, email hoặc số điện thoại…"
                                        type="search"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        autoComplete="off"
                                    />
                                    {searchInput && (
                                        <button
                                            type="button"
                                            className="um-search-clear"
                                            onClick={clearSearch}
                                            aria-label="Xoá từ khoá"
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    className="um-btn um-btn-primary um-search-submit"
                                    disabled={searchInput.trim() === searchQuery}
                                >
                                    <span className="material-symbols-outlined">search</span>
                                    Tìm
                                </button>
                            </form>

                            <div className="um-filter-group" role="group" aria-label="Bộ lọc danh sách">
                                {!lockedRole && (
                                    <label className="um-filter-field">
                                        <span className="um-visually-hidden">Vai trò</span>
                                        <span className="material-symbols-outlined um-filter-icon">groups</span>
                                        <select
                                            className="um-select"
                                            value={roleFilter}
                                            onChange={(e) => {
                                                setRoleFilter(e.target.value);
                                                setPage(1);
                                            }}
                                            aria-label="Lọc theo vai trò"
                                        >
                                            <option value="all">Mọi vai trò</option>
                                            <option value="Student">Học viên</option>
                                            <option value="Parent">Phụ huynh</option>
                                            <option value="Tutor">Gia sư</option>
                                        </select>
                                    </label>
                                )}

                                <label className="um-filter-field">
                                    <span className="um-visually-hidden">Trạng thái</span>
                                    <span className="material-symbols-outlined um-filter-icon">filter_alt</span>
                                    <select
                                        className="um-select"
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setPage(1);
                                        }}
                                        aria-label="Lọc theo trạng thái"
                                    >
                                        <option value="all">Mọi trạng thái</option>
                                        <option value="active">Hoạt động</option>
                                        <option value="blocked">Bị chặn</option>
                                    </select>
                                </label>

                                {hasActiveFilters && (
                                    <button type="button" className="um-reset-btn" onClick={resetFilters}>
                                        <span className="material-symbols-outlined">restart_alt</span>
                                        Đặt lại
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="um-result-bar" role="status" aria-live="polite">
                            <span className={`material-symbols-outlined ${loading ? 'um-result-icon-spin' : ''}`}>
                                {loading ? 'progress_activity' : 'manage_accounts'}
                            </span>
                            <strong>{resultSummary}</strong>
                            {!loading && users.length > 0 && (
                                <span className="um-result-hint">Chọn một dòng để xem chi tiết</span>
                            )}
                        </div>

                        {loadError ? (
                            <div className="um-load-error" role="alert">
                                <span className="material-symbols-outlined">cloud_off</span>
                                <div className="um-load-error-copy">
                                    <strong>Chưa thể tải dữ liệu</strong>
                                    <span>{loadError}</span>
                                </div>
                                <button
                                    type="button"
                                    className="um-btn um-btn-secondary"
                                    onClick={() => void fetchUsers()}
                                >
                                    <span className="material-symbols-outlined">refresh</span>
                                    Thử lại
                                </button>
                            </div>
                        ) : (
                            <DataTable<FlatUserDetail>
                                columns={userColumns}
                                data={users}
                                rowKey="userid"
                                loading={loading}
                                loadingText="Đang tải người dùng..."
                                emptyText={
                                    hasCommittedFilters
                                        ? 'Không có người dùng nào khớp bộ lọc'
                                        : lockedRole
                                          ? `Chưa có ${roleLabel} nào trong danh sách`
                                          : 'Chưa có người dùng nào'
                                }
                                emptyIcon={
                                    <span className="material-symbols-outlined um-empty-icon">
                                        {hasCommittedFilters ? 'search_off' : 'group_off'}
                                    </span>
                                }
                                onRowClick={handleUserClick}
                                focusableRows={false}
                                tableLabel={lockedRole ? `Danh sách ${roleLabel}` : 'Danh sách người dùng'}
                                pagination={{
                                    current: page,
                                    pageSize: limit,
                                    total,
                                    onChange: setPage,
                                }}
                                minWidth={lockedRole ? 820 : 930}
                                variant="embedded"
                                density="compact"
                                adaptive
                            />
                        )}
                    </div>
                </SectionCard>
            </PageContainer>

            {/* Modals */}
            <UserDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
                onBlockUser={() => openUserActionModal(setIsBlockModalOpen)}
                onUnblockUser={handleUnblockUser}
                onIssueWarning={() => openUserActionModal(setIsWarningModalOpen)}
                onSuspendUser={() => openUserActionModal(setIsSuspendModalOpen)}
                onEditUser={openEditModal}
                onDeleteUser={() => openUserActionModal(setIsDeleteModalOpen)}
                /* onResetPassword intentionally omitted — BE has no admin
                   reset-password endpoint yet, so the button stays hidden. */
            />

            <BlockUserModal
                isOpen={isBlockModalOpen}
                onClose={() => closeUserActionModal(setIsBlockModalOpen)}
                user={selectedUser}
                onBlock={handleBlockUser}
            />

            <IssueWarningModal
                isOpen={isWarningModalOpen}
                onClose={() => closeUserActionModal(setIsWarningModalOpen)}
                user={selectedUser}
                onIssue={handleIssueWarning}
            />

            <SuspendUserModal
                isOpen={isSuspendModalOpen}
                onClose={() => closeUserActionModal(setIsSuspendModalOpen)}
                user={selectedUser}
                onSuspend={handleSuspendUser}
            />

            <UserFormModal
                isOpen={isFormModalOpen}
                mode={formMode}
                user={formMode === 'edit' ? selectedUser : null}
                lockedRole={lockedRole}
                onClose={() => setIsFormModalOpen(false)}
                onSaved={fetchUsers}
            />

            {/* Delete confirmation — BE thực chất chỉ soft-delete (Status=0 + Isdeleted/Deletedat),
                không xóa row/dữ liệu khỏi DB. CMS hiện chưa có nút khôi phục tài khoản đã xóa. */}
            {isDeleteModalOpen && selectedUser && (
                <div
                    className="um-overlay"
                    onClick={() => !isDeleting && closeDeleteModal()}
                    onKeyDown={(event) => event.key === 'Escape' && !isDeleting && closeDeleteModal()}
                >
                    <div
                        className="um-modal um-modal-sm"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-user-dialog-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="um-modal-head">
                            <div className="um-modal-head-main">
                                <h3 id="delete-user-dialog-title" className="um-modal-title um-modal-title-danger">
                                    <span className="material-symbols-outlined">delete</span>
                                    Xóa tài khoản
                                </h3>
                                <p className="um-modal-sub">Tài khoản sẽ bị khóa và không thể đăng nhập lại. CMS hiện chưa có chức năng khôi phục.</p>
                            </div>
                            <button
                                type="button"
                                className="um-modal-close"
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                                aria-label="Đóng"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="um-modal-body">
                            <div className="um-identity">
                                <div
                                    className="um-identity-avatar"
                                    style={{ backgroundImage: `url('${selectedUser.avatarurl}')` }}
                                />
                                <div className="um-identity-main">
                                    <p className="um-identity-name">{selectedUser.fullname}</p>
                                    <p className="um-identity-sub">
                                        {getRoleDisplay(selectedUser.primaryrole).label} • {selectedUser.email}
                                    </p>
                                </div>
                            </div>

                            <div className="um-callout um-callout-danger">
                                <span className="material-symbols-outlined">error</span>
                                <div>
                                    <p className="um-callout-title">Không xóa dữ liệu khỏi hệ thống</p>
                                    <p className="um-callout-text">
                                        Tài khoản và dữ liệu liên quan vẫn được giữ lại — hành động này chỉ khóa đăng
                                        nhập và đánh dấu tài khoản đã xóa. Nếu chỉ cần tạm ngăn đăng nhập và có thể mở
                                        lại sau, hãy dùng “Chặn tài khoản” thay vì xoá, vì CMS hiện chưa có nút khôi
                                        phục cho tài khoản đã xóa.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="um-modal-foot">
                            <button
                                className="um-btn um-btn-secondary"
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                            >
                                Hủy
                            </button>
                            <button className="um-btn um-btn-danger" onClick={handleDeleteUser} disabled={isDeleting}>
                                <span className="material-symbols-outlined">delete</span>
                                {isDeleting ? 'Đang xóa…' : 'Xóa tài khoản'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserManagementPage;
