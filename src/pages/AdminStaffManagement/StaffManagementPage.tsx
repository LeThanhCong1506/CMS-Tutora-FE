import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { getStaffs } from '../../services/staff.service';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import type { StaffListItem } from '../../types/staff.types';
import CreateStaffModal from './components/CreateStaffModal';
import { formatDateTime } from '../../utils/formatters';

import '../../styles/pages/admin-user-management.css';
import '../../styles/pages/admin-vetting-modal.css';
import '../../styles/pages/admin-staff.css';

const PAGE_SIZE = 20;

const genderLabel = (gender: number | null): string => {
    switch (gender) {
        case 1: return 'Nam';
        case 2: return 'Nữ';
        case 0: return 'Khác';
        default: return 'N/A';
    }
};

const avatarFor = (staff: StaffListItem): string =>
    staff.avatarurl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.fullname || staff.username)}&background=random`;

const StaffManagementPage = () => {
    const [staffs, setStaffs] = useState<StaffListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const fetchStaffs = useCallback(async () => {
        try {
            setLoading(true);
            const { content, hasMore: more } = await getStaffs(page, PAGE_SIZE);
            setStaffs(content);
            setHasMore(more);
        } catch (err) {
            console.error('Error fetching staffs:', err);
            toast.error('Không thể tải danh sách nhân viên');
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchStaffs();
    }, [fetchStaffs]);

    // BE không trả tổng số (PagedList serialize thành mảng, không có header
    // X-Pagination). Suy ra pseudo-total chỉ để bật/tắt nút prev/next: nếu còn
    // trang sau thì cộng thêm 1 để DataTable hiển thị "Trang tiếp".
    const pseudoTotal = hasMore ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + staffs.length;

    const columns: DataTableColumn<StaffListItem>[] = [
        {
            key: 'identity',
            title: 'Nhân viên',
            render: (staff) => (
                <div className="staff-identity">
                    <img className="staff-avatar" src={avatarFor(staff)} alt={staff.fullname} />
                    <div className="admin-ui-entity">
                        <span className="admin-ui-entity-primary">{staff.fullname || '—'}</span>
                        <span className="admin-ui-entity-secondary">{staff.email}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'username',
            title: 'Tên đăng nhập',
            render: (staff) => <span className="admin-ui-table-meta">{staff.username}</span>,
            hideOnMobile: true,
        },
        {
            key: 'phone',
            title: 'Số điện thoại',
            render: (staff) => <span className="admin-ui-table-meta">{staff.phone || 'N/A'}</span>,
            hideOnMobile: true,
        },
        {
            key: 'gender',
            title: 'Giới tính',
            render: (staff) => <span className="admin-ui-table-meta">{genderLabel(staff.gender)}</span>,
            hideOnMobile: true,
        },
        {
            key: 'joinDate',
            title: 'Ngày tạo',
            render: (staff) => (
                <span className="admin-ui-table-meta">
                    {staff.createdat ? new Date(staff.createdat).toLocaleDateString('vi-VN') : 'N/A'}
                </span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'lastLoginAt',
            title: 'Đăng nhập cuối',
            render: (staff) => (
                <span className="admin-ui-table-meta">
                    {staff.lastLoginAt ? formatDateTime(staff.lastLoginAt) : 'Chưa đăng nhập'}
                </span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (staff) => (
                <StatusBadge variant={staff.status === 1 ? 'success' : 'error'}>
                    {staff.status === 1 ? 'Hoạt động' : 'Vô hiệu hóa'}
                </StatusBadge>
            ),
        },
    ];

    return (
        <>
            <PageContainer
                eyebrow="Quản trị"
                title="Quản lý nhân viên"
                subtitle="Tạo và quản lý tài khoản nhân viên vận hành nền tảng."
                maxWidth="wide"
                headerAction={
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-primary"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <span className="material-symbols-outlined">person_add</span>
                        Tạo tài khoản nhân viên
                    </button>
                }
            >
                <SectionCard
                    title="Danh sách nhân viên"
                    subtitle="Các tài khoản có vai trò Nhân viên (Staff) trong hệ thống."
                    footer={`Hiển thị ${staffs.length} nhân viên`}
                >
                    <DataTable<StaffListItem>
                        columns={columns}
                        data={staffs}
                        rowKey="userid"
                        loading={loading}
                        loadingText="Đang tải nhân viên..."
                        emptyText="Chưa có nhân viên nào. Nhấn “Tạo tài khoản nhân viên” để bắt đầu."
                        emptyIcon={
                            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>badge</span>
                        }
                        pagination={{
                            current: page,
                            pageSize: PAGE_SIZE,
                            total: pseudoTotal,
                            onChange: setPage,
                        }}
                        minWidth={760}
                        variant="embedded"
                    />
                </SectionCard>
            </PageContainer>

            <CreateStaffModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={() => {
                    // Sau khi tạo, quay về trang đầu để thấy nhân viên mới nhất
                    // (BE sắp xếp createdat_desc mặc định). Nếu đã ở trang 1 thì
                    // refetch trực tiếp.
                    if (page !== 1) setPage(1);
                    else void fetchStaffs();
                }}
            />
        </>
    );
};

export default StaffManagementPage;
