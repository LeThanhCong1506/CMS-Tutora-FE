import { count, growthBadge, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import { getCustomerRevenue } from '@/services/revenueReports.service';
import type { RevenueRange } from '@/services/revenueReports.service';
import { useRevenueReport } from '@/hooks/useRevenueReport';
import {
    ChartBlock,
    DataTableShell,
    ReportEmpty,
    ReportError,
} from '../components/ReportShell';
import ReportSkeleton from '../components/ReportSkeleton';
import {
    BarGroupChart,
    DonutChart,
    HeatmapChart,
    LineTrendChart,
    RankBarChart,
} from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';

const CustomersTab = ({ range }: { range: RevenueRange }) => {
    const { data, loading, error, reload } = useRevenueReport(
        (r) => getCustomerRevenue(r, 50),
        range,
    );

    if (loading) return <ReportSkeleton charts={4} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    if (data.parents.length === 0) {
        return <ReportEmpty label="Chưa có khách hàng nào phát sinh giao dịch trong kỳ" />;
    }

    const c = data.summary;

    const topSpenders = data.parents
        .slice(0, 15)
        .map((p) => ({ ...p, label: p.parentName }));

    // Chỉ hiện phân khúc thực sự có giao dịch — tránh vẽ lát 0đ khi chưa có học sinh tự đặt.
    const activeSegments = (data.segments ?? []).filter(
        (s) => s.customers > 0 || s.totalSpent > 0,
    );
    const segmentSpent = activeSegments.reduce((s, x) => s + x.totalSpent, 0);

    // Cohort → heatmap: hàng là nhóm đăng ký, cột là tháng thứ N.
    const cohortRows = data.cohorts.filter((r) => r.size > 0);
    const monthCount = Math.max(...data.cohorts.map((r) => r.retention.length), 1);
    const cohortCols = Array.from({ length: monthCount }, (_, i) => `Tháng ${i}`);
    const cohortLookup = new Map(
        cohortRows.map((r) => [r.cohort, r.retention]),
    );

    return (
        <div className="rev-stack">
            <div className="rev-metric-grid">
                <MetricCard
                    icon="family_restroom"
                    value={count(c.activeParents)}
                    label="Khách hàng hoạt động"
                    subLabel="Có booking trong kỳ"
                    badgeVariant="blue"
                    hint="Số khách hàng phát sinh ít nhất một booking trong kỳ — gồm cả phụ huynh và học sinh tự đặt lịch. Người có tài khoản nhưng không đặt lịch không tính vào đây."
                />
                <MetricCard
                    icon="savings"
                    value={moneyVnd(c.avgBookingValue)}
                    label="Giá trị booking trung bình"
                    subLabel="Tiền khách trả mỗi lần đặt"
                    badge={growthBadge(c.avgBookingValue, c.avgBookingValuePrevious)}
                    badgeVariant="green"
                    hint="Số tiền trung bình khách trả cho mỗi lần đặt lịch. Tăng nghĩa là bán được gói nhiều buổi hơn hoặc giá gia sư cao hơn."
                />
                <MetricCard
                    icon="repeat"
                    value={`${c.repeatRate}%`}
                    label="Tỷ lệ tái mua"
                    subLabel="Khách đặt từ 2 booking trở lên"
                    badge={`${c.repeatRate >= c.repeatRatePrevious ? '▲' : '▼'} ${Math.abs(c.repeatRate - c.repeatRatePrevious).toFixed(1)}pp`}
                    badgeVariant="green"
                    hint="Phần trăm khách có từ 2 booking trở lên, tính trên toàn bộ lịch sử và KHÔNG phân biệt thời điểm — khách đặt nhiều lần trong cùng một tháng vẫn được tính. Vì vậy chỉ số này thường cao hơn cột 'Quay lại tháng sau' ở biểu đồ bên dưới, vốn chỉ đếm khách nối tiếp sang tháng mới."
                />
                <MetricCard
                    icon="diversity_3"
                    value={moneyVnd(c.ltv)}
                    label="Giá trị vòng đời (LTV)"
                    subLabel="Chi tiêu bình quân mỗi khách hàng"
                    badgeVariant="dark"
                    hint="Tổng tiền một khách hàng chi trung bình từ lúc bắt đầu tới nay. Dùng để so với chi phí thu hút khách — LTV phải lớn hơn nhiều lần thì mới có lãi."
                />
            </div>

            {activeSegments.length > 0 && (
                <div className="rev-grid-2">
                    <ChartBlock
                        title="Doanh thu theo phân khúc khách hàng"
                        subtitle="Phụ huynh đặt cho con so với học sinh tự đặt"
                        hint="Người trả tiền quyết định kênh và thông điệp marketing. Phụ huynh nhạy giá và quan tâm kết quả thi cử; học sinh tự đặt thường tự chọn theo môn và phong cách gia sư. Nhóm nào đóng góp lớn hơn thì ngân sách nên dồn về đó."
                    >
                        <DonutChart
                            data={activeSegments.map((s) => ({
                                name: s.segment,
                                value: s.totalSpent,
                            }))}
                            colors={[PALETTE.navy, PALETTE.gold]}
                            centerLabel="Tổng chi tiêu"
                            height={290}
                        />
                    </ChartBlock>

                    <DataTableShell
                        title="So sánh hai phân khúc"
                        subtitle="Giá trị và mức độ gắn bó của từng nhóm"
                    >
                        <table className="rev-table">
                            <thead>
                                <tr>
                                    <th>Phân khúc</th>
                                    <th className="rev-num">Khách</th>
                                    <th className="rev-num">Chi tiêu</th>
                                    <th className="rev-num">% DT</th>
                                    <th className="rev-num">LTV</th>
                                    <th className="rev-num">Tái mua</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeSegments.map((s) => (
                                    <tr key={s.segment}>
                                        <td>
                                            <strong>{s.segment}</strong>
                                        </td>
                                        <td className="rev-num">{count(s.customers)}</td>
                                        <td className="rev-num rev-pos">{money(s.totalSpent)}</td>
                                        <td className="rev-num">
                                            {segmentSpent > 0
                                                ? `${((s.totalSpent / segmentSpent) * 100).toFixed(0)}%`
                                                : '—'}
                                        </td>
                                        <td className="rev-num">{money(s.ltv)}</td>
                                        <td className="rev-num">{s.repeatRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </DataTableShell>
                </div>
            )}

            <ChartBlock
                title="Top 15 khách hàng theo chi tiêu"
                subtitle="Tổng tiền đã trả cho nền tảng"
                hint="Khách ở nhóm đầu đáng được chăm sóc riêng. Nếu vài người chiếm tỷ trọng quá lớn thì doanh thu đang phụ thuộc rủi ro vào một nhóm nhỏ."
            >
                <RankBarChart
                    data={topSpenders}
                    labelKey="label"
                    valueKey="totalSpent"
                    name="Tổng chi tiêu"
                    color={PALETTE.gold}
                    height={420}
                />
            </ChartBlock>

            <div className="rev-grid-2">
                <ChartBlock
                    title="ARPU theo tháng"
                    subtitle="Doanh thu bình quân mỗi khách hàng hoạt động"
                    hint="ARPU tăng nghĩa là bán được gói lớn hơn hoặc khách học nhiều hơn. Nếu số khách tăng mà ARPU giảm, nền tảng đang tăng trưởng bằng khách giá trị thấp."
                >
                    <LineTrendChart
                        data={data.arpuTrend}
                        xKey="month"
                        height={270}
                        series={[{ key: 'arpu', name: 'ARPU', color: PALETTE.navy, area: true }]}
                    />
                </ChartBlock>

                <ChartBlock
                    title="Khách lần đầu so với khách quay lại tháng sau"
                    subtitle="Đếm số khách, không phải số booking"
                    hint="Mỗi khách chỉ được đếm một lần trong tháng. 'Quay lại' nghĩa là tháng đầu tiên của họ nằm ở tháng TRƯỚC — khách đặt nhiều lần trong cùng tháng đầu vẫn tính là khách lần đầu, nên chỉ số này khác với card 'Tỷ lệ tái mua' (vốn chỉ cần từ 2 booking trở lên, bất kể thời điểm). Nền tảng khỏe mạnh là khi cột quay lại tăng dần qua các tháng."
                >
                    <BarGroupChart
                        data={data.newVsReturning}
                        xKey="month"
                        money={false}
                        stacked
                        height={270}
                        series={[
                            { key: 'returning', name: 'Quay lại tháng sau', color: PALETTE.emerald },
                            { key: 'newCustomers', name: 'Khách lần đầu', color: PALETTE.gold },
                        ]}
                    />
                </ChartBlock>
            </div>

            {cohortRows.length > 0 && (
                <ChartBlock
                    title="Giữ chân khách hàng theo nhóm đăng ký"
                    subtitle="Phần trăm còn hoạt động sau mỗi tháng kể từ booking đầu tiên"
                    hint="Mỗi hàng là nhóm khách hàng bắt đầu trong cùng một tháng. Ô càng đậm là giữ chân càng tốt. Nếu hàng dưới nhạt hơn hàng trên, chất lượng khách mới đang giảm."
                >
                    <HeatmapChart
                        rows={cohortRows.map((r) => `${r.cohort} (${r.size})`)}
                        cols={cohortCols}
                        money={false}
                        suffix="%"
                        height={Math.max(200, cohortRows.length * 42 + 70)}
                        valueAt={(rowLabel, col) => {
                            const cohort = rowLabel.split(' (')[0];
                            const idx = cohortCols.indexOf(col);
                            const retention = cohortLookup.get(cohort);
                            return retention?.[idx] ?? 0;
                        }}
                    />
                </ChartBlock>
            )}

            <ChartBlock
                title="Phân bổ giá trị booking"
                subtitle="Số lượng booking theo khoảng tiền"
                hint="Cho biết nền tảng đang sống bằng gói nhỏ hay gói lớn. Nếu phần lớn nằm ở khoảng thấp, cần xem lại chiến lược đóng gói khóa học."
            >
                <BarGroupChart
                    data={data.bookingValueDistribution}
                    xKey="range"
                    money={false}
                    height={290}
                    series={[{ key: 'count', name: 'Số booking', color: PALETTE.blue }]}
                />
            </ChartBlock>

            <DataTableShell
                title="Khách hàng giá trị cao"
                subtitle="Chi tiêu, nợ dịch vụ và tiến độ học của từng khách hàng"
            >
                <table className="rev-table">
                    <thead>
                        <tr>
                            <th>Khách hàng</th>
                            <th>Loại</th>
                            <th>Học sinh</th>
                            <th className="rev-num">Tổng chi tiêu</th>
                            <th className="rev-num">Nợ dịch vụ</th>
                            <th className="rev-num">Booking</th>
                            <th className="rev-num">Buổi đã mua</th>
                            <th className="rev-num">Buổi đã học</th>
                            <th className="rev-num">Tiến độ</th>
                            <th>Lần đặt gần nhất</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.parents.map((p) => {
                            const progress = p.sessionsPurchased > 0
                                ? Math.round((p.sessionsCompleted / p.sessionsPurchased) * 100)
                                : 0;
                            return (
                                <tr key={p.parentId}>
                                    <td>
                                        <strong>{p.parentName}</strong>
                                    </td>
                                    <td>{p.customerType}</td>
                                    <td>{p.studentName}</td>
                                    <td className="rev-num rev-pos">{money(p.totalSpent)}</td>
                                    <td className="rev-num rev-warn">{money(p.deferredRevenue)}</td>
                                    <td className="rev-num">{p.bookingCount}</td>
                                    <td className="rev-num">{p.sessionsPurchased}</td>
                                    <td className="rev-num">{p.sessionsCompleted}</td>
                                    <td className={`rev-num ${progress < 40 ? 'rev-warn' : ''}`}>
                                        {progress}%
                                    </td>
                                    <td>{p.lastBookingAt ? p.lastBookingAt.slice(0, 10) : '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3}>Tổng</td>
                            <td className="rev-num rev-pos">
                                {moneyVnd(data.parents.reduce((s, p) => s + p.totalSpent, 0))}
                            </td>
                            <td className="rev-num rev-warn">
                                {moneyVnd(data.parents.reduce((s, p) => s + p.deferredRevenue, 0))}
                            </td>
                            <td className="rev-num">
                                {count(data.parents.reduce((s, p) => s + p.bookingCount, 0))}
                            </td>
                            <td className="rev-num">
                                {count(data.parents.reduce((s, p) => s + p.sessionsPurchased, 0))}
                            </td>
                            <td className="rev-num">
                                {count(data.parents.reduce((s, p) => s + p.sessionsCompleted, 0))}
                            </td>
                            <td colSpan={2} />
                        </tr>
                    </tfoot>
                </table>
            </DataTableShell>
        </div>
    );
};

export default CustomersTab;
