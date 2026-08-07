import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, FilterTabs, PageContainer, SectionCard, StatCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn, StatusVariant } from '../../components/shared';
import { getDisputes, getDisputeStats } from '../../services/admin.service';
import type { DisputeForAdmin, DisputeStatsDto, ListSortDirection } from '../../types/admin.types';
import { formatCurrency, formatRelativeTime, formatDisputeType } from '../../utils/formatters';
import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import { parseIdFilter } from '../../utils/idFilter';

type DisputeTab = 'all' | 'pending' | 'investigating' | 'resolved';

const PAGE_SIZE = ADMIN_PAGE_SIZE;

const getStatusVariant = (status?: string | null): StatusVariant => {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'investigating':
            return 'info';
        case 'confirmed_no_show':
        case 'resolved':
            return 'success';
        case 'closed':
            return 'neutral';
        default:
            return 'dark';
    }
};

const getStatusLabel = (dispute: DisputeForAdmin) => {
    switch (dispute.status) {
        case 'pending':
            return 'Chờ tiếp nhận';
        case 'investigating':
            return 'Đang xem xét';
        case 'confirmed_no_show':
            return 'Đã ghi nhận vắng mặt';
        case 'resolved':
            return 'Đã hoàn tất';
        case 'closed':
            return 'Đã đóng';
        default:
            return dispute.statusDisplay || dispute.status || 'N/A';
    }
};

const getPriorityVariant = (priority?: string | null): StatusVariant => {
    switch (priority) {
        case 'high':
            return 'error';
        case 'medium':
            return 'warning';
        case 'low':
            return 'success';
        default:
            return 'neutral';
    }
};

const AdminDisputesPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<DisputeTab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [disputes, setDisputes] = useState<DisputeForAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DisputeStatsDto | null>(null);

    // Ô nhập id buổi học và giá trị đã áp dụng tách riêng: lọc ở server nên chỉ
    // gọi lại API khi admin bấm áp dụng, không phải mỗi lần gõ một chữ số.
    const [classSessionInput, setClassSessionInput] = useState('');
    const [classSessionFilter, setClassSessionFilter] = useState<number | undefined>(undefined);
    const [sortDirection, setSortDirection] = useState<ListSortDirection>('desc');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchDisputes = useCallback(async () => {
        try {
            setLoading(true);
            const statusFilter = activeTab === 'all' ? undefined : activeTab;
            // Phân trang phía server: endpoint trả kèm totalCount nên đếm được tổng thật.
            // Trước đây trang này cố định page 1 / size 20 mà không render thanh phân trang,
            // nên hồ sơ thứ 21 trở đi không có cách nào xem được.
            const { items, totalCount } = await getDisputes({
                status: statusFilter,
                classSessionId: classSessionFilter,
                sortDirection,
                page,
                pageSize: PAGE_SIZE,
            });
            setDisputes(items);
            setTotal(totalCount);
        } catch (err) {
            console.error('Error fetching disputes:', err);
            setDisputes([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [activeTab, classSessionFilter, sortDirection, page]);

    const applyClassSessionFilter = () => {
        setClassSessionFilter(parseIdFilter(classSessionInput));
    };

    const clearClassSessionFilter = () => {
        setClassSessionInput('');
        setClassSessionFilter(undefined);
    };

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
            { key: 'all', label: 'Tất cả' },
            { key: 'pending', label: `Chờ tiếp nhận (${stats?.totalPending ?? 0})` },
            { key: 'investigating', label: `Đang xem xét (${stats?.totalInvestigating ?? 0})` },
            { key: 'resolved', label: 'Đã hoàn tất' },
        ],
        [stats],
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

    // Đổi bộ lọc thì về trang 1, nếu không sẽ đứng ở trang không còn tồn tại.
    useEffect(() => {
        setPage(1);
    }, [activeTab, classSessionFilter, sortDirection]);

    const disputeColumns: DataTableColumn<DisputeForAdmin>[] = [
        {
            key: 'case',
            title: 'Hồ sơ',
            render: (dispute) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-code-chip">#{dispute.disputeId}</span>
                    <span className="admin-ui-entity-secondary">
                        {dispute.createdAt ? formatRelativeTime(dispute.createdAt) : 'Chưa có thời gian'}
                    </span>
                </div>
            ),
            width: 118,
        },
        {
            key: 'issue',
            title: 'Nội dung phản ánh',
            render: (dispute) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">
                        {dispute.disputeTypeDisplay || formatDisputeType(dispute.disputeType || '')}
                    </span>
                    <span className="admin-ui-entity-secondary dispute-list-reason">
                        {dispute.reason || 'Không có mô tả bổ sung'}
                    </span>
                </div>
            ),
            minWidth: 250,
        },
        {
            key: 'parties',
            title: 'Các bên liên quan',
            render: (dispute) => (
                <div className="dispute-list-parties">
                    <div className="admin-ui-entity">
                        <span className="admin-ui-entity-primary">{dispute.createdByName || 'Chưa xác định'}</span>
                        <span className="admin-ui-entity-secondary">Người gửi phản ánh</span>
                    </div>
                    <span className="material-symbols-outlined dispute-list-arrow" aria-hidden="true">
                        arrow_forward
                    </span>
                    <div className="admin-ui-entity">
                        <span className="admin-ui-entity-primary">{dispute.tutorName || 'Chưa xác định'}</span>
                        <span className="admin-ui-entity-secondary">Gia sư</span>
                    </div>
                </div>
            ),
            minWidth: 260,
        },
        {
            key: 'amount',
            title: 'Buổi học',
            render: (dispute) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-amount">{formatCurrency(dispute.classSessionPrice || 0)}</span>
                    <span className="admin-ui-entity-secondary">
                        #{dispute.classSessionId || 'N/A'}
                    </span>
                </div>
            ),
            hideOnTablet: true,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (dispute) => (
                <StatusBadge variant={getStatusVariant(dispute.status)}>
                    {getStatusLabel(dispute)}
                </StatusBadge>
            ),
        },
        {
            key: 'priority',
            title: 'Ưu tiên',
            render: (dispute) => (
                <span title={dispute.priorityReason || undefined}>
                    <StatusBadge variant={getPriorityVariant(dispute.priority)} shape="tag">
                        {dispute.priorityDisplay || 'Chưa có'}
                    </StatusBadge>
                </span>
            ),
            hideOnTablet: true,
        },
    ];

    return (
        <PageContainer
            eyebrow="Vận hành"
            title="Phản ánh buổi học"
            maxWidth="wide"
            headerAction={
                <button
                    type="button"
                    className="admin-ui-button admin-ui-button-secondary"
                    onClick={() => {
                        void fetchStats();
                        void fetchDisputes();
                    }}
                    disabled={loading}
                >
                    <span className="material-symbols-outlined">refresh</span>
                    {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
            }
        >
            <div className="admin-ui-kpi-grid dispute-kpi-grid">
                <StatCard
                    icon={<span className="material-symbols-outlined">folder_open</span>}
                    value={stats?.totalPending ?? '...'}
                    label="Chờ tiếp nhận"
                    badge={totalActive > 0 ? `${totalActive} đang mở` : undefined}
                    badgeVariant="orange"
                    onClick={() => setActiveTab('pending')}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">search</span>}
                    value={stats?.totalInvestigating ?? '...'}
                    label="Đang xem xét"
                    badgeVariant="blue"
                    onClick={() => setActiveTab('investigating')}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">check_circle</span>}
                    value={stats?.resolvedThisMonth ?? '...'}
                    label="Đã hoàn tất tháng này"
                    badge={stats ? `Hoàn ${formatCurrency(stats.totalRefundedThisMonth)}` : undefined}
                    badgeVariant="green"
                    onClick={() => setActiveTab('resolved')}
                />
            </div>

            <SectionCard
                title="Danh sách hồ sơ"
                headerAction={
                    <FilterTabs
                        tabs={disputeTabs}
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as DisputeTab)}
                    />
                }
                footer={
                    classSessionFilter !== undefined
                        ? `Hiển thị ${filteredDisputes.length} hồ sơ về buổi học #${classSessionFilter}`
                        : `Hiển thị ${filteredDisputes.length} hồ sơ`
                }
            >
                <div className="admin-ui-toolbar">
                    <div className="admin-ui-search">
                        <span className="material-symbols-outlined admin-ui-search-icon">search</span>
                        <input
                            className="admin-ui-search-input"
                            aria-label="Tìm kiếm phản ánh"
                            placeholder="Tìm mã hồ sơ, người dùng hoặc nội dung..."
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

                    <div className="dispute-list-filter">
                        <label className="dispute-list-filter__label" htmlFor="dispute-class-session-filter">
                            ID buổi học
                        </label>
                        <input
                            id="dispute-class-session-filter"
                            className="dispute-list-filter__input"
                            type="number"
                            min={1}
                            inputMode="numeric"
                            placeholder="VD: 12345"
                            value={classSessionInput}
                            onChange={(event) => setClassSessionInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') applyClassSessionFilter();
                            }}
                        />
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-secondary"
                            onClick={applyClassSessionFilter}
                        >
                            Áp dụng
                        </button>
                        {classSessionFilter !== undefined && (
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary"
                                onClick={clearClassSessionFilter}
                            >
                                Bỏ lọc
                            </button>
                        )}
                    </div>

                    <div className="dispute-list-filter">
                        <label className="dispute-list-filter__label" htmlFor="dispute-sort-direction">
                            Sắp xếp
                        </label>
                        <select
                            id="dispute-sort-direction"
                            className="dispute-list-filter__select"
                            value={sortDirection}
                            onChange={(event) => setSortDirection(event.target.value as ListSortDirection)}
                        >
                            <option value="desc">Mới nhất trước</option>
                            <option value="asc">Cũ nhất trước</option>
                        </select>
                    </div>
                </div>

                <DataTable
                    columns={disputeColumns}
                    data={filteredDisputes}
                    rowKey="disputeId"
                    onRowClick={(dispute) => navigate(`/admin-portal/disputes/${dispute.disputeId}`)}
                    rowAriaLabel={(dispute) => `Mở hồ sơ phản ánh ${dispute.disputeId}`}
                    tableLabel="Danh sách hồ sơ phản ánh"
                    loading={loading}
                    loadingText="Đang tải danh sách phản ánh..."
                    emptyText={
                        classSessionFilter !== undefined
                            ? `Không có phản ánh nào về buổi học #${classSessionFilter}`
                            : searchQuery
                              ? 'Không tìm thấy phản ánh phù hợp'
                              : 'Chưa có phản ánh nào'
                    }
                    emptyIcon={
                        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>
                            forum
                        </span>
                    }
                    pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage }}
                    minWidth={860}
                    variant="embedded"
                    density="compact"
                    adaptive
                />
            </SectionCard>
        </PageContainer>
    );
};

export default AdminDisputesPage;
