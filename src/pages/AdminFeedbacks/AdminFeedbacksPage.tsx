import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
    getFeedbacksForAdmin,
    toggleFeedbackVisibility,
    type AdminFeedbackItem,
    type AdminFeedbackStats,
} from '../../services/adminFeedback.service';
import { DataTable, FilterTabs, PageContainer, SectionCard, StatCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import { Can } from '../../contexts/AccessContext';
import HideFeedbackModal from './HideFeedbackModal';
import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import '../../styles/pages/admin-feedbacks.css';

const PAGE_SIZE = ADMIN_PAGE_SIZE;

type VisibilityTab = 'all' | 'visible' | 'hidden';

const tabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'visible', label: 'Đang hiển thị' },
    { key: 'hidden', label: 'Đã ẩn' },
];

const VISIBILITY_FILTER: Record<VisibilityTab, boolean | undefined> = {
    all: undefined,
    visible: true,
    hidden: false,
};

const EMPTY_STATS: AdminFeedbackStats = {
    totalCount: 0,
    visibleCount: 0,
    hiddenCount: 0,
    averageRating: 0,
};

const formatDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? '—'
        : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
    <span className="feedback-stars" aria-label={`${rating} trên 5 sao`}>
        {'★'.repeat(rating)}
        <span className="feedback-stars__dim">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
);

const AdminFeedbacksPage: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<AdminFeedbackItem[]>([]);
    const [stats, setStats] = useState<AdminFeedbackStats>(EMPTY_STATS);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<VisibilityTab>('all');
    const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [hideTarget, setHideTarget] = useState<AdminFeedbackItem | null>(null);

    const fetchFeedbacks = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getFeedbacksForAdmin({
                rating: ratingFilter,
                isVisible: VISIBILITY_FILTER[activeTab],
                page: currentPage,
                pageSize: PAGE_SIZE,
            });
            setFeedbacks(result.items);
            setTotalCount(result.totalCount);
            setStats(result.stats);
        } catch {
            toast.error('Không thể tải danh sách đánh giá.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, currentPage, ratingFilter]);

    useEffect(() => {
        void fetchFeedbacks();
    }, [fetchFeedbacks]);

    const handleTabChange = (key: string) => {
        setCurrentPage(1);
        setActiveTab(key as VisibilityTab);
    };

    const handleRatingChange = (value: string) => {
        setCurrentPage(1);
        setRatingFilter(value ? Number(value) : undefined);
    };

    /** Ẩn cần lý do nên đi qua modal; hiện lại thì làm ngay. */
    const handleToggleVisibility = useCallback(async (feedback: AdminFeedbackItem) => {
        if (feedback.isVisible) {
            setHideTarget(feedback);
            return;
        }

        try {
            setTogglingId(feedback.feedbackId);
            await toggleFeedbackVisibility(feedback.feedbackId);
            toast.success('Đã hiện lại đánh giá. Điểm gia sư được tính lại và hai bên đã được thông báo.');
            await fetchFeedbacks();
        } catch {
            toast.error('Không thể hiện lại đánh giá.');
        } finally {
            setTogglingId(null);
        }
    }, [fetchFeedbacks]);

    const handleConfirmHide = useCallback(async (feedbackId: number, reason: string) => {
        await toggleFeedbackVisibility(feedbackId, reason);
        toast.success('Đã ẩn đánh giá. Người viết và gia sư đã nhận được thông báo.');
        await fetchFeedbacks();
    }, [fetchFeedbacks]);

    const columns = useMemo<DataTableColumn<AdminFeedbackItem>[]>(() => [
        {
            key: 'tutor',
            title: 'Gia sư',
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{record.tutorName || '—'}</span>
                    {record.subjectName && (
                        <span className="admin-ui-entity-secondary">{record.subjectName}</span>
                    )}
                </div>
            ),
            minWidth: 180,
        },
        {
            key: 'reviewer',
            title: 'Người đánh giá',
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{record.parentName || '—'}</span>
                    {record.bookingId && (
                        <span className="admin-ui-entity-secondary">Booking #{record.bookingId}</span>
                    )}
                </div>
            ),
            hideOnMobile: true,
            minWidth: 170,
        },
        {
            key: 'rating',
            title: 'Sao',
            render: (record) => <Stars rating={record.rating} />,
            minWidth: 110,
        },
        {
            key: 'comment',
            title: 'Nhận xét',
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary feedback-comment">
                        {record.comment || '(không có nhận xét)'}
                    </span>
                    {record.reply && (
                        <span className="admin-ui-entity-secondary">Gia sư đã phản hồi</span>
                    )}
                </div>
            ),
            minWidth: 300,
        },
        {
            key: 'createdAt',
            title: 'Ngày gửi',
            render: (record) => <span className="admin-ui-table-meta">{formatDate(record.createdAt)}</span>,
            hideOnMobile: true,
            minWidth: 130,
        },
        {
            key: 'visibility',
            title: 'Hiển thị',
            render: (record) => (
                <div className="admin-ui-entity">
                    <StatusBadge variant={record.isVisible ? 'success' : 'error'} shape="tag">
                        {record.isVisible ? 'Đang hiện' : 'Đã ẩn'}
                    </StatusBadge>
                    {!record.isVisible && record.hiddenReason && (
                        <span className="admin-ui-entity-secondary feedback-hidden-reason" title={record.hiddenReason}>
                            {record.hiddenReason}
                        </span>
                    )}
                </div>
            ),
            minWidth: 160,
        },
        {
            key: 'action',
            title: 'Hành động',
            align: 'right',
            render: (record) => (
                <Can permission="feedback.moderate">
                    <button
                        type="button"
                        className={`admin-ui-button ${record.isVisible ? 'admin-ui-button-secondary' : 'admin-ui-button-success'} feedback-action-button`}
                        onClick={() => void handleToggleVisibility(record)}
                        disabled={togglingId === record.feedbackId}
                    >
                        {record.isVisible ? 'Ẩn' : 'Hiện'}
                    </button>
                </Can>
            ),
            minWidth: 110,
        },
    ], [handleToggleVisibility, togglingId]);

    return (
        <PageContainer
            eyebrow="Vận hành"
            title="Kiểm duyệt đánh giá"
            subtitle="Xem đánh giá gia sư nhận được và ẩn nội dung vi phạm. Ẩn một đánh giá sẽ loại nó khỏi trang gia sư và tính lại điểm trung bình."
            maxWidth="wide"
            headerAction={
                <div className="admin-ui-actions">
                    <span className="admin-ui-code-chip">{stats.totalCount.toLocaleString('vi-VN')} đánh giá</span>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={() => void fetchFeedbacks()}
                    >
                        <span className="material-symbols-outlined">refresh</span>
                        Làm mới
                    </button>
                </div>
            }
        >
            <div className="admin-ui-kpi-grid feedback-kpi-grid">
                <StatCard
                    icon={<span className="material-symbols-outlined">reviews</span>}
                    value={stats.totalCount}
                    label="Tổng đánh giá"
                    badgeVariant="blue"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">star</span>}
                    value={stats.averageRating ? stats.averageRating.toFixed(1) : '—'}
                    label="Điểm trung bình"
                    badgeVariant="orange"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">visibility</span>}
                    value={stats.visibleCount}
                    label="Đang hiển thị"
                    badgeVariant="green"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">visibility_off</span>}
                    value={stats.hiddenCount}
                    label="Đã ẩn"
                    badge={stats.hiddenCount > 0 ? 'Cần rà lại' : undefined}
                    badgeVariant="red"
                />
            </div>

            <SectionCard>
                <div className="admin-ui-toolbar feedback-toolbar">
                    <FilterTabs
                        tabs={tabs}
                        activeKey={activeTab}
                        onChange={handleTabChange}
                    />
                    <div className="feedback-filter">
                        <label className="feedback-filter__label" htmlFor="feedback-rating-filter">
                            Số sao
                        </label>
                        <select
                            id="feedback-rating-filter"
                            className="feedback-filter__select"
                            value={ratingFilter ?? ''}
                            onChange={(event) => handleRatingChange(event.target.value)}
                        >
                            <option value="">Tất cả</option>
                            {[5, 4, 3, 2, 1].map((star) => (
                                <option key={star} value={star}>{star} sao</option>
                            ))}
                        </select>
                    </div>
                </div>
            </SectionCard>

            <SectionCard
                title="Danh sách đánh giá"
                subtitle="Gồm cả đánh giá đã bị ẩn — khác với danh sách công khai trên trang gia sư."
                footer={`Hiển thị ${feedbacks.length} / ${totalCount.toLocaleString('vi-VN')} đánh giá`}
            >
                <DataTable<AdminFeedbackItem>
                    columns={columns}
                    data={feedbacks}
                    rowKey="feedbackId"
                    loading={loading}
                    loadingText="Đang tải danh sách đánh giá..."
                    emptyText="Không có đánh giá nào khớp bộ lọc"
                    emptyIcon={
                        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                            reviews
                        </span>
                    }
                    tableLabel="Danh sách đánh giá"
                    pagination={{
                        current: currentPage,
                        pageSize: PAGE_SIZE,
                        total: totalCount,
                        onChange: setCurrentPage,
                    }}
                    minWidth={1080}
                    variant="embedded"
                    density="compact"
                    adaptive
                />
            </SectionCard>

            <HideFeedbackModal
                isOpen={hideTarget !== null}
                feedback={hideTarget}
                onClose={() => setHideTarget(null)}
                onHide={handleConfirmHide}
            />
        </PageContainer>
    );
};

export default AdminFeedbacksPage;
