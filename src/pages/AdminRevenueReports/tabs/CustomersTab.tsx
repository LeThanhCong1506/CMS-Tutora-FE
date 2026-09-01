import { count, growthBadge, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import { getCustomerRevenue } from '@/services/revenueReports.service';
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
    HeatmapChart,
    LineTrendChart,
} from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';

const CustomersTab = ({ range }: { range: RevenueRange }) => {
    const { data, loading, error, reload } = useRevenueReport(
        (r) => getCustomerRevenue(r, 50),
        range,
    );
    const parentPage = useClientPagination(data?.parents ?? []);

    if (loading) return <ReportSkeleton charts={3} splits={1} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    if (data.parents.length === 0) {
        return <ReportEmpty label="Chưa có khách hàng nào phát sinh giao dịch trong kỳ" />;
    }

    const c = data.summary;

    // Chỉ hiện phân khúc thực sự có giao dịch — tránh vẽ lát 0đ khi chưa có học sinh tự đặt.
    const activeSegments = (data.segments ?? []).filter(
        (s) => s.customers > 0 || s.totalSpent > 0,
    );

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
                    badgeVariant="blue"
                    hint="Số khách hàng phát sinh ít nhất một booking trong kỳ — gồm cả phụ huynh và học sinh tự đặt lịch. Người có tài khoản nhưng không đặt lịch không tính vào đây."
                />
                <MetricCard
                    icon="savings"
                    value={moneyVnd(c.avgBookingValue)}
                    label="Giá trị booking trung bình"
                    badge={growthBadge(c.avgBookingValue, c.avgBookingValuePrevious)}
                    badgeVariant="green"
                    hint="Số tiền trung bình khách trả cho mỗi lần đặt lịch. Tăng nghĩa là bán được gói nhiều buổi hơn hoặc giá gia sư cao hơn."
                />
                <MetricCard
                    icon="repeat"
                    value={`${c.repeatRate}%`}
                    label="Tỷ lệ tái mua"
                    badge={`${c.repeatRate >= c.repeatRatePrevious ? '▲' : '▼'} ${Math.abs(c.repeatRate - c.repeatRatePrevious).toFixed(1)}pp`}
                    badgeVariant="green"
                    hint="Phần trăm khách có từ 2 booking trở lên, tính trên toàn bộ lịch sử và KHÔNG phân biệt thời điểm — khách đặt nhiều lần trong cùng một tháng vẫn được tính. Vì vậy chỉ số này thường cao hơn cột 'Quay lại tháng sau' ở biểu đồ bên dưới, vốn chỉ đếm khách nối tiếp sang tháng mới."
                />
                <MetricCard
                    icon="diversity_3"
                    value={moneyVnd(c.ltv)}
                    label="Giá trị vòng đời khách hàng"
                    badgeVariant="dark"
                    hint="Tổng tiền một khách hàng chi trung bình từ lúc bắt đầu tới nay. So với chi phí thu hút khách, con số này phải lớn hơn nhiều lần thì mới có lãi."
                />
            </div>

            {/* Hai thẻ phí dịch vụ đứng RIÊNG một hàng, không trộn vào dải chỉ số phía trên.
                Bốn thẻ trên đo TỆP KHÁCH (bao nhiêu người, chi bao nhiêu, quay lại bao nhiêu);
                hai thẻ này đo TIỀN CỦA SÀN thu từ tệp đó. Hai loại đơn vị khác nhau, để chung
                một hàng thì người đọc dễ cộng nhầm 534.844 với 26.250 như thể cùng một tổng. */}
            <div className="rev-metric-grid">
                <MetricCard
                    icon="verified"
                    value={moneyVnd(c.serviceFeeRecognised)}
                    label="Phí dịch vụ đã ghi nhận"
                    badgeVariant="green"
                    hint="5% phí dịch vụ khách trả thêm, phần ĐÃ thành tiền thật: khoá đã qua buổi học đầu tiên nên khoản phí này hết đường hoàn. Đây là MỘT trong hai nguồn của phí sàn 10% — nguồn còn lại là 5% cắt từ tiền gia sư, xem tab Gia sư."
                />
                <MetricCard
                    icon="hourglass_top"
                    value={moneyVnd(c.serviceFeePending)}
                    label="Phí dịch vụ đợi ghi nhận"
                    badgeVariant="orange"
                    hint="5% phí dịch vụ chưa thành tiền thật: khách chưa trả nốt, HOẶC đã trả mà buổi đầu chưa diễn ra — lúc đó khách huỷ vẫn được hoàn lại 100% kể cả phí này. Cộng với thẻ bên trái đúng bằng tổng phí dịch vụ của các lịch đặt trong kỳ."
                />
            </div>

            {/* Vành khuyên "Doanh thu theo phân khúc" đã BỎ.
                Nó chỉ có tối đa HAI lát (Phụ huynh / Học sinh) và đứng ngay cạnh một cái bảng
                vốn đã có cột "% doanh thu" — tức cùng một tỉ lệ, in hai lần, cách nhau 16px.
                Bảng thắng vì nó còn mang thêm số khách, LTV và tỷ lệ tái mua. Bỏ vành khuyên
                thì bảng chiếm trọn bề ngang và đọc thoải mái hơn. */}
            {activeSegments.length > 0 && (
                    <DataTableShell
                        title="Doanh thu theo phân khúc khách hàng"
                        subtitle="Phụ huynh nhạy giá và quan tâm kết quả thi cử; học sinh tự đặt thường chọn theo môn và phong cách gia sư. Nhóm nào đóng góp lớn hơn thì ngân sách marketing nên dồn về đó."
                    >
                        <table className="rev-table">
                            <thead>
                                <tr>
                                    <th>Phân khúc</th>
                                    <th className="rev-num">Khách</th>
                                    <th className="rev-num">Chi tiêu</th>
                                    <th className="rev-num">Phí DV đã ghi nhận</th>
                                    <th className="rev-num">Phí DV đợi ghi nhận</th>
                                    <th className="rev-num">Giá trị vòng đời</th>
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
                                        <td className="rev-num rev-pos">
                                            {money(s.serviceFeeRecognised)}
                                        </td>
                                        <td className="rev-num rev-warn">
                                            {money(s.serviceFeePending)}
                                        </td>
                                        <td className="rev-num">{money(s.ltv)}</td>
                                        <td className="rev-num">{s.repeatRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </DataTableShell>
            )}

            {/* Biểu đồ "Top 15 khách hàng theo chi tiêu" đã BỎ.
                Bảng "Khách hàng giá trị cao" ở cuối trang CHÍNH LÀ dữ liệu đó — cùng nguồn,
                cùng thứ tự giảm dần theo chi tiêu — chỉ khác là nó còn kèm 6 cột nữa và phân
                trang được. Vẽ lại 15 dòng đầu dưới dạng cột chỉ để đọc cùng một thứ tự hai lần. */}

            {/* Hai biểu đồ cùng theo dõi chất lượng tệp khách theo thời gian — một cái đo giá
                trị mỗi khách, một cái đo tỉ lệ khách quay lại. Ngang hàng nên cùng nằm trong
                `split`, chung một khung và một tiêu đề. */}
            <ChartBlock
                title="Chất lượng tệp khách theo thời gian"
                split={[
                    {
                        label: 'Doanh thu bình quân mỗi khách',
                        hint: 'Số này tăng nghĩa là bán được gói lớn hơn hoặc khách học nhiều hơn. Nếu số khách tăng mà nó giảm, nền tảng đang tăng trưởng bằng khách giá trị thấp.',
                        node: (
                            <LineTrendChart
                                data={data.arpuTrend}
                                xKey="month"
                                height={220}
                                series={[{ key: 'arpu', name: 'Bình quân mỗi khách', color: PALETTE.navy, area: true }]}
                            />
                        ),
                    },
                    {
                        label: 'Khách lần đầu so với khách quay lại',
                        hint: "Mỗi khách chỉ được đếm một lần trong tháng. 'Quay lại' nghĩa là tháng đầu tiên của họ nằm ở tháng TRƯỚC — khách đặt nhiều lần trong cùng tháng đầu vẫn tính là khách lần đầu, nên chỉ số này khác với card 'Tỷ lệ tái mua' (vốn chỉ cần từ 2 booking trở lên, bất kể thời điểm). Nền tảng khỏe mạnh là khi cột quay lại tăng dần qua các tháng.",
                        node: (
                            <BarGroupChart
                                data={data.newVsReturning}
                                xKey="month"
                                money={false}
                                stacked
                                height={220}
                                series={[
                                    { key: 'returning', name: 'Quay lại tháng sau', color: PALETTE.emerald },
                                    { key: 'newCustomers', name: 'Khách lần đầu', color: PALETTE.gold },
                                ]}
                            />
                        ),
                    },
                ]}
            />

            {/* Bảng giữ chân cần ÍT NHẤT hai cột tháng mới có nghĩa: cột "Tháng 0" theo định
                nghĩa luôn là 100%, nên một lưới một cột chỉ là một dải ô 100% — không đo được
                gì về việc giữ chân. Với mốc mặc định "30 ngày qua" thì `MonthBuckets` chỉ sinh
                đúng một tháng, tức đây là trạng thái THƯỜNG GẶP chứ không phải ca hiếm. Muốn
                xem giữ chân thì chọn mốc nhiều tháng. */}
            {cohortRows.length > 0 && cohortCols.length > 1 && (
                <ChartBlock
                    title="Giữ chân khách hàng"
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
                hint="Cho biết nền tảng đang sống bằng gói nhỏ hay gói lớn. Nếu phần lớn nằm ở khoảng thấp, cần xem lại chiến lược đóng gói khóa học."
            >
                <BarGroupChart
                    data={data.bookingValueDistribution}
                    xKey="range"
                    money={false}
                    height={240}
                    series={[{ key: 'count', name: 'Số booking', color: PALETTE.blue }]}
                />
            </ChartBlock>

            <DataTableShell
                title="Khách hàng giá trị cao"
                pagination={{
                    current: parentPage.page,
                    pageSize: parentPage.pageSize,
                    total: parentPage.total,
                    onChange: parentPage.setPage,
                }}
            >
                <table className="rev-table">
                    <thead>
                        <tr>
                            <th>Khách hàng</th>
                            <th>Loại</th>
                            <th>Học sinh</th>
                            <th className="rev-num">Tổng chi tiêu</th>
                            <th className="rev-num">Phí DV đã ghi nhận</th>
                            <th className="rev-num">Phí DV đợi ghi nhận</th>
                            <th className="rev-num">Booking</th>
                            <th className="rev-num">Buổi đã mua</th>
                            <th className="rev-num">Buổi đã học</th>
                            <th className="rev-num">Tiến độ</th>
                            <th>Lần đặt gần nhất</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parentPage.pageItems.map((p) => {
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
                                    <td className="rev-num rev-pos">{money(p.serviceFeeRecognised)}</td>
                                    <td className="rev-num rev-warn">{money(p.serviceFeePending)}</td>
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
                            <td className="rev-num rev-pos">
                                {moneyVnd(data.parents.reduce((s, p) => s + p.serviceFeeRecognised, 0))}
                            </td>
                            <td className="rev-num rev-warn">
                                {moneyVnd(data.parents.reduce((s, p) => s + p.serviceFeePending, 0))}
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
