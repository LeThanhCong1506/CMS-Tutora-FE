import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getAdminDashboardStats,
    getAdminUserStats,
    getAdminTutorPerformance,
    getAdminDisputeStats,
} from '../../services/adminDashboard.service';
import type {
    AdminDashboardStats,
    AdminUserStats,
    AdminTutorPerformance,
    AdminDisputeStats,
    TutorPerformanceItem,
} from '../../types/admin.types';
import { DataTable, FilterTabs, PageContainer, SectionCard, StatCard } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import { formatCurrency, formatCompactNumber, formatNumber } from '../../utils/formatters';

import '../../styles/pages/admin-dashboard.css';

// ─── Date range helpers ───

type RangeKey = 'today' | '7d' | '30d';

const computeRange = (key: RangeKey): { from: Date; to: Date } => {
    const to = new Date();
    const from = new Date();
    if (key === 'today') {
        from.setHours(0, 0, 0, 0);
    } else if (key === '7d') {
        from.setDate(from.getDate() - 7);
    } else {
        from.setDate(from.getDate() - 30);
    }
    return { from, to };
};

const rangeTabs = [
    { key: 'today', label: 'Hôm nay' },
    { key: '7d', label: '7 ngày' },
    { key: '30d', label: '30 ngày' },
];

// ─── Sub-components ───

const ActionRow = ({
    icon,
    label,
    meta,
    value,
    onClick,
}: {
    icon: string;
    label: string;
    meta?: string;
    value: number | string;
    onClick: () => void;
}) => {
    const isZero = typeof value === 'number' ? value === 0 : value === '0';
    return (
        <button type="button" className="admin-action-row" onClick={onClick}>
            <span className="admin-action-row-icon">
                <span className="material-symbols-outlined">{icon}</span>
            </span>
            <span className="admin-action-row-body">
                <span className="admin-action-row-label">{label}</span>
                {meta && <span className="admin-action-row-meta">{meta}</span>}
            </span>
            <span
                className={`admin-action-row-value ${isZero ? 'admin-action-row-value-zero' : ''}`}
            >
                {value}
            </span>
            <span className="admin-action-row-chevron material-symbols-outlined">chevron_right</span>
        </button>
    );
};

const MiniStat = ({
    value,
    label,
    color,
}: {
    value: number | string;
    label: string;
    color?: string;
}) => (
    <div className="admin-mini-stat">
        <div className="admin-mini-stat-value" style={color ? { color } : undefined}>
            {value}
        </div>
        <div className="admin-mini-stat-label">{label}</div>
    </div>
);

const tutorColumns = (revenueColumn: boolean): DataTableColumn<TutorPerformanceItem>[] => [
    {
        key: 'tutor',
        title: 'Gia sư',
        render: (row) => (
            <div className="admin-table-user">
                {row.avatarUrl ? (
                    <div className="admin-user-thumbnail" style={{ backgroundImage: `url('${row.avatarUrl}')` }} />
                ) : (
                    <div className="admin-user-thumbnail admin-user-thumbnail-initials">
                        {row.fullName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="admin-user-details">
                    <p className="admin-user-name-text">{row.fullName}</p>
                    <p className="admin-user-subtitle">{row.subscriptionType || '—'}</p>
                </div>
            </div>
        ),
    },
    {
        key: 'rating',
        title: 'Đánh giá',
        render: (row) =>
            row.averageRating != null ? `${row.averageRating.toFixed(1)} ★ (${row.totalFeedbacks})` : '—',
        hideOnMobile: true,
    },
    {
        key: 'lessons',
        title: 'Buổi',
        dataIndex: 'lessonsCompleted',
        hideOnMobile: true,
    },
    revenueColumn
        ? {
              key: 'revenue',
              title: 'Doanh thu',
              align: 'right' as const,
              render: (row) => formatCurrency(row.totalRevenue),
          }
        : {
              key: 'completion',
              title: 'Hoàn thành',
              align: 'right' as const,
              render: (row) =>
                  row.completionRatePercent != null ? `${row.completionRatePercent.toFixed(1)}%` : '—',
          },
];

// ─── Component ───

const AdminDashboardPageEnhanced = () => {
    const navigate = useNavigate();

    const [rangeKey, setRangeKey] = useState<RangeKey>('30d');

    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
    const [tutorPerformance, setTutorPerformance] = useState<AdminTutorPerformance | null>(null);
    const [disputeStats, setDisputeStats] = useState<AdminDisputeStats | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const range = useMemo(() => computeRange(rangeKey), [rangeKey]);

    useEffect(() => {
        let cancelled = false;

        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            try {
                const [statsRes, userRes, tutorRes, disputeRes] = await Promise.all([
                    getAdminDashboardStats(),
                    getAdminUserStats(range.from, range.to),
                    getAdminTutorPerformance(10, range.from, range.to),
                    getAdminDisputeStats(range.from, range.to),
                ]);
                if (cancelled) return;
                setStats(statsRes);
                setUserStats(userRes);
                setTutorPerformance(tutorRes);
                setDisputeStats(disputeRes);
            } catch (err: unknown) {
                if (cancelled) return;
                console.error('Dashboard fetch error:', err);
                setError('Không tải được dữ liệu bảng điều khiển. Vui lòng thử lại.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAll();
        return () => {
            cancelled = true;
        };
    }, [range]);

    const platform = stats?.platformOverview;
    const booking = stats?.bookingSummary;
    const lesson = stats?.lessonSummary;
    const pending = stats?.pendingActions;

    return (
        <PageContainer
            eyebrow="Tổng quan"
            title="Chào buổi sáng, Quản trị viên"
            subtitle="Đây là những gì đang diễn ra tại TUTORA hôm nay."
            maxWidth="wide"
            headerAction={
                <FilterTabs
                    tabs={rangeTabs}
                    activeKey={rangeKey}
                    onChange={(key) => setRangeKey(key as RangeKey)}
                />
            }
        >

                    {error && (
                        <div
                            style={{
                                background: '#fee2e2',
                                border: '1px solid #fca5a5',
                                borderRadius: 12,
                                padding: '12px 16px',
                                marginBottom: 24,
                                color: '#991b1b',
                                fontWeight: 500,
                            }}
                        >
                            {error}
                        </div>
                    )}

            {/* KPI GRID */}
            <div className="admin-ui-kpi-grid">
                <StatCard
                    icon={<span className="material-symbols-outlined">group</span>}
                    value={loading ? '...' : formatNumber(platform?.totalUsers ?? 0)}
                    label="Tổng số người dùng"
                    subLabel={`+${userStats?.growth.newUsersThisMonth ?? 0} trong 30 ngày`}
                    badge={`HS ${formatNumber(platform?.totalStudents ?? 0)} · PH ${formatNumber(platform?.totalParents ?? 0)}`}
                    badgeVariant="green"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">school</span>}
                    value={loading ? '...' : formatNumber(platform?.totalActiveTutors ?? 0)}
                    label="Gia sư hoạt động"
                    subLabel="Hồ sơ tutor"
                    badge={`Chờ duyệt: ${platform?.pendingTutorApprovals ?? 0}`}
                    badgeVariant={platform && platform.pendingTutorApprovals > 0 ? 'orange' : 'green'}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">event</span>}
                    value={loading ? '...' : formatNumber(booking?.activeBookings ?? 0)}
                    label="Booking đang hoạt động"
                    subLabel={`Hủy: ${formatNumber(booking?.cancelledBookings ?? 0)}`}
                    badge={`Hoàn tất: ${formatNumber(booking?.completedBookings ?? 0)}`}
                    badgeVariant="green"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">payments</span>}
                    value={loading ? '...' : formatCompactNumber(booking?.platformRevenueThisMonth ?? 0)}
                    label="Doanh thu nền tảng tháng này"
                    subLabel={formatCurrency(booking?.platformRevenueThisMonth ?? 0)}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">currency_exchange</span>}
                    value={loading ? '...' : formatCompactNumber(booking?.gmvThisMonth ?? 0)}
                    label="GMV tháng này"
                    subLabel={formatCurrency(booking?.gmvThisMonth ?? 0)}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">today</span>}
                    value={loading ? '...' : formatNumber(lesson?.lessonsToday ?? 0)}
                    label="Buổi học hôm nay"
                    subLabel={
                        lesson?.noShowRatePercent != null
                            ? `No-show ${lesson.noShowRatePercent.toFixed(1)}%`
                            : undefined
                    }
                    badge={
                        lesson?.completionRatePercent != null
                            ? `Hoàn thành ${lesson.completionRatePercent.toFixed(1)}%`
                            : undefined
                    }
                    badgeVariant="green"
                />
            </div>

                    {/* SECTIONS */}
                    <div className="admin-dashboard-sections">
                        {/* PENDING ACTIONS — full-width list */}
                        <SectionCard
                            title="Hành động cần xử lý"
                            subtitle="Các queue có ảnh hưởng trực tiếp tới vận hành và dòng tiền."
                        >
                            <div className="admin-action-list">
                                <ActionRow
                                    icon="verified_user"
                                    label="Hồ sơ gia sư chờ duyệt"
                                    meta="Cấp quyền cho tutor mới"
                                    value={platform?.pendingTutorApprovals ?? 0}
                                    onClick={() => navigate('/admin-portal/vetting')}
                                />
                                <ActionRow
                                    icon="account_balance_wallet"
                                    label="Yêu cầu rút tiền chờ duyệt"
                                    meta={
                                        pending?.pendingWithdrawalAmount
                                            ? `Tổng ${formatCompactNumber(pending.pendingWithdrawalAmount)}`
                                            : undefined
                                    }
                                    value={pending?.pendingWithdrawals ?? 0}
                                    onClick={() => navigate('/admin-portal/financials')}
                                />
                                <ActionRow
                                    icon="gavel"
                                    label="Khiếu nại mở"
                                    meta="Cần phân loại / điều tra"
                                    value={pending?.openDisputes ?? 0}
                                    onClick={() => navigate('/admin-portal/disputes')}
                                />
                                <ActionRow
                                    icon="warning"
                                    label="Cảnh báo chờ xử lý"
                                    meta="Cần ra quyết định cảnh báo / khóa tài khoản"
                                    value={pending?.pendingWarnings ?? 0}
                                    onClick={() => navigate('/admin-portal/warnings')}
                                />
                            </div>
                        </SectionCard>

                        {/* TUTOR FUNNEL — full-width */}
                        <SectionCard
                            title="Phễu duyệt gia sư"
                            subtitle="Theo dõi trạng thái hồ sơ tutor trong pipeline duyệt."
                        >
                            {userStats ? (
                                <>
                                    <div
                                        className="admin-mini-grid"
                                        style={{
                                            gridTemplateColumns: 'repeat(5, 1fr)',
                                            padding: 20,
                                        }}
                                    >
                                        <MiniStat
                                            value={userStats.tutorFunnel.draft}
                                            label="Draft"
                                            color="#94a3b8"
                                        />
                                        <MiniStat
                                            value={userStats.tutorFunnel.pendingApproval}
                                            label="Chờ duyệt"
                                            color="#f59e0b"
                                        />
                                        <MiniStat
                                            value={userStats.tutorFunnel.active}
                                            label="Đang hoạt động"
                                            color="#10b981"
                                        />
                                        <MiniStat
                                            value={userStats.tutorFunnel.rejected}
                                            label="Bị từ chối"
                                            color="#ef4444"
                                        />
                                        <MiniStat
                                            value={userStats.tutorFunnel.publicTutors}
                                            label="Public"
                                            color="#2563eb"
                                        />
                                    </div>
                                    <div className="admin-inline-summary">
                                        <span>
                                            <strong>{userStats.growth.newUsersThisWeek}</strong> user mới
                                            trong tuần
                                        </span>
                                        <span>
                                            <strong>{userStats.growth.newUsersThisMonth}</strong> user
                                            mới trong tháng
                                        </span>
                                        <span>
                                            <strong>{userStats.moderation.activeSuspensions}</strong> đang
                                            bị tạm khóa
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p style={{ padding: 20, color: '#94a3b8' }}>
                                    {loading ? 'Đang tải...' : 'Không có dữ liệu'}
                                </p>
                            )}
                        </SectionCard>

                        {/* TUTOR PERFORMANCE — two tables */}
                        <SectionCard
                            title="Hiệu suất gia sư"
                            subtitle="So sánh tutor theo đánh giá, số buổi và doanh thu trong khoảng thời gian đã chọn."
                            headerAction={
                                tutorPerformance?.platformAverageRating != null ? (
                                    <span style={{ fontSize: 13, color: '#475569' }}>
                                        TB nền tảng:{' '}
                                        <strong style={{ color: 'var(--color-gold)' }}>
                                            {tutorPerformance.platformAverageRating.toFixed(2)} ★
                                        </strong>
                                    </span>
                                ) : null
                            }
                        >
                            <div className="admin-two-col" style={{ padding: 20 }}>
                                <div>
                                    <h4 className="admin-two-col-title">Top theo đánh giá</h4>
                                    <DataTable
                                        columns={tutorColumns(false)}
                                        data={tutorPerformance?.topByRating ?? []}
                                        rowKey="tutorId"
                                        emptyText={loading ? 'Đang tải...' : 'Chưa có dữ liệu'}
                                        minWidth={400}
                                        variant="embedded"
                                    />
                                </div>
                                <div>
                                    <h4 className="admin-two-col-title">Top theo doanh thu</h4>
                                    <DataTable
                                        columns={tutorColumns(true)}
                                        data={tutorPerformance?.topByRevenue ?? []}
                                        rowKey="tutorId"
                                        emptyText={loading ? 'Đang tải...' : 'Chưa có dữ liệu'}
                                        minWidth={400}
                                        variant="embedded"
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        {/* DISPUTES */}
                        <SectionCard
                            title="Tổng quan khiếu nại"
                            subtitle="Tình trạng dispute, tốc độ xử lý và tổng hoàn tiền trong kỳ."
                        >
                            {disputeStats ? (
                                <div
                                    style={{
                                        padding: 20,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 20,
                                    }}
                                >
                                    <div
                                        className="admin-mini-grid"
                                        style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
                                    >
                                        <MiniStat
                                            value={disputeStats.overview.totalDisputes}
                                            label="Tổng"
                                            color="#1e293b"
                                        />
                                        <MiniStat
                                            value={disputeStats.overview.pending}
                                            label="Chờ xử lý"
                                            color="#f59e0b"
                                        />
                                        <MiniStat
                                            value={disputeStats.overview.investigating}
                                            label="Đang điều tra"
                                            color="#2563eb"
                                        />
                                        <MiniStat
                                            value={disputeStats.overview.resolved}
                                            label="Đã giải quyết"
                                            color="#10b981"
                                        />
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 24,
                                            fontSize: 13,
                                            color: '#475569',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        {disputeStats.overview.resolutionRatePercent != null && (
                                            <span>
                                                Tỉ lệ giải quyết:{' '}
                                                <strong style={{ color: '#10b981' }}>
                                                    {disputeStats.overview.resolutionRatePercent.toFixed(1)}%
                                                </strong>
                                            </span>
                                        )}
                                        {disputeStats.overview.avgResolutionDays != null && (
                                            <span>
                                                TB thời gian xử lý:{' '}
                                                <strong>
                                                    {disputeStats.overview.avgResolutionDays.toFixed(1)} ngày
                                                </strong>
                                            </span>
                                        )}
                                        <span>
                                            Hoàn tiền kỳ này:{' '}
                                            <strong>
                                                {formatCurrency(
                                                    disputeStats.financial.refundAmountThisPeriod
                                                )}{' '}
                                                ({disputeStats.financial.refundsThisPeriod} lệnh)
                                            </strong>
                                        </span>
                                    </div>
                                    {disputeStats.byType.length > 0 && (
                                        <div>
                                            <h4 className="admin-two-col-title">Phân loại</h4>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {disputeStats.byType.map((t) => (
                                                    <span key={t.type} className="admin-chip">
                                                        {t.type}: <strong>{t.count}</strong>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p style={{ padding: 20, color: '#94a3b8' }}>
                                    {loading ? 'Đang tải...' : 'Không có dữ liệu'}
                                </p>
                            )}
                        </SectionCard>
                    </div>
        </PageContainer>
    );
};

export default AdminDashboardPageEnhanced;
