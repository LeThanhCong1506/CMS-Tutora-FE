import { count, growthBadge, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import { getAiRevenue } from '@/services/revenueReports.service';
import type { RevenueRange } from '@/services/revenueReports.service';
import { useRevenueReport } from '@/hooks/useRevenueReport';
import { useClientPagination } from '@/hooks/useClientPagination';
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
import { PALETTE, rankHeight } from '@/components/shared/RevenueCharts/revenueChartTheme';

const AiTab = ({ range }: { range: RevenueRange }) => {
    const { data, loading, error, reload } = useRevenueReport((r) => getAiRevenue(r, 20), range);
    const packagePage = useClientPagination(data?.packages ?? []);

    if (loading) return <ReportSkeleton charts={2} splits={1} />;
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

    /**
     * Kỳ này có bán được gói nào không.
     *
     * Cụm ba khối phía doanh thu (biểu đồ theo thời gian, top người mua, cơ cấu gói) đều đọc
     * từ cùng một nguồn: các lượt mua trong kỳ. Không có lượt nào thì chúng lần lượt là một
     * đường thẳng dính đáy, một ô "chưa có ai mua" và một ô "chưa có gói nào bán được" — gần
     * 600px chiều cao để nói đúng một điều mà thẻ "Doanh thu AI kỳ này" ở trên đã nói bằng số 0.
     *
     * Nửa còn lại của tab (tỷ lệ kích hoạt, tỷ lệ sử dụng, lượt cấp/lượt dùng, bảng gói) vẫn
     * hiện: chúng nói về việc DÙNG credit, thứ vẫn diễn ra kể cả khi chưa ai trả tiền — và với
     * sản phẩm này thì đó mới là phần đang có dữ liệu thật.
     */
    const hasPaidSales = data.trend.some((t) => t.aiRevenue > 0) || a.revenue > 0;

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
                    badge={growthBadge(a.revenue, a.revenuePrevious)}
                    badgeVariant="green"
                    hint="Tổng tiền thu được từ bán gói AI. Chưa trừ chi phí từ API."
                />
                <MetricCard
                    icon="shopping_bag"
                    value={count(a.packagesSold)}
                    label="Gói đã bán"
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
                    hint="Phần trăm tài khoản được cấp lượt AI đã thực sự hỏi ít nhất một câu. Mọi tài khoản đều được tặng lượt khi đăng ký, nên đây là tỷ lệ người chịu dùng thử."
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
                        Đã cấp <strong>{count(a.creditsSold)}</strong> lượt AI, mới dùng{' '}
                        <strong>{count(a.creditsConsumed)}</strong>. Còn{' '}
                        <strong>{count(a.creditsOutstanding)}</strong> lượt phải phục vụ trong tương
                        lai, mỗi lượt đều tốn chi phí gọi API.
                    </p>
                </div>
            )}

            {hasPaidSales && (
            <ChartBlock
                title="Doanh thu AI theo thời gian"
                hint="Doanh thu từ AI giải bài tập. Tỷ trọng này tăng thì biên lợi nhuận chung của nền tảng cải thiện."
            >
                <LineTrendChart
                    data={data.trend}
                    xKey="month"
                    height={240}
                    series={[
                        { key: 'aiRevenue', name: 'Doanh thu AI', color: PALETTE.blue, area: true },
                    ]}
                />
            </ChartBlock>
            )}

            {/* Cả khối ẩn khi kỳ này chưa bán được gói nào — xem `hasPaidSales` ở trên. Khi có
                bán, hai ô vẫn nằm chung một khung để một ô rỗng lẻ không kéo cao cả hàng. */}
            {hasPaidSales && (
            <ChartBlock
                title="Ai mua gói AI, và mua gói nào"
                split={[
                    {
                        label: 'Top 5 người mua',
                        hint: 'Nhóm chi nhiều nhất cho sản phẩm AI.',
                        node:
                            topBuyers.length === 0 ? (
                                <ReportEmpty label="Chưa có ai mua gói AI trong kỳ" />
                            ) : (
                                <RankBarChart
                                    data={topBuyers}
                                    labelKey="label"
                                    valueKey="amountPaid"
                                    name="Đã trả"
                                    color={PALETTE.gold}
                                    height={rankHeight(topBuyers.length)}
                                />
                            ),
                    },
                    {
                        label: 'Cơ cấu theo gói',
                        hint: 'Tỷ trọng đóng góp của từng gói. Gói cao cấp thường ít người mua nhưng đóng góp lớn — nếu không phải vậy thì mức giá chưa hợp lý.',
                        node:
                            paidPackages.length === 0 ? (
                                <ReportEmpty label="Chưa có gói có phí nào bán được" />
                            ) : (
                                <DonutChart
                                    data={paidPackages.map((p) => ({
                                        name: p.name,
                                        value: p.revenue,
                                    }))}
                                    centerLabel="Tổng doanh thu"
                                    height={220}
                                />
                            ),
                    },
                ]}
            />
            )}

            <ChartBlock
                title="Lượt đã cấp so với lượt đã dùng"
                hint="Cả hai cột chỉ tính nhóm đã kích hoạt, không tính hàng trăm tài khoản được tặng lượt nhưng chưa bao giờ mở tính năng."
            >
                <BarGroupChart
                    data={data.creditFlow}
                    xKey="month"
                    money={false}
                    height={240}
                    series={[
                        { key: 'granted', name: 'Lượt đã cấp', color: PALETTE.navy },
                        { key: 'consumed', name: 'Lượt đã dùng', color: PALETTE.emerald },
                    ]}
                />
            </ChartBlock>

            <DataTableShell
                title="Chi tiết gói AI"
                pagination={{
                    current: packagePage.page,
                    pageSize: packagePage.pageSize,
                    total: packagePage.total,
                    onChange: packagePage.setPage,
                }}
            >
                <table className="rev-table">
                    <thead>
                        <tr>
                            <th>Gói</th>
                            <th className="rev-num">Giá</th>
                            <th className="rev-num">Số lượt cấp</th>
                            <th className="rev-num">Đã bán</th>
                            <th className="rev-num">Doanh thu</th>
                            <th className="rev-num">Giá mỗi lượt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {packagePage.pageItems.map((p) => (
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
