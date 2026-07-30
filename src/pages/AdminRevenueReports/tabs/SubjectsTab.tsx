import { count, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import { getSubjectRevenue } from '@/services/revenueReports.service';
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
    DonutChart,
    HeatmapChart,
    LineTrendChart,
    RankBarChart,
} from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE, SERIES_COLORS } from '@/components/shared/RevenueCharts/revenueChartTheme';

const SubjectsTab = ({ range }: { range: RevenueRange }) => {
    const { data, loading, error, reload } = useRevenueReport(getSubjectRevenue, range);

    if (loading) return <ReportSkeleton charts={4} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    if (data.subjects.length === 0) {
        return <ReportEmpty label="Chưa có môn học nào phát sinh doanh thu trong kỳ" />;
    }

    const totalRevenue = data.subjects.reduce((s, x) => s + x.platformRevenue, 0);
    const totalDeferred = data.subjects.reduce((s, x) => s + x.deferredRevenue, 0);
    const topSubject = data.subjects[0];
    const topGrade = data.grades[0];

    const subjectNames = data.subjects.map((s) => s.subjectName);
    const gradeNames = [...new Set(data.matrix.map((c) => c.grade))];
    const matrixLookup = new Map(
        data.matrix.map((c) => [`${c.subject}|${c.grade}`, c.revenue]),
    );

    // Chuỗi cho line chart lấy từ key của phần tử trend, bỏ 'month'
    const trendKeys = data.subjectTrend.length > 0
        ? Object.keys(data.subjectTrend[0]).filter((k) => k !== 'month')
        : [];

    return (
        <div className="rev-stack">
            <div className="rev-metric-grid">
                <MetricCard
                    icon="category"
                    value={moneyVnd(totalRevenue)}
                    label="Doanh thu theo môn"
                    subLabel={`${data.subjects.length} môn đang có giao dịch`}
                    badgeVariant="green"
                    hint="Tổng hoa hồng nền tảng thu được từ các buổi đã dạy, cộng theo tất cả môn học trong kỳ."
                />
                <MetricCard
                    icon="trophy"
                    value={topSubject.subjectName}
                    label="Môn dẫn đầu"
                    subLabel={`${moneyVnd(topSubject.platformRevenue)}${totalRevenue > 0 ? ` · ${((topSubject.platformRevenue / totalRevenue) * 100).toFixed(0)}% doanh thu` : ''}`}
                    badgeVariant="blue"
                    hint="Môn mang lại nhiều hoa hồng nhất. Nếu một môn chiếm quá nửa doanh thu thì nền tảng đang phụ thuộc rủi ro vào một sản phẩm duy nhất."
                />
                {topGrade && (
                    <MetricCard
                        icon="school"
                        value={topGrade.gradeName}
                        label="Khối lớp dẫn đầu"
                        subLabel={`${moneyVnd(topGrade.platformRevenue)} · ${count(topGrade.bookings)} booking`}
                        badgeVariant="dark"
                        hint="Khối lớp chi nhiều tiền nhất. Lớp cuối cấp thường dẫn đầu do nhu cầu thi cử — nếu không phải vậy, có thể đang bỏ lỡ phân khúc."
                    />
                )}
                <MetricCard
                    icon="account_balance"
                    value={moneyVnd(totalDeferred)}
                    label="Nợ dịch vụ chưa thực hiện"
                    subLabel={`${totalDeferred + totalRevenue > 0 ? ((totalDeferred / (totalDeferred + totalRevenue)) * 100).toFixed(0) : 0}% hoa hồng đã bán chưa dạy`}
                    badgeVariant="orange"
                    hint="Hoa hồng của những buổi đã bán nhưng chưa dạy — nghĩa vụ nền tảng còn phải thực hiện. Chỉ tính phần hoa hồng, không gồm tiền thuộc về gia sư, nên đây không phải GMV trừ doanh thu."
                />
            </div>

            <div className="rev-grid-2">
                <ChartBlock
                    title="Cơ cấu doanh thu theo môn"
                    subtitle="Tỷ trọng hoa hồng nền tảng"
                    hint="Tỷ trọng từng môn trong tổng doanh thu. Nếu một môn chiếm quá nửa, nền tảng đang phụ thuộc rủi ro vào một sản phẩm duy nhất."
                >
                    <DonutChart
                        data={data.subjects.map((s) => ({
                            name: s.subjectName,
                            value: s.platformRevenue,
                        }))}
                        centerLabel="Tổng"
                        height={300}
                    />
                </ChartBlock>

                <ChartBlock
                    title="Doanh thu theo khối lớp"
                    hint="Khối lớp nào chi nhiều nhất. Lớp cuối cấp thường chiếm tỷ trọng lớn do nhu cầu thi cử — nếu không phải vậy, có thể đang bỏ lỡ phân khúc."
                >
                    <RankBarChart
                        data={data.grades.map((g) => ({ ...g, label: g.gradeName }))}
                        labelKey="label"
                        valueKey="platformRevenue"
                        name="Doanh thu nền tảng"
                        color={PALETTE.gold}
                        height={300}
                    />
                </ChartBlock>
            </div>

            {gradeNames.length > 0 && (
                <ChartBlock
                    title="Ma trận môn học × khối lớp"
                    subtitle="Ô càng đậm là ngách kiếm tiền càng tốt"
                    hint="Giao điểm giữa môn và khối lớp. Ô sáng nhất là ngách nên tập trung nguồn lực. Ô trống là khoảng trống thị trường — có thể do thiếu gia sư chứ không phải không có nhu cầu."
                >
                    <HeatmapChart
                        rows={subjectNames}
                        cols={gradeNames}
                        height={Math.max(220, subjectNames.length * 44 + 70)}
                        valueAt={(r, c) => matrixLookup.get(`${r}|${c}`) ?? 0}
                    />
                </ChartBlock>
            )}

            {trendKeys.length > 0 && (
                <ChartBlock
                    title="Xu hướng doanh thu theo môn"
                    subtitle="Theo khoảng thời gian đang chọn"
                    hint="Môn nào đang lên, môn nào chững lại. Đường đi ngang trong khi tổng doanh thu tăng nghĩa là môn đó đang mất thị phần nội bộ."
                >
                    <LineTrendChart
                        data={data.subjectTrend}
                        xKey="month"
                        height={320}
                        series={trendKeys.map((name, i) => ({
                            key: name,
                            name,
                            color: SERIES_COLORS[i % SERIES_COLORS.length],
                        }))}
                    />
                </ChartBlock>
            )}

            <ChartBlock
                title="Tỷ lệ hoàn thành theo môn"
                subtitle="Buổi đã dạy trên tổng buổi đã bán"
                hint="Môn tỷ lệ thấp là môn khách hay bỏ dở. Vừa tạo nợ dịch vụ vừa là dấu hiệu chất lượng giảng dạy hoặc kỳ vọng bị lệch."
            >
                <RankBarChart
                    data={[...data.subjects]
                        .sort((a, b) => a.completionRate - b.completionRate)
                        .map((s) => ({ ...s, label: s.subjectName }))}
                    labelKey="label"
                    valueKey="completionRate"
                    name="Tỷ lệ hoàn thành"
                    color={PALETTE.emerald}
                    percent
                    height={Math.max(220, data.subjects.length * 52 + 60)}
                />
            </ChartBlock>

            <DataTableShell
                title="Chi tiết theo môn học"
                subtitle="Giá trung bình và tỷ lệ thực hiện"
            >
                <table className="rev-table">
                    <thead>
                        <tr>
                            <th>Môn học</th>
                            <th className="rev-num">GMV</th>
                            <th className="rev-num">Doanh thu NT</th>
                            <th className="rev-num">Nợ dịch vụ</th>
                            <th className="rev-num">Booking</th>
                            <th className="rev-num">Buổi đã dạy</th>
                            <th className="rev-num">Giá TB/buổi</th>
                            <th className="rev-num">Hoàn thành</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.subjects.map((s) => (
                            <tr key={s.subjectId}>
                                <td>
                                    <strong>{s.subjectName}</strong>
                                </td>
                                <td className="rev-num">{money(s.gmv)}</td>
                                <td className="rev-num rev-pos">{money(s.platformRevenue)}</td>
                                <td className="rev-num rev-warn">{money(s.deferredRevenue)}</td>
                                <td className="rev-num">{s.bookings}</td>
                                <td className="rev-num">{s.sessionsDelivered}</td>
                                <td className="rev-num">{money(s.avgPricePerSession)}</td>
                                <td
                                    className={`rev-num ${s.completionRate < 75 ? 'rev-warn' : 'rev-pos'}`}
                                >
                                    {s.completionRate}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>Tổng</td>
                            <td className="rev-num">
                                {moneyVnd(data.subjects.reduce((x, s) => x + s.gmv, 0))}
                            </td>
                            <td className="rev-num rev-pos">{moneyVnd(totalRevenue)}</td>
                            <td className="rev-num rev-warn">{moneyVnd(totalDeferred)}</td>
                            <td className="rev-num">
                                {data.subjects.reduce((x, s) => x + s.bookings, 0)}
                            </td>
                            <td className="rev-num">
                                {data.subjects.reduce((x, s) => x + s.sessionsDelivered, 0)}
                            </td>
                            <td colSpan={2} />
                        </tr>
                    </tfoot>
                </table>
            </DataTableShell>
        </div>
    );
};

export default SubjectsTab;
