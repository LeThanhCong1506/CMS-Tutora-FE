import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccess } from '../../contexts/AccessContext';
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
import { PageContainer, SectionCard, StatCard } from '../../components/shared';
import {
    FinancialTrendChart,
    LessonActivityChart,
    CategoryDonut,
    HorizontalBars,
    ChartEmpty,
    DashboardRangePicker,
    TutorRevenueRanking,
    TUTOR_RANKING_LIMIT,
    USER_ROLE_COLORS,
    DISPUTE_STATUS_COLORS,
    FUNNEL_COLORS,
    CHART,
} from './components';
import { formatNumber, formatDisputeType } from '../../utils/formatters';
import { formatDashboardCurrency } from './dashboardDisplay';
import { useDashboardRange } from './useDashboardRange';

import '../../styles/pages/admin-dashboard.css';

/** Dòng phụ duy nhất còn giữ lại trên hàng công việc: cảnh báo hàng bấm vào sẽ bị chặn. */
const NO_ACCESS_META = 'Không có quyền truy cập';

const EMPTY_LOAD_FAILURES = {
    summary: false,
    stats: false,
    users: false,
    tutors: false,
    disputes: false,
    trends: false,
};

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
    value: number | null | undefined;
    onClick?: () => void;
}) => {
    const content = (
        <>
            <span className="admin-action-row-icon" aria-hidden="true">
                <span className="material-symbols-outlined">{icon}</span>
            </span>
            <span className="admin-action-row-body">
                <span className="admin-action-row-label">{label}</span>
                {meta && <span className="admin-action-row-meta">{meta}</span>}
            </span>
            <span
                className={`admin-action-row-value ${value === 0 || value == null ? 'admin-action-row-value-zero' : ''}`}
            >
                {value == null ? '—' : formatNumber(value)}
            </span>
        </>
    );

    if (!onClick) {
        return <div className="admin-action-row admin-action-row-static">{content}</div>;
    }

    return (
        <button type="button" className="admin-action-row" onClick={onClick}>
            {content}
            <span className="admin-action-row-chevron material-symbols-outlined" aria-hidden="true">
                chevron_right
            </span>
        </button>
    );
};

// ─── Lesson rate chip ───

const RateChip = ({ label, value, color }: { label: string; value: number | null | undefined; color: string }) => (
    <div className="admin-rate-chip">
        <span className="admin-rate-chip-dot" style={{ background: color }} aria-hidden="true" />
        <span className="admin-rate-chip-label">{label}</span>
        <strong className="admin-rate-chip-value">{value != null ? `${value.toFixed(1)}%` : '—'}</strong>
    </div>
);

// ─── Component ───

const AdminDashboardPageEnhanced = () => {
    const navigate = useNavigate();
    const { can, canAny } = useAccess();
    const canOpenProfiles = canAny(['tutor_approval.view', 'tutor_profile_update.view']);
    const canOpenCertificates = can('certificate.view');
    const canOpenPayouts = can('payout.view');
    const canOpenDisputes = can('dispute.view');

    // `?range=` — preset trượt, hoặc một tháng/tuần/khoảng cố định trong quá khứ.
    const { selection, setSelection, range } = useDashboardRange();

    const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
    const [tutorPerformance, setTutorPerformance] = useState<AdminTutorPerformance | null>(null);
    const [disputeStats, setDisputeStats] = useState<AdminDisputeStats | null>(null);
    const [trends, setTrends] = useState<DashboardTrend | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loadFailures, setLoadFailures] = useState(EMPTY_LOAD_FAILURES);

    useEffect(() => {
        let cancelled = false;

        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            setLoadFailures(EMPTY_LOAD_FAILURES);
            const [summaryR, statsR, userR, tutorR, disputeR, trendsR] = await Promise.allSettled([
                getAdminDashboardSummary(range.from, range.to),
                getAdminDashboardStats(),
                getAdminUserStats(range.from, range.to),
                getAdminTutorPerformance(TUTOR_RANKING_LIMIT, range.from, range.to),
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

            const nextLoadFailures = {
                summary: summaryR.status === 'rejected',
                stats: statsR.status === 'rejected',
                users: userR.status === 'rejected',
                tutors: tutorR.status === 'rejected',
                disputes: disputeR.status === 'rejected',
                trends: trendsR.status === 'rejected',
            };
            setLoadFailures(nextLoadFailures);

            const failedCount = Object.values(nextLoadFailures).filter(Boolean).length;
            if (failedCount === Object.keys(nextLoadFailures).length) {
                console.error('Dashboard fetch error: all endpoints failed');
                setError('Không tải được dữ liệu bảng điều khiển. Vui lòng thử lại.');
            } else if (failedCount > 0) {
                setError(
                    'Một số dữ liệu chưa tải được. Các khu vực bị ảnh hưởng đã được đánh dấu để bạn dễ nhận biết.'
                );
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

    // Hai KPI tiền chỉ lấy từ summary. Không dùng số "tháng này" để thay cho
    // bộ lọc Hôm nay/7 ngày vì sẽ làm sai ngữ cảnh.
    //
    // Cả ba số tiền đều do AdminRevenueAnalyticsService tính, đúng service đứng sau trang Báo
    // cáo doanh thu — nên chúng khớp từng đồng với trang đó. Đừng thay bằng phép tính tại chỗ.
    const gmvValue = summary?.gmv.value;
    // Doanh thu ĐÃ GHI NHẬN mới là con số to trên thẻ: đây là tiền thật đã kiếm được. Doanh thu
    // tạm tính lùi xuống dòng phụ vì nó chỉ là phần đã bán, chưa dạy thì vẫn có thể mất — để
    // nó làm số chính là báo doanh thu cao gấp mấy lần thực tế.
    // Optional chaining tới tận `.value`: `recognisedRevenue` là trường MỚI của API. Backend
    // chưa nạp bản mới thì nó về undefined, và `summary?.recognisedRevenue.value` sẽ ném lỗi
    // làm trắng cả trang thay vì chỉ thiếu một con số.
    const recognisedValue = summary?.recognisedRevenue?.value;
    const contractedValue = summary?.platformRevenue.value;
    const activeBookings = summary?.bookings.active ?? booking?.activeBookings;

    const tutorApprovals = summary?.pendingActions.tutorApprovals ?? platform?.pendingTutorApprovals;
    const pendingCertificates = summary?.pendingActions.pendingCertificates ?? pending?.pendingCertificates;
    const withdrawalReviews = summary?.pendingActions.withdrawalReviews ?? pending?.pendingWithdrawals;
    const openDisputes = summary?.pendingActions.openDisputes ?? pending?.openDisputes;
    const unresolvedAlerts = summary?.pendingActions.unresolvedAlerts;
    const overdueCount = summary?.pendingActions.overdueCount;
    const withdrawalActionCount =
        withdrawalReviews == null && overdueCount == null ? undefined : (withdrawalReviews ?? 0) + (overdueCount ?? 0);

    // Hàng rút tiền là hàng duy nhất có số liệu thật ở dòng phụ, nên giữ lại.
    const withdrawalMeta = [
        withdrawalReviews != null ? `${formatNumber(withdrawalReviews)} chờ duyệt` : null,
        overdueCount != null ? `${formatNumber(overdueCount)} quá hạn` : null,
        pending?.pendingWithdrawalAmount != null
            ? `Tổng ${formatDashboardCurrency(pending.pendingWithdrawalAmount)}`
            : null,
        canOpenPayouts ? null : NO_ACCESS_META,
    ]
        .filter((part): part is string => Boolean(part))
        .join(' · ');

    const gmvBadge = changeBadge(summary?.gmv.changePercent);
    const revBadge = changeBadge(summary?.recognisedRevenue?.changePercent);

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
        // `f.publicTutors` = active && isPublic, tức tập con của `f.active` chứ không phải chỉ số
        // độc lập. Chừng nào mọi gia sư active còn để hồ sơ công khai thì hai cột luôn bằng nhau
        // và cột thứ hai chỉ làm nhiễu biểu đồ. Muốn theo dõi số bị ẩn thì hiện phần chênh
        // (f.active - f.publicTutors) chứ đừng vẽ lại cả tập con.
        return [
            { name: 'Nháp', value: f.draft },
            { name: 'Chờ duyệt', value: f.pendingApproval },
            { name: 'Hoạt động', value: f.active },
            { name: 'Từ chối', value: f.rejected },
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

    const tutorRanking = tutorPerformance?.topByRevenue ?? [];

    const rates = trends?.classSessionRates;

    return (
        <PageContainer
            title="Tổng quan hệ thống"
            titleInfo="Theo dõi các chỉ số vận hành chính của hệ thống trong khoảng thời gian đã chọn."
            maxWidth="wide"
            headerAction={<DashboardRangePicker selection={selection} onChange={setSelection} />}
        >
            {error && (
                <div className="admin-dash-error" role="alert">
                    {error}
                </div>
            )}

            {/* ── KPI ROW ── */}
            <div className="admin-dash-kpis">
                {/* Nhãn "Tiền khách trả" thay cho "Tổng giá trị giao dịch": cùng một chữ với
                    trang Báo cáo doanh thu, và nói thẳng đây là tiền của khách chứ không phải
                    tiền của Tutora — chính chỗ mà chữ "giao dịch" trừu tượng hay bị đọc nhầm
                    thành doanh thu. GMV chỉ còn nhắc trong tooltip cho ai quen thuật ngữ. */}
                <StatCard
                    icon={<span className="material-symbols-outlined">currency_exchange</span>}
                    value={loading ? '…' : formatDashboardCurrency(gmvValue)}
                    valueClassName="admin-kpi-exact-value"
                    label="Giá trị lịch đặt"
                    labelClassName="admin-kpi-friendly-label"
                    badge={gmvBadge?.text}
                    badgeVariant={gmvBadge?.variant}
                    infoTooltip="Tổng giá trị các lịch đặt trong khoảng đã chọn, tính theo GIÁ HỢP ĐỒNG chốt lúc khách bấm đặt, đã gồm phí phụ huynh. ĐÂY KHÔNG PHẢI tiền mặt đã vào — khách trả làm 2 đợt nên khoá mới trả đợt 1 vẫn tính trọn giá gói. Phần lớn khoản này chảy về gia sư nên ĐÂY KHÔNG PHẢI doanh thu của Tutora — thuật ngữ tài chính gọi là GMV. Gồm cả lịch về sau bị huỷ mà khách đã trả tiền, nên khớp đúng với trang Báo cáo doanh thu."
                />
                {/* Thẻ này từng hiện doanh thu tạm tính và gọi nó là "Doanh thu từ phí dịch vụ" —
                    con số cao gấp mấy lần tiền thật vì phần lớn buổi học chưa dạy. Giờ số to là
                    tiền THẬT đã ghi nhận, còn phần đã bán lùi xuống dòng phụ để vẫn đối chiếu
                    được với thanh phân bổ ở trang Báo cáo doanh thu. */}
                <StatCard
                    icon={<span className="material-symbols-outlined">payments</span>}
                    value={loading ? '…' : formatDashboardCurrency(recognisedValue)}
                    valueClassName="admin-kpi-exact-value"
                    label="Doanh thu đã ghi nhận"
                    labelClassName="admin-kpi-friendly-label"
                    subLabel={
                        loading || contractedValue == null
                            ? undefined
                            : `Doanh thu tạm tính ${formatDashboardCurrency(contractedValue)}`
                    }
                    badge={revBadge?.text}
                    badgeVariant={revBadge?.variant}
                    infoTooltip={
                        'Doanh thu THẬT của Tutora trong khoảng đã chọn: phí nền tảng của những buổi đã dạy xong và đã giải ngân cho gia sư, cộng tiền bán gói AI Homework Helper.\n\n'
                        + 'Dòng phụ là doanh thu TẠM TÍNH — toàn bộ phí nền tảng của các lịch đặt trong kỳ, chốt ngay lúc đặt. Buổi chưa dạy thì khoản đó chưa phải tiền, và nếu lịch bị huỷ thì mất hẳn.\n\n'
                        + 'Hai số neo theo hai mốc khác nhau (ngày dạy và ngày đặt lịch) nên đừng đọc thành tỉ lệ. Xem tiền đã bán trong kỳ giờ ra sao ở trang Báo cáo doanh thu.'
                    }
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">event_available</span>}
                    value={loading ? '…' : activeBookings == null ? '—' : formatNumber(activeBookings)}
                    label="Lượt đặt lịch đang hoạt động"
                    labelClassName="admin-kpi-friendly-label"
                    infoTooltip="Số lượt đặt lịch hiện đang ở trạng thái hoạt động tại thời điểm xem."
                />
            </div>

            <div className="admin-dashboard-sections">
                {/* ── TÀI CHÍNH + CÔNG VIỆC ƯU TIÊN ── */}
                <div className="admin-dash-priority-grid">
                    <SectionCard
                        className="admin-dash-priority-financial"
                        /* Biểu đồ vẽ doanh thu TẠM TÍNH (neo theo ngày đặt lịch), không phải số
                           đã ghi nhận ở thẻ KPI phía trên — tiêu đề nói rõ để hai con số không
                           bị đọc như một. */
                        title="Giá trị lịch đặt và doanh thu tạm tính"
                        headerAction={
                            trends?.bucket ? (
                                <span className="admin-dash-bucket">
                                    Hiển thị theo{' '}
                                    <strong>
                                        {trends.bucket === 'day' ? 'ngày' : trends.bucket === 'week' ? 'tuần' : 'tháng'}
                                    </strong>
                                </span>
                            ) : null
                        }
                    >
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : loadFailures.trends ? (
                                <ChartEmpty error />
                            ) : (
                                <FinancialTrendChart data={trends?.financialTrend ?? []} />
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard className="admin-dash-priority-actions" title="Công việc cần ưu tiên">
                        <div className="admin-action-list">
                            <ActionRow
                                icon="verified_user"
                                label="Hồ sơ gia sư chờ duyệt"
                                meta={canOpenProfiles ? undefined : NO_ACCESS_META}
                                value={tutorApprovals}
                                onClick={canOpenProfiles ? () => navigate('/admin-portal/vetting/profiles') : undefined}
                            />
                            <ActionRow
                                icon="workspace_premium"
                                label="Chứng chỉ chờ duyệt"
                                meta={canOpenCertificates ? undefined : NO_ACCESS_META}
                                value={pendingCertificates}
                                onClick={
                                    canOpenCertificates
                                        ? () => navigate('/admin-portal/vetting/certificates')
                                        : undefined
                                }
                            />
                            <ActionRow
                                icon="account_balance_wallet"
                                label="Yêu cầu rút tiền cần xử lý"
                                meta={withdrawalMeta || undefined}
                                value={withdrawalActionCount}
                                onClick={canOpenPayouts ? () => navigate('/admin-portal/payout/review') : undefined}
                            />
                            <ActionRow
                                icon="gavel"
                                label="Khiếu nại đang mở"
                                meta={canOpenDisputes ? undefined : NO_ACCESS_META}
                                value={openDisputes}
                                onClick={canOpenDisputes ? () => navigate('/admin-portal/disputes') : undefined}
                            />
                            <ActionRow
                                icon="warning"
                                label="Cảnh báo hệ thống chưa xử lý"
                                value={unresolvedAlerts}
                            />
                        </div>
                    </SectionCard>
                </div>

                {/* ── HOẠT ĐỘNG BUỔI HỌC + NGƯỜI DÙNG ── */}
                <div className="admin-dash-grid-2-wide">
                    <SectionCard title="Hoạt động buổi học">
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : loadFailures.trends ? (
                                <ChartEmpty error />
                            ) : (
                                <LessonActivityChart data={trends?.classSessionTrend ?? []} />
                            )}
                            {!loading && !loadFailures.trends && rates && (
                                <div className="admin-rate-chips">
                                    <RateChip label="Hoàn thành" value={rates.completionRate} color={CHART.green} />
                                    <RateChip label="Hủy" value={rates.cancellationRate} color={CHART.gold} />
                                    <RateChip label="Vắng mặt" value={rates.noShowRate} color={CHART.burgundy} />
                                </div>
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard title="Người dùng theo vai trò">
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : loadFailures.users ? (
                                <ChartEmpty error />
                            ) : (
                                <CategoryDonut data={userRoleData} colors={USER_ROLE_COLORS} centerLabel="Người dùng" />
                            )}
                        </div>
                    </SectionCard>
                </div>

                {/* ── QUY TRÌNH DUYỆT + KHIẾU NẠI ── */}
                <div className="admin-dash-grid-2">
                    <SectionCard title="Quy trình duyệt hồ sơ gia sư">
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : loadFailures.users ? (
                                <ChartEmpty error />
                            ) : (
                                <HorizontalBars data={funnelData} colors={FUNNEL_COLORS} valueName="Số hồ sơ" />
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard title="Tình trạng khiếu nại">
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : loadFailures.disputes ? (
                                <ChartEmpty error />
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
                    <SectionCard title="Xếp hạng doanh thu gia sư">
                        <div className="admin-chart-body">
                            {loading ? (
                                <ChartEmpty loading />
                            ) : loadFailures.tutors ? (
                                <ChartEmpty error />
                            ) : (
                                <TutorRevenueRanking tutors={tutorRanking} />
                            )}
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Nhóm nguyên nhân khiếu nại"
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
                            ) : loadFailures.disputes ? (
                                <ChartEmpty error />
                            ) : (
                                <HorizontalBars
                                    data={disputeTypeData}
                                    color={CHART.burgundy}
                                    valueName="Số khiếu nại"
                                />
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </PageContainer>
    );
};

export default AdminDashboardPageEnhanced;
