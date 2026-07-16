import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getAllUsers, deactivateUser, reactivateUser, issueWarning, suspendTutor } from '../../services/admin.service';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import { Can } from '../../contexts/AccessContext';
import type { UserListItem } from '../../types/admin.types';
import type { FlatUserDetail } from './mockData';
import UserDetailModal from './components/UserDetailModal';
import BlockUserModal from './components/BlockUserModal';
import IssueWarningModal from './components/IssueWarningModal';
import SuspendUserModal from './components/SuspendUserModal';
import { getRoleDisplay } from './roleDisplay';
import { formatDateTime } from '../../utils/formatters';

import '../../styles/pages/admin-user-management.css';
import '../../styles/pages/admin-vetting-modal.css';

const UserManagementPage = () => {
    // State
    const [users, setUsers] = useState<FlatUserDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);

    // Filters
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
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

    const fetchUsers = useCallback(async () => {
        // Abort any in-flight fetch — protects against out-of-order responses
        // when filters change quickly (e.g. user switches role then status).
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        try {
            setLoading(true);
            const params: {
                searchTerm?: string;
                role?: string;
                status?: number;
                pageNumber: number;
                pageSize: number;
            } = { pageNumber: page, pageSize: limit };

            if (searchQuery) params.searchTerm = searchQuery;
            if (roleFilter !== 'all') params.role = roleFilter;
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
                avatarurl: u.avatarurl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullname)}&background=random`,
                primaryrole: u.primaryrole || 'student',
                accountstatus: u.status === 'active' ? 'active' : u.status === 'inactive' ? 'blocked' : u.status,
                isidentityverified: false,
                createdat: u.createdat || new Date().toISOString(),
                lastloginat: u.lastloginat || '',
                warningcount: u.warningsCount ?? 0,
                suspensioncount: u.suspensionsCount ?? 0,
            }));

            setUsers(mapped);
            setTotal(totalCount);
        } catch (err: unknown) {
            // Aborted requests throw — silently ignore them, only surface real errors.
            const isAbort =
                (err as { name?: string; code?: string })?.name === 'CanceledError' ||
                (err as { name?: string; code?: string })?.code === 'ERR_CANCELED';
            if (isAbort) return;
            console.error('Error fetching users:', err);
            toast.error('Không thể tải danh sách người dùng');
        } finally {
            // Only clear loading if THIS request is still the active one;
            // otherwise the newer request will manage the loading state.
            if (fetchAbortRef.current === controller) {
                setLoading(false);
            }
        }
    }, [limit, page, roleFilter, searchQuery, statusFilter]);

    // Fetch users on mount, page change, or any committed filter change.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchUsers();
        return () => fetchAbortRef.current?.abort();
    }, [fetchUsers]);

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

    const handleIssueWarning = async (
        userId: string,
        reason: string,
        severity: string,
        relatedBookingId?: string,
    ) => {
        // BE supports only 2 warning levels: 1 = minor, 2 = major.
        // The UI exposes 3 (low / medium / high); collapse them so:
        //   low                  → 1 (gentle reminder)
        //   medium / high        → 2 (formal warning / serious violation)
        // Keeps semantic meaning: any escalation beyond a "nudge" goes on record as major.
        const warninglevel = severity === 'low' ? 1 : 2;
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

    const handleSuspendUser = async (
        userId: string,
        reason: string,
        durationDays: number,
    ) => {
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

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitSearch();
        }
    };

    const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
        switch (status) {
            case 'active': return 'success';
            case 'suspended': return 'warning';
            case 'blocked': return 'error';
            default: return 'neutral';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Hoạt động';
            case 'suspended': return 'Tạm ngưng';
            case 'blocked': return 'Bị chặn';
            default: return status;
        }
    };

    const getRoleBadge = (role: string) => {
        const { label, variant } = getRoleDisplay(role);
        return <StatusBadge variant={variant} shape="tag">{label}</StatusBadge>;
    };

    const userColumns: DataTableColumn<FlatUserDetail>[] = [
        {
            key: 'identity',
            title: 'Thông tin người dùng',
            render: (user) => (
                <div className="user-mgmt-user-identity">
                    <img className="user-mgmt-avatar" src={user.avatarurl} alt={user.fullname} />
                    <div className="admin-ui-entity">
                        <span className="admin-ui-entity-primary">{user.fullname}</span>
                        <span className="admin-ui-entity-secondary">{user.email}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'role',
            title: 'Vai trò',
            render: (user) => getRoleBadge(user.primaryrole),
            hideOnMobile: true,
        },
        {
            key: 'joinDate',
            title: 'Ngày tham gia',
            render: (user) => (
                <span className="admin-ui-table-meta">
                    {new Date(user.createdat).toLocaleDateString('vi-VN')}
                </span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'lastLoginAt',
            title: 'Lần đăng nhập cuối',
            render: (user) => (
                <span className="admin-ui-table-meta">
                    {user.lastloginat ? formatDateTime(user.lastloginat) : 'N/A'}
                </span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'history',
            title: 'Lịch sử',
            render: (user) => {
                if (user.warningcount > 0) {
                    return (
                        <div className="user-mgmt-performance">
                            <span className="material-symbols-outlined user-mgmt-warning icon-filled">warning</span>
                            <span className="user-mgmt-warning-text">{user.warningcount} Cảnh cáo</span>
                        </div>
                    );
                }
                if (user.suspensioncount > 0) {
                    return (
                        <div className="user-mgmt-performance">
                            <span className="material-symbols-outlined user-mgmt-flag icon-filled">flag</span>
                            <span className="user-mgmt-flags">{user.suspensioncount} lần tạm ngưng</span>
                        </div>
                    );
                }
                return <span className="user-mgmt-no-data">Tốt</span>;
            },
            hideOnMobile: true,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (user) => (
                <StatusBadge variant={getStatusVariant(user.accountstatus)}>
                    {getStatusLabel(user.accountstatus)}
                </StatusBadge>
            ),
        },
        {
            key: 'actions',
            title: 'Hành động',
            align: 'center',
            render: (user) => (
                <button
                    type="button"
                    className="admin-ui-button admin-ui-button-secondary user-mgmt-view-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(user);
                    }}
                >
                    <span className="material-symbols-outlined">visibility</span>
                    Xem
                </button>
            ),
            width: 96,
        },
    ];

    return (
        <>
            <PageContainer
                eyebrow="Quản trị"
                title="Danh sách người dùng"
                subtitle={`Quản lý ${total.toLocaleString('vi-VN')} tài khoản học viên, phụ huynh và gia sư.`}
                maxWidth="wide"
                headerAction={
                    <div className="admin-ui-actions">
                        <span className="admin-ui-code-chip">Tổng {total.toLocaleString('vi-VN')}</span>
                        <Can permission="export.data">
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-primary"
                            onClick={() => toast.info('Chức năng xuất CSV sẽ có trong tương lai')}
                        >
                            <span className="material-symbols-outlined">download</span>
                            Xuất CSV
                        </button>
                        </Can>
                    </div>
                }
            >
                <SectionCard
                    title="Người dùng"
                    subtitle="Tìm kiếm theo tên, email, số điện thoại và lọc theo vai trò hoặc trạng thái."
                    footer={`Hiển thị ${users.length} / ${total.toLocaleString('vi-VN')} người dùng`}
                >
                    <div className="admin-ui-toolbar user-mgmt-admin-toolbar">
                        {/* Search — manual trigger via button or Enter key.
                            BE searches Fullname, Email, Phone (not userid),
                            so the placeholder reflects the actual fields. */}
                        <div className="user-mgmt-search-row">
                            <div className="user-mgmt-search-wrapper">
                                <input
                                    className="user-mgmt-search-input"
                                    placeholder="Tìm kiếm tên, email, hoặc số điện thoại..."
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    aria-label="Từ khoá tìm kiếm"
                                />
                                <span className="material-symbols-outlined user-mgmt-search-icon">search</span>
                            </div>
                            <button
                                type="button"
                                className="user-mgmt-search-btn"
                                onClick={commitSearch}
                                disabled={loading}
                                aria-label="Tìm kiếm"
                            >
                                <span className="material-symbols-outlined user-mgmt-search-btn-icon">search</span>
                                <span>Tìm kiếm</span>
                            </button>
                        </div>

                        {/* Filters Group */}
                        <div className="user-mgmt-filters">
                            {/* Role Dropdown — chỉ các role khách hàng nền tảng.
                                Tài khoản nội bộ (Staff/Admin) được BE loại khỏi
                                GET /admin/users; Staff quản lý ở trang riêng
                                "Quản lý nhân viên". */}
                            <div className="user-mgmt-filter-group">
                                <select
                                    className="user-mgmt-filter-btn"
                                    value={roleFilter}
                                    onChange={(e) => {
                                        setRoleFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    aria-label="Lọc theo vai trò"
                                >
                                    <option value="all">Vai trò: Tất cả</option>
                                    <option value="Student">Vai trò: Học viên</option>
                                    <option value="Tutor">Vai trò: Gia sư</option>
                                    <option value="Parent">Vai trò: Phụ huynh</option>
                                </select>
                            </div>

                            {/* Status Dropdown — only Active / Blocked are supported by BE
                                (status is a 0/1 column; "Tạm ngưng" was a no-op filter that
                                returned all users, so it has been removed). */}
                            <div className="user-mgmt-filter-group">
                                <select
                                    className="user-mgmt-filter-btn"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    aria-label="Lọc theo trạng thái"
                                >
                                    <option value="all">Trạng thái: Tất cả</option>
                                    <option value="active">Trạng thái: Hoạt động</option>
                                    <option value="blocked">Trạng thái: Bị chặn</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <DataTable<FlatUserDetail>
                        columns={userColumns}
                        data={users}
                        rowKey="userid"
                        loading={loading}
                        loadingText="Đang tải người dùng..."
                        emptyText="Không tìm thấy người dùng nào"
                        emptyIcon={
                            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>search_off</span>
                        }
                        onRowClick={handleUserClick}
                        pagination={{
                            current: page,
                            pageSize: limit,
                            total,
                            onChange: setPage,
                        }}
                        minWidth={700}
                        variant="embedded"
                    />
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
                onBlockUser={() => setIsBlockModalOpen(true)}
                onUnblockUser={handleUnblockUser}
                onIssueWarning={() => setIsWarningModalOpen(true)}
                onSuspendUser={() => setIsSuspendModalOpen(true)}
                /* onResetPassword intentionally omitted — BE has no admin
                   reset-password endpoint yet, so the button stays hidden. */
            />

            <BlockUserModal
                isOpen={isBlockModalOpen}
                onClose={() => setIsBlockModalOpen(false)}
                user={selectedUser}
                onBlock={handleBlockUser}
            />

            <IssueWarningModal
                isOpen={isWarningModalOpen}
                onClose={() => setIsWarningModalOpen(false)}
                user={selectedUser}
                onIssue={handleIssueWarning}
            />

            <SuspendUserModal
                isOpen={isSuspendModalOpen}
                onClose={() => setIsSuspendModalOpen(false)}
                user={selectedUser}
                onSuspend={handleSuspendUser}
            />
        </>
    );
};

export default UserManagementPage;
