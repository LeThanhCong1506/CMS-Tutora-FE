import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, FilterTabs, PageContainer, SectionCard, StatCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn, StatusVariant } from '../../components/shared';
import { getDisputes, getDisputeStats } from '../../services/admin.service';
import { getPriorityMeta } from './disputeWorkflow';
import type { DisputeForAdmin, DisputeStatsDto, DisputeStatus, DisputeType, ListSortDirection } from '../../types/admin.types';
import { formatCurrency, formatRelativeTime, formatDisputeType } from '../../utils/formatters';
import { parseIdFilter } from '../../utils/idFilter';
import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';

type DisputeTab = 'all' | DisputeStatus;

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

const AdminDisputesPage = () => {
    const navigate = useNavigate();
    // Tab + trang sống trong URL (không phải useState cục bộ) — để "Xem chi tiết" rồi bấm back
    // trả về đúng tab/trang đang xem, thay vì luôn reset về "Tất cả"/trang 1.
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('status') || 'all') as DisputeTab;
    const page = Number(searchParams.get('page')) || 1;
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [disputes, setDisputes] = useState<DisputeForAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState<DisputeStatsDto | null>(null);

    // Ô nhập id buổi học và giá trị đã áp dụng tách riêng: lọc ở server nên chỉ
    // gọi lại API khi admin bấm áp dụng, không phải mỗi lần gõ một chữ số.
    const [classSessionInput, setClassSessionInput] = useState('');
    const [classSessionFilter, setClassSessionFilter] = useState<number | undefined>(undefined);
    const [disputeTypeFilter, setDisputeTypeFilter] = useState<DisputeType | ''>('');
    const [sortDirection, setSortDirection] = useState<ListSortDirection>('desc');
    const latestRequest = useRef(0);
    const skipNextPageFetch = useRef(false);

    // Cập nhật status/page trong URL, giữ nguyên các tham số khác đang có.
    const updateQuery = useCallback(
        (patch: { status?: string; page?: number }) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                if (patch.status !== undefined) {
                    if (patch.status && patch.status !== 'all') next.set('status', patch.status);
                    else next.delete('status');
                }
                if (patch.page !== undefined) {
                    if (patch.page > 1) next.set('page', String(patch.page));
                    else next.delete('page');
                }
                return next;
            });
        },
        [setSearchParams],
    );

    const fetchDisputes = useCallback(async () => {
        const requestId = ++latestRequest.current;

        try {
            setLoading(true);
            setLoadError(null);
            const statusFilter = activeTab === 'all' ? undefined : activeTab;
            const data = await getDisputes({
                status: statusFilter,
                disputeType: disputeTypeFilter || undefined,
                search: searchQuery || undefined,
                classSessionId: classSessionFilter,
                sortDirection,
                page,
                pageSize: PAGE_SIZE,
            });

            if (requestId !== latestRequest.current) return;

            setDisputes(data.items);
            setTotalCount(data.totalCount);
            if (data.page !== page) {
                // BE đã trả đúng dữ liệu của trang được clamp, nên chỉ đồng bộ điều khiển phân trang
                // và bỏ qua lần fetch kế tiếp do chính updateQuery này tạo ra.
                skipNextPageFetch.current = true;
                updateQuery({ page: data.page });
            }
        } catch (err) {
            if (requestId !== latestRequest.current) return;
            console.error('Error fetching disputes:', err);
            setDisputes([]);
            setTotalCount(0);
            setLoadError(apiErrorMessage(err, 'Không thể tải danh sách phản ánh. Vui lòng kiểm tra kết nối và thử lại.'));
        } finally {
            if (requestId === latestRequest.current) setLoading(false);
        }
    }, [activeTab, classSessionFilter, disputeTypeFilter, page, searchQuery, sortDirection, updateQuery]);

    const applySearch = () => {
        setSearchQuery(searchInput.trim());
        updateQuery({ page: 1 });
    };

    const clearSearch = () => {
        setSearchInput('');
        setSearchQuery('');
        updateQuery({ page: 1 });
    };

    const applyClassSessionFilter = () => {
        setClassSessionFilter(parseIdFilter(classSessionInput));
        updateQuery({ page: 1 });
    };

    const clearClassSessionFilter = () => {
        setClassSessionInput('');
        setClassSessionFilter(undefined);
        updateQuery({ page: 1 });
    };

    const handleStatusChange = (key: string) => {
        updateQuery({ status: key, page: 1 });
    };

    const handlePageChange = (newPage: number) => {
        updateQuery({ page: newPage });
    };

    const handleDisputeTypeChange = (value: DisputeType | '') => {
        setDisputeTypeFilter(value);
        updateQuery({ page: 1 });
    };

    const handleSortDirectionChange = (value: ListSortDirection) => {
        setSortDirection(value);
        updateQuery({ page: 1 });
    };

    const fetchStats = useCallback(async () => {
        try {
            const data = await getDisputeStats();
            setStats(data);
        } catch (err) {
            console.error('Error fetching dispute stats:', err);
            toast.error(apiErrorMessage(err, 'Không tải được số liệu tổng hợp phản ánh.'));
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (skipNextPageFetch.current) {
            skipNextPageFetch.current = false;
            return undefined;
        }

        void fetchDisputes();
        return () => {
            latestRequest.current += 1;
        };
    }, [fetchDisputes]);

    const totalActive = stats ? stats.totalPending + stats.totalInvestigating : 0;

    const disputeTabs = useMemo(
        () => [
            { key: 'all', label: 'Tất cả' },
            { key: 'pending', label: `Chờ tiếp nhận (${stats?.totalPending ?? 0})` },
            { key: 'investigating', label: `Đang xem xét (${stats?.totalInvestigating ?? 0})` },
            { key: 'confirmed_no_show', label: 'Đã ghi nhận vắng mặt' },
            { key: 'resolved', label: 'Đã hoàn tất' },
            { key: 'closed', label: 'Đã đóng' },
        ],
        [stats],
    );

    const disputeColumns: DataTableColumn<DisputeForAdmin>[] = [
        {
            key: 'case',
            title: 'Hồ sơ',
            render: (dispute) => (
                <button
                    type="button"
                    className="admin-ui-entity dispute-list-case-link"
                    aria-label={`Mở hồ sơ phản ánh ${dispute.disputeId}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/admin-portal/disputes/${dispute.disputeId}`);
                    }}
                >
                    <span className="admin-ui-code-chip">#{dispute.disputeId}</span>
                    <span className="admin-ui-entity-secondary">
                        {dispute.createdAt ? formatRelativeTime(dispute.createdAt) : 'Chưa có thời gian'}
                    </span>
                </button>
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
                    <span className="admin-ui-entity-secondary dispute-list-reason">{dispute.reason || 'Không có mô tả bổ sung'}</span>
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
                    <span className="admin-ui-entity-secondary">#{dispute.classSessionId || 'N/A'}</span>
                </div>
            ),
            hideOnTablet: true,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (dispute) => <StatusBadge variant={getStatusVariant(dispute.status)}>{getStatusLabel(dispute)}</StatusBadge>,
        },
        {
            key: 'priority',
            title: 'Ưu tiên',
            render: (dispute) => {
                const priority = getPriorityMeta(dispute.priority, dispute.priorityDisplay);
                return (
                    <span
                        className="dispute-list-priority"
                        title={dispute.priorityReason || undefined}
                        tabIndex={dispute.priorityReason ? 0 : undefined}
                        aria-label={
                            dispute.priorityReason
                                ? `${priority.label}. Lý do: ${dispute.priorityReason}`
                                : undefined
                        }
                    >
                        <StatusBadge variant={priority.variant} shape="tag">
                            <span className="material-symbols-outlined" aria-hidden="true">{priority.icon}</span>
                            {priority.label}
                        </StatusBadge>
                    </span>
                );
            },
            hideOnTablet: true,
        },
    ];

    return (
        <PageContainer
            eyebrow="Tranh chấp"
            eyebrowInfo="Theo dõi, điều tra và xử lý các khiếu nại phát sinh từ buổi học."
            title="Khiếu nại"
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
                    onClick={() => handleStatusChange('pending')}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">search</span>}
                    value={stats?.totalInvestigating ?? '...'}
                    label="Đang xem xét"
                    badgeVariant="blue"
                    onClick={() => handleStatusChange('investigating')}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">check_circle</span>}
                    value={stats?.resolvedThisMonth ?? '...'}
                    label="Đã hoàn tất tháng này"
                    badge={stats ? `Hoàn ${formatCurrency(stats.totalRefundedThisMonth)}` : undefined}
                    badgeVariant="green"
                    onClick={() => handleStatusChange('resolved')}
                />
            </div>

            <SectionCard
                footer={
                    classSessionFilter !== undefined
                        ? `Hiển thị ${disputes.length} / ${totalCount} hồ sơ về buổi học #${classSessionFilter}`
                        : `Hiển thị ${disputes.length} / ${totalCount} hồ sơ`
                }
            >
                <div className="admin-ui-toolbar dispute-list-tabs-toolbar">
                    <FilterTabs
                        tabs={disputeTabs}
                        activeKey={activeTab}
                        onChange={handleStatusChange}
                        ariaLabel="Lọc hồ sơ theo trạng thái"
                    />
                </div>
                <div className="admin-ui-toolbar dispute-list-toolbar">
                    <form
                        className="dispute-list-search-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            applySearch();
                        }}
                    >
                        <div className="admin-ui-search">
                            <span className="material-symbols-outlined admin-ui-search-icon">search</span>
                            <input
                                className="admin-ui-search-input"
                                aria-label="Tìm kiếm phản ánh"
                                placeholder="Tìm mã hồ sơ, người dùng hoặc nội dung..."
                                type="search"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                            />
                        </div>
                        <button type="submit" className="admin-ui-button admin-ui-button-secondary">
                            Tìm kiếm
                        </button>
                        {(searchInput || searchQuery) && (
                            <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={clearSearch}>
                                Xóa
                            </button>
                        )}
                    </form>

                    <div className="dispute-list-filter dispute-list-filter--select">
                        <label className="dispute-list-filter__label" htmlFor="dispute-type-filter">
                            Loại phản ánh
                        </label>
                        <select
                            id="dispute-type-filter"
                            className="dispute-list-filter__select"
                            value={disputeTypeFilter}
                            onChange={(event) => handleDisputeTypeChange(event.target.value as DisputeType | '')}
                        >
                            <option value="">Tất cả loại</option>
                            <option value="no_show">Vắng mặt</option>
                            <option value="quality">Chất lượng</option>
                            <option value="payment">Thanh toán</option>
                            <option value="other">Khác</option>
                        </select>
                    </div>

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
                        <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={applyClassSessionFilter}>
                            Áp dụng
                        </button>
                        {classSessionFilter !== undefined && (
                            <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={clearClassSessionFilter}>
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
                            onChange={(event) => handleSortDirectionChange(event.target.value as ListSortDirection)}
                        >
                            <option value="desc">Mới nhất trước</option>
                            <option value="asc">Cũ nhất trước</option>
                        </select>
                    </div>
                </div>

                {loadError && (
                    <div className="dispute-list-load-error" role="alert">
                        <span className="material-symbols-outlined" aria-hidden="true">
                            error
                        </span>
                        <span>{loadError}</span>
                        <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={() => void fetchDisputes()}>
                            Thử lại
                        </button>
                    </div>
                )}

                <DataTable<DisputeForAdmin>
                    columns={disputeColumns}
                    data={disputes}
                    rowKey="disputeId"
                    onRowClick={(dispute) => navigate(`/admin-portal/disputes/${dispute.disputeId}`)}
                    focusableRows={false}
                    tableLabel="Danh sách hồ sơ phản ánh"
                    loading={loading}
                    loadingText="Đang tải danh sách phản ánh..."
                    pagination={{
                        current: page,
                        pageSize: PAGE_SIZE,
                        total: totalCount,
                        onChange: handlePageChange,
                    }}
                    emptyText={
                        loadError
                            ? 'Danh sách chưa tải được'
                            : classSessionFilter !== undefined
                              ? `Không có phản ánh nào về buổi học #${classSessionFilter}`
                              : searchQuery || disputeTypeFilter || activeTab !== 'all'
                                ? 'Không tìm thấy phản ánh phù hợp'
                                : 'Chưa có phản ánh nào'
                    }
                    emptyIcon={
                        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>
                            forum
                        </span>
                    }
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
