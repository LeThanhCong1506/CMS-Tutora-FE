import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, FilterTabs, PageContainer, SectionCard, StatCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn, StatusVariant } from '../../components/shared';
import { getDisputes, getDisputeStats } from '../../services/admin.service';
import type { DisputeForAdmin, DisputeStatsDto } from '../../types/admin.types';
import { formatCurrency, formatRelativeTime, formatDisputeType } from '../../utils/formatters';

type DisputeTab = 'all' | 'pending' | 'investigating' | 'resolved';

const getStatusVariant = (status?: string | null): StatusVariant => {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'investigating':
            return 'info';
        case 'resolved':
            return 'success';
        case 'closed':
            return 'neutral';
        default:
            return 'dark';
    }
};

const AdminDisputesPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<DisputeTab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [disputes, setDisputes] = useState<DisputeForAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DisputeStatsDto | null>(null);

    const fetchDisputes = useCallback(async () => {
        try {
            setLoading(true);
            const statusFilter = activeTab === 'all' ? undefined : activeTab;
            const data = await getDisputes({
                status: statusFilter,
                page: 1,
                pageSize: 20,
            });
            setDisputes(data);
        } catch (err) {
            console.error('Error fetching disputes:', err);
            setDisputes([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getDisputeStats();
            setStats(data);
        } catch (err) {
            console.error('Error fetching dispute stats:', err);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchDisputes();
    }, [fetchDisputes]);

    const totalActive = stats ? stats.totalPending + stats.totalInvestigating : 0;

    const disputeTabs = useMemo(
        () => [
            { key: 'all', label: `Tất cả (${totalActive})` },
            { key: 'pending', label: `Chờ xử lý (${stats?.totalPending ?? 0})` },
            { key: 'investigating', label: `Đang điều tra (${stats?.totalInvestigating ?? 0})` },
            { key: 'resolved', label: `Đã giải quyết (${stats?.resolvedThisMonth ?? 0})` },
        ],
        [stats, totalActive],
    );

    const filteredDisputes = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return disputes;

        return disputes.filter((dispute) => {
            const searchableText = [
                dispute.disputeId,
                dispute.createdByName,
                dispute.tutorName,
                dispute.reason,
                dispute.disputeTypeDisplay,
                dispute.statusDisplay,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchableText.includes(query);
        });
    }, [disputes, searchQuery]);

    const disputeColumns: DataTableColumn<DisputeForAdmin>[] = [
        {
            key: 'id',
            title: 'Mã',
            render: (dispute) => <span className="admin-ui-code-chip">#{dispute.disputeId}</span>,
            width: 96,
        },
        {
            key: 'createdBy',
            title: 'Người khiếu nại',
            render: (dispute) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{dispute.createdByName || 'N/A'}</span>
                    <span className="admin-ui-entity-secondary">Booking #{dispute.bookingId || 'N/A'}</span>
                </div>
            ),
            minWidth: 180,
        },
        {
            key: 'tutor',
            title: 'Gia sư',
            render: (dispute) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{dispute.tutorName || 'N/A'}</span>
                    <span className="admin-ui-entity-secondary">Buổi học #{dispute.lessonId || 'N/A'}</span>
                </div>
            ),
            minWidth: 180,
        },
        {
            key: 'type',
            title: 'Loại',
            render: (dispute) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">
                        {dispute.disputeTypeDisplay || formatDisputeType(dispute.disputeType || '')}
                    </span>
                    {dispute.reason && <span className="admin-ui-entity-secondary">{dispute.reason}</span>}
                </div>
            ),
            minWidth: 220,
        },
        {
            key: 'amount',
            title: 'Số tiền',
            render: (dispute) => <span className="admin-ui-amount">{formatCurrency(dispute.lessonPrice || 0)}</span>,
            hideOnMobile: true,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (dispute) => (
                <StatusBadge variant={getStatusVariant(dispute.status)}>
                    {dispute.statusDisplay || dispute.status || 'N/A'}
                </StatusBadge>
            ),
        },
        {
            key: 'createdAt',
            title: 'Thời gian',
            render: (dispute) => (
                <span className="admin-ui-table-meta">
                    {dispute.createdAt ? formatRelativeTime(dispute.createdAt) : 'N/A'}
                </span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'actions',
            title: 'Hành động',
            align: 'right',
            render: (dispute) => (
                <button
                    type="button"
                    className="admin-ui-button admin-ui-button-primary"
                    onClick={() => navigate(`/admin-portal/disputes/${dispute.disputeId}`)}
                >
                    Xem chi tiết
                </button>
            ),
            width: 140,
        },
    ];

    return (
        <PageContainer
            eyebrow="Vận hành"
            title="Trung tâm Giải quyết Khiếu nại"
            subtitle="Quản lý, phân loại và giải quyết xung đột giữa học viên và gia sư một cách minh bạch."
            maxWidth="wide"
            headerAction={
                <div className="admin-ui-actions">
                    <button className="admin-ui-button admin-ui-button-secondary" onClick={() => void fetchDisputes()}>
                        <span className="material-symbols-outlined">refresh</span>
                        Làm mới
                    </button>
                    <button className="admin-ui-button admin-ui-button-primary">
                        <span className="material-symbols-outlined">file_download</span>
                        Xuất báo cáo
                    </button>
                </div>
            }
        >
            <div className="admin-ui-kpi-grid">
                <StatCard
                    icon={<span className="material-symbols-outlined">folder_open</span>}
                    value={stats?.totalPending ?? '...'}
                    label="Chờ xử lý"
                    subLabel="Cần xem xét và phân loại"
                    badge={totalActive > 0 ? `${totalActive} đang mở` : undefined}
                    badgeVariant="orange"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">search</span>}
                    value={stats?.totalInvestigating ?? '...'}
                    label="Đang điều tra"
                    subLabel="Đang thu thập bằng chứng"
                    badgeVariant="blue"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">check_circle</span>}
                    value={stats?.resolvedThisMonth ?? '...'}
                    label="Đã giải quyết tháng này"
                    subLabel={stats ? `Hoàn tiền: ${formatCurrency(stats.totalRefundedThisMonth)}` : 'Đang tải dữ liệu'}
                    badgeVariant="green"
                />
            </div>

            <SectionCard
                title="Danh sách khiếu nại"
                subtitle="Lọc theo trạng thái, tìm nhanh theo mã hồ sơ, tên người dùng hoặc nội dung khiếu nại."
                headerAction={
                    <FilterTabs
                        tabs={disputeTabs}
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as DisputeTab)}
                    />
                }
                footer={`Hiển thị ${filteredDisputes.length} hồ sơ`}
            >
                <div className="admin-ui-toolbar">
                    <div className="admin-ui-search">
                        <span className="material-symbols-outlined admin-ui-search-icon">search</span>
                        <input
                            className="admin-ui-search-input"
                            placeholder="Tìm theo mã hồ sơ, tên hoặc nội dung..."
                            type="search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>
                    {searchQuery && (
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-secondary"
                            onClick={() => setSearchQuery('')}
                        >
                            Xóa tìm kiếm
                        </button>
                    )}
                </div>

                <DataTable
                    columns={disputeColumns}
                    data={filteredDisputes}
                    rowKey="disputeId"
                    loading={loading}
                    loadingText="Đang tải danh sách khiếu nại..."
                    emptyText={searchQuery ? 'Không tìm thấy khiếu nại phù hợp' : 'Không có khiếu nại nào'}
                    emptyIcon={
                        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>
                            gavel
                        </span>
                    }
                    minWidth={1080}
                    variant="embedded"
                />
            </SectionCard>
        </PageContainer>
    );
};

export default AdminDisputesPage;
