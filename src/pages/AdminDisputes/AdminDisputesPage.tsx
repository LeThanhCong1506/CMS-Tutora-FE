import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DataTable, FilterTabs, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn, StatusVariant } from '../../components/shared';
import { getDisputes, getDisputeStats } from '../../services/admin.service';
import { getDisputeTypeMeta, getPriorityMeta } from './disputeWorkflow';
import type { DisputeForAdmin, DisputeStatsDto, DisputeStatus, DisputeType, ListSortDirection } from '../../types/admin.types';
import { formatRelativeTime } from '../../utils/formatters';
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
    }, [activeTab, disputeTypeFilter, page, searchQuery, sortDirection, updateQuery]);

    const applySearch = () => {
        setSearchQuery(searchInput.trim());
        updateQuery({ page: 1 });
    };

    const clearSearch = () => {
        setSearchInput('');
        setSearchQuery('');
        updateQuery({ page: 1 });
    };

    /** Một nút gom hết: từ khoá, loại phản ánh, thứ tự và cả tab trạng thái. */
    const resetAllFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setDisputeTypeFilter('');
        setSortDirection('desc');
        updateQuery({ status: 'all', page: 1 });
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

    const hasActiveFilters =
        Boolean(searchInput || searchQuery || disputeTypeFilter)
        || activeTab !== 'all'
        || sortDirection !== 'desc';

    const resultSummary = loading
        ? 'Đang tải hồ sơ…'
        : totalCount === 0
          ? 'Không có hồ sơ nào phù hợp'
          : `${totalCount} hồ sơ phù hợp`;

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
            render: (dispute) => {
                const type = getDisputeTypeMeta(dispute.disputeType, dispute.disputeTypeDisplay);
                return (
                    <div className="dispute-issue" title={dispute.reason || undefined}>
                        <span className={`dispute-issue-icon is-${type.tone}`} aria-hidden="true">
                            <span className="material-symbols-outlined">{type.icon}</span>
                        </span>
                        <span className="admin-ui-entity-primary">{type.label}</span>
                    </div>
                );
            },
            width: 172,
        },
        {
            /* Một dòng "người gửi → gia sư". Hai nhãn vai trò cũ ("Người gửi phản ánh" /
               "Gia sư") lặp lại y hệt ở mọi dòng nên không phân biệt được dòng nào với dòng
               nào — mũi tên đã nói đủ chiều, phần còn lại đẩy vào tooltip. */
            key: 'parties',
            title: 'Các bên liên quan',
            render: (dispute) => {
                const from = dispute.createdByName || 'Chưa xác định';
                const to = dispute.tutorName || 'Chưa xác định';
                return (
                    <span className="dispute-parties" title={`Người gửi phản ánh: ${from} → Gia sư: ${to}`}>
                        <span className="dispute-party">{from}</span>
                        <span className="material-symbols-outlined dispute-parties-arrow" aria-hidden="true">
                            arrow_right_alt
                        </span>
                        <span className="dispute-party is-tutor">{to}</span>
                    </span>
                );
            },
            minWidth: 240,
        },
        {
            /* Chỉ còn mã buổi học. Học phí đã bỏ: nó không giúp phân loại hay sắp xếp gì ở
               màn danh sách, mà số tiền chính xác thì trang chi tiết mới là nơi để đọc. */
            key: 'session',
            title: 'Buổi học',
            render: (dispute) => (
                <span className="admin-ui-code-chip">
                    {dispute.classSessionId ? `#${dispute.classSessionId}` : '—'}
                </span>
            ),
            width: 92,
            hideOnTablet: true,
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
                        {/* Không kèm icon: mức "Trung bình" dùng `horizontal_rule`, hiện ra
                            thành một gạch ngang đứng trước chữ và bị đọc nhầm là dấu trừ. */}
                        <StatusBadge variant={priority.variant} shape="tag">
                            {priority.label}
                        </StatusBadge>
                    </span>
                );
            },
            hideOnTablet: true,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (dispute) => <StatusBadge variant={getStatusVariant(dispute.status)}>{getStatusLabel(dispute)}</StatusBadge>,
        },
        {
            key: 'actions',
            title: '',
            render: (dispute) => (
                <div className="admin-ui-row-actions">
                    <button
                        type="button"
                        className="admin-ui-row-btn"
                        aria-label={`Xem chi tiết hồ sơ phản ánh #${dispute.disputeId}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/admin-portal/disputes/${dispute.disputeId}`);
                        }}
                    >
                        <span className="material-symbols-outlined">visibility</span>
                        <span className="admin-ui-row-btn-label">Xem</span>
                    </button>
                </div>
            ),
            width: 84,
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
            <SectionCard className="dispute-list-card">
                <div className="dispute-scope admin-ui-list-scope">
                    <div className="admin-ui-list-tabsbar">
                        {/* Trạng thái và loại phản ánh đều là bộ lọc thu hẹp danh sách, nên đứng
                            chung một cụm; ô tìm kiếm tách xuống hàng riêng bên dưới. */}
                        <div className="dispute-filter-cluster">
                            <FilterTabs
                                tabs={disputeTabs}
                                activeKey={activeTab}
                                onChange={handleStatusChange}
                                ariaLabel="Lọc hồ sơ theo trạng thái"
                            />

                            <div
                                className="admin-ui-list-filters"
                                role="group"
                                aria-label="Bộ lọc hồ sơ"
                            >
                                <label className="admin-ui-list-field">
                                    <span className="admin-ui-visually-hidden">Loại phản ánh</span>
                                    <span className="material-symbols-outlined admin-ui-list-field-icon">
                                        filter_alt
                                    </span>
                                    <select
                                        className="admin-ui-list-select"
                                        value={disputeTypeFilter}
                                        aria-label="Lọc theo loại phản ánh"
                                        onChange={(event) =>
                                            handleDisputeTypeChange(
                                                event.target.value as DisputeType | '',
                                            )
                                        }
                                    >
                                        <option value="">Mọi loại phản ánh</option>
                                        <option value="no_show">Vắng mặt</option>
                                        <option value="quality">Chất lượng</option>
                                        <option value="payment">Thanh toán</option>
                                        <option value="other">Khác</option>
                                    </select>
                                </label>

                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        className="admin-ui-list-reset"
                                        onClick={resetAllFilters}
                                    >
                                        <span className="material-symbols-outlined">restart_alt</span>
                                        Đặt lại
                                    </button>
                                )}
                            </div>
                        </div>

                        <label className="admin-ui-list-field admin-ui-list-field--sort">
                            <span className="admin-ui-visually-hidden">Sắp xếp</span>
                            <span className="material-symbols-outlined admin-ui-list-field-icon">
                                swap_vert
                            </span>
                            <select
                                className="admin-ui-list-select"
                                value={sortDirection}
                                aria-label="Sắp xếp danh sách"
                                onChange={(event) =>
                                    handleSortDirectionChange(event.target.value as ListSortDirection)
                                }
                            >
                                <option value="desc">Mới nhất trước</option>
                                <option value="asc">Cũ nhất trước</option>
                            </select>
                        </label>
                    </div>

                    <div className="admin-ui-list-toolbar">
                        <form
                            className="admin-ui-list-search-form"
                            role="search"
                            aria-label="Tìm hồ sơ phản ánh"
                            onSubmit={(event) => {
                                event.preventDefault();
                                applySearch();
                            }}
                        >
                            <div className="admin-ui-list-search">
                                <label className="admin-ui-visually-hidden" htmlFor="dispute-search">
                                    Mã hồ sơ, người dùng hoặc nội dung
                                </label>
                                <span className="material-symbols-outlined admin-ui-list-search-icon">
                                    search
                                </span>
                                <input
                                    id="dispute-search"
                                    className="admin-ui-list-search-input"
                                    placeholder="Tìm mã hồ sơ, mã buổi học, tên người dùng hoặc nội dung…"
                                    type="search"
                                    autoComplete="off"
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                />
                                {searchInput && (
                                    <button
                                        type="button"
                                        className="admin-ui-list-search-clear"
                                        onClick={clearSearch}
                                        aria-label="Xoá từ khoá"
                                    >
                                        <span className="material-symbols-outlined">close</span>
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="admin-ui-list-btn admin-ui-list-btn-primary"
                                disabled={searchInput.trim() === searchQuery}
                            >
                                <span className="material-symbols-outlined">search</span>
                                Tìm
                            </button>
                        </form>
                    </div>

                    <div className="admin-ui-list-resultbar" role="status" aria-live="polite">
                        <span
                            className={`material-symbols-outlined ${loading ? 'admin-ui-list-spin' : ''}`}
                            aria-hidden="true"
                        >
                            {loading ? 'progress_activity' : 'gavel'}
                        </span>
                        <strong>{resultSummary}</strong>
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
                </div>
            </SectionCard>
        </PageContainer>
    );
};

export default AdminDisputesPage;
