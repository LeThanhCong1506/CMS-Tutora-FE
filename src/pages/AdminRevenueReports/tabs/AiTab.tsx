import { count, growthBadge, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import { getAiRevenue } from '@/services/revenueReports.service';
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
    LineTrendChart,
    RankBarChart,
} from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';

const AiTab = ({ range }: { range: RevenueRange }) => {
    const { data, loading, error, reload } = useRevenueReport((r) => getAiRevenue(r, 20), range);

    if (loading) return <ReportSkeleton charts={3} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    const a = data.summary;

    if (a.revenue === 0 && a.creditsSold === 0) {
        return <ReportEmpty label="Chưa có giao dịch gói AI nào trong kỳ" />;
    }

    const activationRate = a.totalUsers > 0 ? (a.activatedUsers / a.totalUsers) * 100 : 0;
    const consumptionRate = a.activatedCreditsGranted > 0
        ? (a.activatedCreditsConsumed / a.activatedCreditsGranted) * 100
        : 0;

    // Gói miễn phí không tạo doanh thu
    const paidPackages = data.packages.filter((p) => p.price > 0 && p.revenue > 0);

    const topBuyers = data.topUsers
        .filter((u) => u.amountPaid > 0)
        .slice(0, 5)
        .map((u) => ({ ...u, label: u.userName }));

    return (
        <div className="rev-stack">
            <div className="rev-metric-grid">
                <MetricCard
                    icon="smart_toy"
                    value={moneyVnd(a.revenue)}
                    label="Doanh thu AI kỳ này"
                    subLabel="Bán gói lượt AI hỗ trợ giải bài tập"
                    badge={growthBadge(a.revenue, a.revenuePrevious)}
                    badgeVariant="green"
                    hint="Tổng tiền thu được từ bán gói AI. Chưa trừ chi phí từ API."
                />
                <MetricCard
                    icon="shopping_bag"
                    value={count(a.packagesSold)}
                    label="Gói đã bán"
                    subLabel="Giao dịch thanh toán thành công"
                    badge={growthBadge(a.packagesSold, a.packagesSoldPrevious)}
                    badgeVariant="blue"
                    hint="Số lượt mua gói AI thanh toán thành công. Không tính gói dùng thử miễn phí được cấp tự động."
                />
                <MetricCard
                    icon="person_check"
                    value={`${activationRate.toFixed(1)}%`}
                    label="Tỷ lệ kích hoạt"
                    subLabel={`${count(a.activatedUsers)} / ${count(a.totalUsers)} tài khoản`}
                    badgeVariant={activationRate > 20 ? 'green' : 'orange'}
                    hint="Phần trăm tài khoản được cấp lượt AI đã thực sự hỏi ít nhất một câu. Đo độ phủ của sản phẩm. Mọi tài khoản đều được tặng lượt khi đăng ký nên tỷ lệ này cho biết bao nhiêu người đã dùng thử."
                />
                <MetricCard
                    icon="bolt"
                    value={`${consumptionRate.toFixed(1)}%`}
                    label="Tỷ lệ sử dụng"
                    subLabel={`${count(a.activatedCreditsConsumed)} / ${count(a.activatedCreditsGranted)} lượt`}
                    badgeVariant={consumptionRate > 50 ? 'green' : 'orange'}
                    hint="Trong nhóm ĐÃ từng hỏi bài, họ đã dùng bao nhiêu phần trăm số lượt được cấp. Đo cường độ sử dụng của người thật."
                />
            </div>

            {a.creditsOutstanding > 0 && (
                <div className="rev-callout">
                    <span className="material-symbols-outlined">info</span>
                    <p>
                        Toàn hệ thống đã cấp <strong>{count(a.creditsSold)}</strong> lượt AI (tặng
                        khi đăng ký, tặng khi có lịch học, và mua gói), mới dùng{' '}
                        <strong>{count(a.creditsConsumed)}</strong>, còn lại{' '}
                        <strong>{count(a.creditsOutstanding)}</strong> lượt sẽ phải phục vụ trong
                        tương lai — mỗi lượt đều phát sinh chi phí gọi API.
                    </p>
                </div>
            )}

            <ChartBlock
                title="Doanh thu AI 12 tháng"
                subtitle="Tiền bán gói credit theo tháng"
                hint="Doanh thu từ AI giải bài tập. Tỷ trọng này tăng thì biên lợi nhuận chung của nền tảng cải thiện."
            >
                <LineTrendChart
                    data={data.trend}
                    xKey="month"
                    height={290}
                    series={[
                        { key: 'aiRevenue', name: 'Doanh thu AI', color: PALETTE.blue, area: true },
                    ]}
                />
            </ChartBlock>

            <div className="rev-grid-2">
                <ChartBlock
                    title="Top 5 người mua gói AI"
                    subtitle="Xếp theo số tiền đã trả"
                    hint="Nhóm chi nhiều nhất cho sản phẩm AI."
                >
                    {topBuyers.length === 0 ? (
                        <ReportEmpty label="Chưa có ai mua gói AI trong kỳ" />
                    ) : (
                        <RankBarChart
                            data={topBuyers}
                            labelKey="label"
                            valueKey="amountPaid"
                            name="Đã trả"
                            color={PALETTE.gold}
                            height={290}
                        />
                    )}
                </ChartBlock>

                <ChartBlock
                    title="Cơ cấu doanh thu theo gói"
                    hint="Tỷ trọng đóng góp của từng gói. Gói cao cấp thường ít người mua nhưng đóng góp lớn — nếu không phải vậy thì mức giá chưa hợp lý."
                >
                    {paidPackages.length === 0 ? (
                        <ReportEmpty label="Chưa có gói có phí nào bán được" />
                    ) : (
                        <DonutChart
                            data={paidPackages.map((p) => ({ name: p.name, value: p.revenue }))}
                            centerLabel="Tổng doanh thu"
                            height={290}
                        />
                    )}
                </ChartBlock>
            </div>

            <ChartBlock
                title="Lượt đã cấp so với lượt đã dùng"
                subtitle="Chỉ tính các tài khoản đã từng hỏi bài"
                hint="Cả hai cột chỉ tính nhóm đã kích hoạt, không tính hàng trăm tài khoản được tặng lượt nhưng chưa bao giờ mở tính năng."
            >
                <BarGroupChart
                    data={data.creditFlow}
                    xKey="month"
                    money={false}
                    height={290}
                    series={[
                        { key: 'granted', name: 'Lượt đã cấp', color: PALETTE.navy },
                        { key: 'consumed', name: 'Lượt đã dùng', color: PALETTE.emerald },
                    ]}
                />
            </ChartBlock>

            <DataTableShell
                title="Chi tiết gói AI"
                subtitle="Giá, số lượt cấp và doanh số từng gói"
            >
                <table className="rev-table">
                    <thead>
                        <tr>
                            <th>Gói</th>
                            <th className="rev-num">Giá</th>
                            <th className="rev-num">Số lượt cấp</th>
                            <th className="rev-num">Đã bán</th>
                            <th className="rev-num">Doanh thu</th>
                            <th className="rev-num">Đơn giá/lượt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.packages.map((p) => (
                            <tr key={p.packageId}>
                                <td>
                                    <strong>{p.name}</strong>
                                </td>
                                <td className="rev-num">
                                    {p.price === 0 ? '—' : money(p.price)}
                                </td>
                                <td className="rev-num">{count(p.creditAmount)}</td>
                                <td className="rev-num">{count(p.unitsSold)}</td>
                                <td className="rev-num rev-pos">
                                    {p.revenue === 0 ? '—' : money(p.revenue)}
                                </td>
                                <td className="rev-num">
                                    {p.price === 0 || p.creditAmount === 0
                                        ? '—'
                                        : money(Math.round(p.price / p.creditAmount))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3}>Tổng</td>
                            <td className="rev-num">
                                {count(data.packages.reduce((s, p) => s + p.unitsSold, 0))}
                            </td>
                            <td className="rev-num rev-pos">
                                {moneyVnd(data.packages.reduce((s, p) => s + p.revenue, 0))}
                            </td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </DataTableShell>
        </div>
    );
};

export default AiTab;
