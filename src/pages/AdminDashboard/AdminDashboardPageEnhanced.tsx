import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getAdminDashboardStats,
    getAdminUserStats,
    getAdminTutorPerformance,
    getAdminDisputeStats,
    getAdminDashboardSummary,
    getAdminDashboardTrends,
} from '../../services/adminDashboard.service';
import type {
    AdminDashboardStats,
    AdminUserStats,
    AdminTutorPerformance,
    AdminDisputeStats,
    AdminDashboardSummary,
    DashboardTrend,
} from '../../types/admin.types';
import { FilterTabs, PageContainer, SectionCard, StatCard } from '../../components/shared';
import {
    FinancialTrendChart,
    LessonActivityChart,
    CategoryDonut,
    HorizontalBars,
    ChartEmpty,
    USER_ROLE_COLORS,
    DISPUTE_STATUS_COLORS,
    FUNNEL_COLORS,
    CHART,
} from './components';
import {
    formatCurrency,
    formatCompactNumber,
    formatNumber,
    formatDisputeType,
} from '../../utils/formatters';

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

// ─── KPI change badge ───

const changeBadge = (
    pct: number | null | undefined
): { text: string; variant: 'green' | 'red' | 'dark' } | undefined => {
    if (pct == null) return undefined;
    if (pct === 0) return { text: '0%', variant: 'dark' };
    const up = pct > 0;
    return {
        text: `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`,
        variant: up ? 'green' : 'red',
    };
};

// ─── Pending action row ───

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
    value: number;
    onClick: () => void;
}) => (
    <button type="button" className="admin-action-row" onClick={onClick}>
        <span className="admin-action-row-icon">
            <span className="material-symbols-outlined">{icon}</span>
        </span>
        <span className="admin-action-row-body">
            <span className="admin-action-row-label">{label}</span>
            {meta && <span className="admin-action-row-meta">{meta}</span>}
        </span>
        <span className={`admin-action-row-value ${value === 0 ? 'admin-action-row-value-zero' : ''}`}>
            {value}
        </span>
        <span className="admin-action-row-chevron material-symbols-outlined">chevron_right</span>
    </button>
);

// ─── Lesson rate chip ───

const RateChip = ({ label, value, color }: { label: string; value: number | null | undefined; color: string }) => (
    <div className="admin-rate-chip">
        <span className="admin-rate-chip-dot" style={{ background: color }} />
        <span className="admin-rate-chip-label">{label}</span>
        <strong className="admin-rate-chip-value">{value != null ? `${value.toFixed(1)}%` : '—'}</strong>
    </div>
);

// ─── Component ───

const AdminDashboardPageEnhanced = () => {
    const navigate = useNavigate();

    const [rangeKey, setRangeKey] = useState<RangeKey>('30d');

    const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
    const [tutorPerformance, setTutorPerformance] = useState<AdminTutorPerformance | null>(null);
    const [disputeStats, setDisputeStats] = useState<AdminDisputeStats | null>(null);
    const [trends, setTrends] = useState<DashboardTrend | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const range = useMemo(() => computeRange(rangeKey), [rangeKey]);

    useEffect(() => {
        let cancelled = false;

        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            const [summaryR, statsR, userR, tutorR, disputeR, trendsR] = await Promise.allSettled([
                getAdminDashboardSummary(range.from, range.to),
                getAdminDashboardStats(),
                getAdminUserStats(range.from, range.to),
                getAdminTutorPerformance(10, range.from, range.to),
                getAdminDisputeStats(range.from, range.to),
                getAdminDashboardTrends(range.from, range.to, 'auto'),
            ]);
            if (cancelled) return;

            setSummary(summaryR.status === 'fulfilled' ? summaryR.value : null);
            setStats(statsR.status === 'fulfilled' ? statsR.value : null);
            setUserStats(userR.status === 'fulfilled' ? userR.value : null);
            setTutorPerformance(tutorR.status === 'fulfilled' ? tutorR.value : null);
            setDisputeStats(disputeR.status === 'fulfilled' ? disputeR.value : null);
            setTrends(trendsR.status === 'fulfilled' ? trendsR.value : null);

            const everyFailed = [summaryR, statsR, userR, tutorR, disputeR, trendsR].every(
                (r) => r.status === 'rejected'
            );
            if (everyFailed) {
                console.error('Dashboard fetch error: all endpoints failed');
                setError('Không tải được dữ liệu bảng điều khiển. Vui lòng thử lại.');
            }
            setLoading(false);
        };

        fetchAll();
        return () => {
            cancelled = true;
        };
    }, [range]);

    const platform = stats?.platformOverview;
    const booking = stats?.bookingSummary;
    const pending = stats?.pendingActions;

    // ── KPI (ưu tiên summary, fallback sang stats) ──
    const gmvValue = summary?.gmv.value ?? booking?.gmvThisMonth ?? 0;
    const revValue = summary?.platformRevenue.value ?? booking?.platformRevenueThisMonth ?? 0;
    const activeBookings = summary?.bookings.active ?? booking?.activeBookings ?? 0;
    const newInPeriod = summary?.bookings.newInPeriod;
    const completedInPeriod = summary?.bookings.completedInPeriod ?? booking?.completedBookings ?? 0;
    const pendingTotal =
        summary?.pendingActions.total ??
        (platform?.pendingTutorApprovals ?? 0) +
            (pending?.pendingWithdrawals ?? 0) +
            (pending?.openDisputes ?? 0) +
            (pending?.pendingWarnings ?? 0);
    const tutorApprovals = summary?.pendingActions.tutorApprovals ?? platform?.pendingTutorApprovals ?? 0;
    const withdrawalReviews = summary?.pendingActions.withdrawalReviews ?? pending?.pendingWithdrawals ?? 0;
    const openDisputes = summary?.pendingActions.openDisputes ?? pending?.openDisputes ?? 0;
    const overdueCount = summary?.pendingActions.overdueCount ?? 0;

    const gmvBadge = changeBadge(summary?.gmv.changePercent);
    const revBadge = changeBadge(summary?.platformRevenue.changePercent);

    // ── Chart data ──
    const userRoleData = useMemo(() => {
        if (!userStats) return [];
        const r = userStats.byRole;
        return [
            { name: 'Học sinh', value: r.totalStudents },
            { name: 'Phụ huynh', value: r.totalParents },
            { name: 'Gia sư', value: r.totalTutors },
            { name: 'Nhân viên', value: r.totalStaff },
        ].filter((d) => d.value > 0);
    }, [userStats]);

    const funnelData = useMemo(() => {
        if (!userStats) return [];
        const f = userStats.tutorFunnel;
        return [
            { name: 'Nháp', value: f.draft },
            { name: 'Chờ duyệt', value: f.pendingApproval },
            { name: 'Hoạt động', value: f.active },
            { name: 'Từ chối', value: f.rejected },
            { name: 'Public', value: f.publicTutors },
        ];
    }, [userStats]);

    const disputeStatusData = useMemo(() => {
        if (!disputeStats) return [];
        const o = disputeStats.overview;
        return [
            { name: 'Chờ xử lý', value: o.pending },
            { name: 'Đang điều tra', value: o.investigating },
            { name: 'Đã giải quyết', value: o.resolved },
            { name: 'Đã đóng', value: o.closed },
        ].filter((d) => d.value > 0);
    }, [disputeStats]);

    const disputeTypeData = useMemo(() => {
        if (!disputeStats) return [];
        return disputeStats.byType.map((t) => ({ name: formatDisputeType(t.type), value: t.count }));
    }, [disputeStats]);

    const topTutorData = useMemo(() => {
        if (!tutorPerformance) return [];
        return tutorPerformance.topByRevenue
            .slice(0, 6)
            .filter((t) => t.totalRevenue > 0)
            .map((t) => ({ name: t.fullName, value: t.totalRevenue }));
    }, [tutorPerformance]);

    const rates = trends?.lessonRates;

    return (
        <PageContainer
            eyebrow="Tổng quan"
            title="Bảng điều khiển Quản trị"
            subtitle="Toàn cảnh hoạt động của TUTORA trong khoảng thời gian đã chọn."
            maxWidth="wide"
            headerAction={
                <FilterTabs
                    tabs={rangeTabs}
                    activeKey={rangeKey}
                    onChange={(key) => setRangeKey(key as RangeKey)}
                />
            }
        >
            {error && <div className="admin-dash-error">{error}</div>}

            {/* ── KPI ROW ── */}
            <div className="admin-dash-kpis">
                <StatCard
                    icon={<span className="material-symbols-outlined">currency_exchange</span>}
                    value={loading ? '…' : formatCompactNumber(gmvValue)}
                    label="GMV (kỳ này)"
                    subLabel={formatCurrency(gmvValue)}
                    badge={gmvBadge?.text}
                    badgeVariant={gmvBadge?.variant}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">payments</span>}
                    value={loading ? '…' : formatCompactNumber(revValue)}
                    label="Doanh thu nền tảng"
                    subLabel={formatCurrency(revValue)}
                    badge={revBadge?.text}
                    badgeVariant={revBadge?.variant}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">event_available</span>}
                    value={loading ? '…' : formatNumber(activeBookings)}
                    label="Booking đang hoạt động"
                    subLabel={
                        newInPeriod != null
                            ? `+${newInPeriod} mới · ${completedInPeriod} hoàn tất`
                            : `${completedInPeriod} hoàn tất`
                    }
                />
                <StatCard
                    className="admin-kpi-alert"
                    icon={<span className="material-symbols-outlined">pending_actions</span>}
                    value={loading ? '…' : formatNumber(pendingTotal)}
                    label="Việc cần xử lý"
                    subLabel={`${tutorApprovals} duyệt · ${withdrawalReviews} rút tiền · ${openDisputes} khiếu nại`}
                    badge={overdueCount > 0 ? `${overdueCount} quá hạn` : undefined}
                    badgeVariant="red"
                />
            </div>

            <div className="admin-dashboard-sections">
                {/* ── FINANCIAL TREND (hero) ── */}
                <SectionCard
                    title="Xu hướng tài chính"
                    subtitle="GMV và doanh thu nền tảng theo thời gian."
                    headerAction={
                        trends?.bucket ? (
                            <span className="admin-dash-bucket">
                                Nhóm theo{' '}
                                {trends.bucket === 'day' ? 'ngày' : trends.bucket === 'week' ? 'tuần' : 'tháng'}
                            </span>
                        ) : null
                    }
                >
                    <div className="admin-chart-body">
                        {loading ? <ChartEmpty loading /> : <FinancialTrendChart data={trends?.financialTrend ?? []} />}
                    </div>
                </SectionCard>

                {/* ── LESSON ACTIVITY + PENDING ── */}
                <div className="admin-dash-grid-2-wide">
                    <SectionCard
                        title="Hoạt động buổi học"
                        subtitle="Buổi hoàn thành, hủy và vắng mặt theo thời gian."
                    >
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : (
                                <LessonActivityChart data={trends?.lessonTrend ?? []} />
                            )}
                            {rates && (
                                <div className="admin-rate-chips">
                                    <RateChip label="Hoàn thành" value={rates.completionRate} color={CHART.green} />
                                    <RateChip label="Hủy" value={rates.cancellationRate} color={CHART.gold} />
                                    <RateChip label="Vắng mặt" value={rates.noShowRate} color={CHART.burgundy} />
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Hành động cần xử lý"
                        subtitle="Queue ảnh hưởng trực tiếp tới vận hành & dòng tiền."
                    >
                        <div className="admin-action-list">
                            <ActionRow
                                icon="verified_user"
                                label="Hồ sơ gia sư chờ duyệt"
                                meta="Cấp quyền cho tutor mới"
                                value={tutorApprovals}
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
                                value={withdrawalReviews}
                                onClick={() => navigate('/admin-portal/financials')}
                            />
                            <ActionRow
                                icon="gavel"
                                label="Khiếu nại đang mở"
                                meta="Cần phân loại / điều tra"
                                value={openDisputes}
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
                </div>

                {/* ── DISTRIBUTIONS: users / funnel / disputes ── */}
                <div className="admin-dash-grid-3">
                    <SectionCard title="Phân bổ người dùng" subtitle="Theo vai trò trên nền tảng.">
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : (
                                <CategoryDonut data={userRoleData} colors={USER_ROLE_COLORS} centerLabel="Người dùng" />
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard title="Phễu duyệt gia sư" subtitle="Trạng thái hồ sơ trong pipeline.">
                        <div className="admin-chart-body">
                            {loading ? <ChartEmpty loading /> : <HorizontalBars data={funnelData} colors={FUNNEL_COLORS} />}
                        </div>
                    </SectionCard>

                    <SectionCard title="Trạng thái khiếu nại" subtitle="Phân bổ dispute trong kỳ.">
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : (
                                <CategoryDonut
                                    data={disputeStatusData}
                                    colors={DISPUTE_STATUS_COLORS}
                                    centerLabel="Khiếu nại"
                                />
                            )}
                        </div>
                    </SectionCard>
                </div>

                {/* ── TOP TUTORS + DISPUTE TYPES ── */}
                <div className="admin-dash-grid-2">
                    <SectionCard
                        title="Top gia sư theo doanh thu"
                        subtitle="Gia sư đóng góp doanh thu cao nhất trong kỳ."
                        headerAction={
                            tutorPerformance?.platformAverageRating != null ? (
                                <span className="admin-dash-bucket">
                                    TB nền tảng{' '}
                                    <strong style={{ color: 'var(--color-gold)' }}>
                                        {tutorPerformance.platformAverageRating.toFixed(2)} ★
                                    </strong>
                                </span>
                            ) : null
                        }
                    >
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : (
                                <HorizontalBars data={topTutorData} color={CHART.gold} money />
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Khiếu nại theo loại"
                        subtitle="Phân loại nguyên nhân tranh chấp."
                        headerAction={
                            disputeStats?.overview.resolutionRatePercent != null ? (
                                <span className="admin-dash-bucket">
                                    Tỉ lệ giải quyết{' '}
                                    <strong style={{ color: CHART.emerald }}>
                                        {disputeStats.overview.resolutionRatePercent.toFixed(1)}%
                                    </strong>
                                </span>
                            ) : null
                        }
                    >
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : (
                                <HorizontalBars data={disputeTypeData} color={CHART.burgundy} />
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </PageContainer>
    );
};

export default AdminDashboardPageEnhanced;
