import { count, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import { getSubjectRevenue } from '@/services/revenueReports.service';
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
    DonutChart,
    HeatmapChart,
    LineTrendChart,
    RankBarChart,
} from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE, SERIES_COLORS, rankHeight } from '@/components/shared/RevenueCharts/revenueChartTheme';

const SubjectsTab = ({ range }: { range: RevenueRange }) => {
    const { data, loading, error, reload } = useRevenueReport(getSubjectRevenue, range);
    const subjectPage = useClientPagination(data?.subjects ?? []);

    if (loading) return <ReportSkeleton charts={3} splits={1} />;
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
                    hint="Tổng doanh thu đã ghi nhận trong kỳ, cộng theo tất cả môn học: phí phụ huynh (tính từ khi buổi đầu đã dạy) cộng phí gia sư của các buổi đã dạy."
                />
                <MetricCard
                    icon="trophy"
                    value={topSubject.subjectName}
                    label="Môn dẫn đầu"
                    subLabel={`${moneyVnd(topSubject.platformRevenue)}${totalRevenue > 0 ? ` · ${((topSubject.platformRevenue / totalRevenue) * 100).toFixed(0)}% doanh thu` : ''}`}
                    badgeVariant="blue"
                    hint="Môn mang lại nhiều doanh thu nhất. Nếu một môn chiếm quá nửa doanh thu thì nền tảng đang phụ thuộc rủi ro vào một sản phẩm duy nhất."
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
                    label="Doanh thu còn chờ"
                    subLabel={`${totalDeferred + totalRevenue > 0 ? ((totalDeferred / (totalDeferred + totalRevenue)) * 100).toFixed(0) : 0}% doanh thu đã bán chưa dạy`}
                    badgeVariant="orange"
                    hint="Doanh thu tạm tính của những buổi đã bán nhưng chưa dạy. Chỉ tính phần của Tutora, không gồm tiền thuộc về gia sư."
                />
            </div>

            {/* Hai lát cắt ngang hàng của cùng một câu hỏi "tiền đến từ đâu": theo môn và
                theo khối lớp. Gộp một khung, hai ô ngăn bằng kẻ dọc. */}
            <ChartBlock
                title="Doanh thu đến từ đâu"
                split={[
                    {
                        label: 'Theo môn học',
                        hint: 'Tỷ trọng từng môn trong tổng doanh thu. Nếu một môn chiếm quá nửa, nền tảng đang phụ thuộc rủi ro vào một sản phẩm duy nhất.',
                        node: (
                            <DonutChart
                                data={data.subjects.map((s) => ({
                                    name: s.subjectName,
                                    value: s.platformRevenue,
                                }))}
                                centerLabel="Tổng"
                                height={240}
                            />
                        ),
                    },
                    {
                        label: 'Theo khối lớp',
                        hint: 'Khối lớp nào chi nhiều nhất. Lớp cuối cấp thường chiếm tỷ trọng lớn do nhu cầu thi cử — nếu không phải vậy, có thể đang bỏ lỡ phân khúc.',
                        node: (
                            <RankBarChart
                                data={data.grades.map((g) => ({ ...g, label: g.gradeName }))}
                                labelKey="label"
                                valueKey="platformRevenue"
                                name="Doanh thu đã ghi nhận"
                                color={PALETTE.gold}
                                height={rankHeight(data.grades.length)}
                            />
                        ),
                    },
                ]}
            />

            {/* Ma trận chỉ có nghĩa khi có ÍT NHẤT hai môn và hai khối để bắt chéo. Một hàng
                hoặc một cột thì nó chỉ là biểu đồ cột được vẽ bằng ô màu — không nói thêm gì so
                với hai biểu đồ ngay trên, mà vẫn chiếm trọn một khung 220px. */}
            {subjectNames.length > 1 && gradeNames.length > 1 && (
                <ChartBlock
                    title="Ma trận môn học × khối lớp"
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
                    hint="Môn nào đang lên, môn nào chững lại. Đường đi ngang trong khi tổng doanh thu tăng nghĩa là môn đó đang mất thị phần nội bộ."
                >
                    <LineTrendChart
                        data={data.subjectTrend}
                        xKey="month"
                        height={240}
                        series={trendKeys.map((name, i) => ({
                            key: name,
                            name,
                            color: SERIES_COLORS[i % SERIES_COLORS.length],
                        }))}
                    />
                </ChartBlock>
            )}

            {/* Xếp hạng chỉ có nghĩa khi có nhiều hơn một môn để xếp. Một môn thì đây là một
                cái cột đơn độc, trong khi cột "Hoàn thành" của bảng cuối trang đã nói đúng con
                số đó. */}
            {data.subjects.length > 1 && (
            <ChartBlock
                title="Tỷ lệ hoàn thành theo môn"
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
                    height={rankHeight(data.subjects.length)}
                />
            </ChartBlock>
            )}

            <DataTableShell
                title="Chi tiết theo môn học"
                pagination={{
                    current: subjectPage.page,
                    pageSize: subjectPage.pageSize,
                    total: subjectPage.total,
                    onChange: subjectPage.setPage,
                }}
            >
                <table className="rev-table">
                    <thead>
                        <tr>
                            <th>Môn học</th>
                            <th className="rev-num">Khách trả</th>
                            <th className="rev-num">Doanh thu</th>
                            <th className="rev-num">Còn chờ</th>
                            <th className="rev-num">Booking</th>
                            <th className="rev-num">Buổi đã dạy</th>
                            <th className="rev-num">Giá trung bình</th>
                            <th className="rev-num">Hoàn thành</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjectPage.pageItems.map((s) => (
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
