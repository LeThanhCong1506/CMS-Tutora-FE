import { getRevenueOverview } from '@/services/revenueReports.service';
import type { RevenueRange } from '@/services/revenueReports.service';
import { useRevenueReport } from '@/hooks/useRevenueReport';
import { growthBadge, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import { ChartBlock, ReportError } from '../components/ReportShell';
import ReportSkeleton from '../components/ReportSkeleton';
import {
    ComboChart,
    DonutChart,
    FunnelChart,
    LineTrendChart,
} from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';

const OverviewTab = ({ range }: { range: RevenueRange }) => {
    const { data, loading, error, reload } = useRevenueReport(getRevenueOverview, range);

    if (loading) return <ReportSkeleton charts={4} table={false} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    const s = data.summary;
    const deliveryRatio = s.contractedRevenue > 0
        ? (s.recognisedRevenue / s.contractedRevenue) * 100
        : 0;

    // Take rate thực tế: doanh thu nền tảng ÷ GMV. Tụt dần nghĩa là đang tăng
    // trưởng bằng cách hy sinh biên lợi nhuận.
    const takeRate = data.trend.map((p) => ({
        month: p.month,
        gmv: p.gmv,
        takeRate: p.gmv > 0 ? Number((((p.contracted + p.aiRevenue) / p.gmv) * 100).toFixed(2)) : 0,
    }));

    return (
        <div className="rev-stack">
            <div className="rev-metric-grid">
                <MetricCard
                    icon="verified"
                    value={moneyVnd(s.recognisedRevenue)}
                    label="Doanh thu thực hiện"
                    subLabel="Hoa hồng của những buổi đã dạy"
                    badge={growthBadge(s.recognisedRevenue, s.recognisedPrevious)}
                    badgeVariant="green"
                    hint="Hoa hồng của những buổi học ĐÃ DẠY trong kỳ này, cộng doanh thu bán gói AI. Buổi có thể thuộc lịch đặt từ kỳ trước — tính theo ngày dạy, không theo ngày đặt. Đây là doanh thu đã hoàn thành nghĩa vụ dịch vụ, được ghi nhận theo VAS 14."
                />
                <MetricCard
                    icon="draft"
                    value={moneyVnd(s.contractedRevenue)}
                    label="Doanh thu ghi nhận sớm"
                    subLabel="Cách tính hiện tại của hệ thống"
                    badge={growthBadge(s.contractedRevenue, s.contractedPrevious)}
                    badgeVariant="dark"
                    hint="Toàn bộ hoa hồng của các lịch học ĐẶT trong kỳ này, tính ngay lúc đặt kể cả khi chưa dạy buổi nào, cộng doanh thu bán gói AI. Đây là cách trang Tài chính hiện tại đang tính — ghi nhận trước khi hoàn thành nghĩa vụ dịch vụ nên số thường cao hơn thực tế."
                />
                <MetricCard
                    icon="pending_actions"
                    value={moneyVnd(s.deferredRevenue)}
                    label="Doanh thu chưa thực hiện"
                    subLabel="Đã thu tiền nhưng chưa dạy"
                    badge={growthBadge(s.deferredRevenue, s.deferredPrevious)}
                    badgeVariant="orange"
                    hint="Số LUỸ KẾ: hoa hồng của mọi buổi đã thu tiền nhưng chưa dạy, gồm cả lịch từ các kỳ trước còn dang dở. Vì tính trên toàn bộ lịch sử nên không bằng hiệu của hai thẻ bên trái. Về kế toán đây là khoản người mua trả tiền trước — nghĩa vụ dịch vụ chưa hoàn thành."
                />
                <MetricCard
                    icon="currency_exchange"
                    value={moneyVnd(s.gmv)}
                    label="GMV — Tổng giá trị giao dịch"
                    subLabel="Tiền phụ huynh trả, không phải doanh thu"
                    badge={growthBadge(s.gmv, s.gmvPrevious)}
                    badgeVariant="blue"
                    hint="Tổng số tiền phụ huynh trả qua nền tảng. Phần lớn khoản này chảy về gia sư — Tutora chỉ giữ lại 10%. Dùng để đo quy mô, không dùng để đo lợi nhuận."
                />
            </div>

            {s.contractedRevenue > 0 && (
                <div className="rev-callout">
                    <span className="material-symbols-outlined">info</span>
                    <p>
                        Tỷ lệ thực hiện kỳ này đạt <strong>{deliveryRatio.toFixed(1)}%</strong> — trong
                        mỗi 100đ hoa hồng ghi nhận theo cách cũ, mới có {deliveryRatio.toFixed(0)}đ ứng
                        với buổi học đã thực dạy. Riêng thẻ <em>Doanh thu chưa thực hiện</em> là số luỹ
                        kế của toàn bộ lịch học đang dang dở tính tới hiện tại, nên không bằng đúng
                        hiệu của hai thẻ đầu.
                    </p>
                </div>
            )}

            <ChartBlock
                title="Doanh thu theo tháng — thực hiện so với ghi nhận sớm"
                subtitle="Khoảng cách hai đường là mức độ doanh thu bị ghi nhận sớm"
                hint="Đường liền: hoa hồng của những buổi đã dạy xong (chuẩn kế toán). Đường đứt: toàn bộ hoa hồng tính ngay khi đặt lịch (cách hệ thống đang dùng). Hai đường càng xa nhau, rủi ro thổi phồng doanh thu càng lớn."
            >
                <LineTrendChart
                    data={data.trend}
                    xKey="month"
                    height={310}
                    series={[
                        { key: 'recognised', name: 'Thực hiện (chuẩn)', color: PALETTE.emerald, area: true },
                        { key: 'contracted', name: 'Ghi nhận sớm', color: PALETTE.amber, dashed: true },
                        { key: 'aiRevenue', name: 'Doanh thu AI', color: PALETTE.blue },
                    ]}
                />
            </ChartBlock>

            <div className="rev-grid-2">
                <ChartBlock
                    title="Cơ cấu doanh thu kỳ này"
                    hint="Hoa hồng booking là 10% giá gốc (5% thu thêm từ phụ huynh + 5% cắt từ gia sư). Doanh thu AI là tiền bán gói credit, không chia cho ai nên biên lợi nhuận cao hơn nhiều."
                >
                    <DonutChart data={data.revenueMix} centerLabel="Tổng doanh thu" height={270} />
                </ChartBlock>

                <ChartBlock
                    title="GMV và tỷ lệ ăn chia thực tế"
                    subtitle="Take rate lý thuyết là 10%"
                    hint="Cột là tổng giá trị giao dịch. Đường là phần trăm Tutora giữ lại. Nếu đường tụt dần dù cột vẫn tăng, nghĩa là đang tăng trưởng bằng cách hy sinh biên lợi nhuận."
                >
                    <ComboChart
                        data={takeRate}
                        xKey="month"
                        barKey="gmv"
                        barName="GMV"
                        lineKey="takeRate"
                        lineName="Take rate (%)"
                        lineIsPercent
                        height={270}
                    />
                </ChartBlock>
            </div>

            <ChartBlock
                title="Phễu chuyển đổi booking"
                subtitle="Từ lúc gửi yêu cầu đến khi hoàn tất khóa học"
                hint="Mỗi bậc đếm booking đã đạt tới trạng thái đó hoặc xa hơn. Hover để xem tỷ lệ rơi so với bậc trước — bậc rơi mạnh nhất là điểm nghẽn cần xử lý."
            >
                <FunnelChart steps={data.bookingFunnel} height={330} />
            </ChartBlock>
        </div>
    );
};

export default OverviewTab;
