import { useState } from 'react';
import { money } from '@/utils/formatMoney';
import { matchesSearch } from '@/utils/vietnameseSearch';
import { FilterChips, SearchInput, SortSelect, TableToolbar } from '../components/TableToolbar';
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
    RankBarChart,
} from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE, rankHeight } from '@/components/shared/RevenueCharts/revenueChartTheme';
import type { SubjectRevenueRow } from '@/types/revenueReports.types';

/**
 * Hai nhóm môn học. Một môn có booking trong kỳ nhưng chưa dạy xong buổi nào thì mọi cột
 * doanh thu của nó bằng 0 trong khi cột "Còn chờ" vẫn có số — tách riêng để admin thấy ngay
 * đâu là môn đã bán được nhưng chưa chạy.
 *
 * Là phân hoạch thật, và `FilterChips` tự ẩn cả cụm khi mọi môn đều có doanh thu — trường
 * hợp thường gặp nhất, lúc đó thanh công cụ chỉ còn ô tìm và bộ sắp xếp.
 */
type SubjectGroup = 'all' | 'earning' | 'idle';

const SUBJECT_GROUPS: { key: SubjectGroup; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'earning', label: 'Có doanh thu' },
    { key: 'idle', label: 'Chưa có doanh thu' },
];

type SubjectSort = 'revenue' | 'gmv' | 'deferred' | 'bookings' | 'sessions' | 'completion';

const SUBJECT_SORTS: { key: SubjectSort; label: string }[] = [
    { key: 'revenue', label: 'Doanh thu cao nhất' },
    { key: 'gmv', label: 'Giá trị lịch đặt cao nhất' },
    { key: 'deferred', label: 'Còn chờ nhiều nhất' },
    { key: 'bookings', label: 'Nhiều booking nhất' },
    { key: 'sessions', label: 'Nhiều buổi đã dạy nhất' },
    { key: 'completion', label: 'Tỷ lệ hoàn thành thấp nhất' },
];

const SUBJECT_SORTERS: Record<
    SubjectSort,
    (a: SubjectRevenueRow, b: SubjectRevenueRow) => number
> = {
    revenue: (a, b) => b.platformRevenue - a.platformRevenue,
    gmv: (a, b) => b.gmv - a.gmv,
    deferred: (a, b) => b.deferredRevenue - a.deferredRevenue,
    bookings: (a, b) => b.bookings - a.bookings,
    sessions: (a, b) => b.sessionsDelivered - a.sessionsDelivered,
    completion: (a, b) => a.completionRate - b.completionRate,
};

/**
 * Lọc theo nhóm + từ khoá rồi sắp xếp. Nhận `undefined` vì hook phân trang chạy trước khi
 * dữ liệu về.
 *
 * `revenue` là mặc định vì đó đúng là thứ tự backend trả về
 * (`OrderByDescending(PlatformRevenue)`) — mở trang lên chưa đụng gì thì bảng không được tự
 * đổi thứ tự, và thẻ "Môn dẫn đầu" ở đầu trang đọc thẳng phần tử đầu của mảng gốc.
 */
const selectSubjects = (
    rows: SubjectRevenueRow[] | undefined,
    group: SubjectGroup,
    query: string,
    sort: SubjectSort,
): SubjectRevenueRow[] => {
    if (!rows) return [];

    let out = rows;
    if (group === 'earning') out = out.filter((s) => s.platformRevenue > 0);
    if (group === 'idle') out = out.filter((s) => s.platformRevenue === 0);

    if (query.trim()) out = out.filter((s) => matchesSearch(query, s.subjectName));

    return [...out].sort(SUBJECT_SORTERS[sort]);
};

const SubjectsTab = ({ range }: { range: RevenueRange }) => {
    const [group, setGroup] = useState<SubjectGroup>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<SubjectSort>('revenue');
    const { data, loading, error, reload } = useRevenueReport(getSubjectRevenue, range);
    const allSubjects = data?.subjects;
    const subjectRows = selectSubjects(allSubjects, group, query, sort);
    const subjectPage = useClientPagination(subjectRows);

    // Đếm trên TOÀN BỘ dữ liệu, không phải trên kết quả đã lọc — xem `ChipItem.count`.
    const groupCounts = {
        all: allSubjects?.length ?? 0,
        earning: (allSubjects ?? []).filter((s) => s.platformRevenue > 0).length,
        idle: (allSubjects ?? []).filter((s) => s.platformRevenue === 0).length,
    };

    if (loading) return <ReportSkeleton metrics={0} charts={1} splits={1} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    if (data.subjects.length === 0) {
        return <ReportEmpty label="Chưa có môn học nào phát sinh doanh thu trong kỳ" />;
    }

    const subjectNames = data.subjects.map((s) => s.subjectName);
    const gradeNames = [...new Set(data.matrix.map((c) => c.grade))];
    const matrixLookup = new Map(
        data.matrix.map((c) => [`${c.subject}|${c.grade}`, c.revenue]),
    );

    return (
        <div className="rev-stack">
            {/* Tab này KHÔNG có dải chỉ số — tab duy nhất trong cụm như vậy (02/09/2026).

                Hai thẻ cũ đã gỡ theo yêu cầu: "Doanh thu theo môn" (tổng doanh thu đã ghi nhận)
                và "Doanh thu còn chờ". Cả hai là số TOÀN KỲ, không phải số theo môn — tức chúng
                trả lời câu hỏi của tab Doanh thu chứ không phải của tab này, và đúng hai con số
                đó đã có ở tab Doanh thu rồi. Việc của tab này là bóc tách THEO MÔN, do biểu đồ
                và bảng bên dưới lo.

                Nếu sau này muốn có dải chỉ số trở lại cho khớp bốn tab kia, hãy đặt chỉ số THEO
                MÔN (ví dụ số môn có giao dịch, độ tập trung doanh thu vào môn dẫn đầu) — đừng
                dựng lại hai con số toàn kỳ này. */}

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

            {/* Hai khối đã BỎ 01/09/2026, cùng lý do "không trả lời câu hỏi tiền":
                  • "Xu hướng doanh thu theo môn" — đo thị phần nội bộ giữa các môn, và với mốc
                    mặc định 30 ngày thì mỗi đường chỉ có vài điểm.
                  • "Tỷ lệ hoàn thành theo môn" — đo chất lượng dạy/kỳ vọng, không phải doanh
                    thu; cột "Hoàn thành" của bảng ngay dưới đã mang đúng con số đó.
                `data.subjectTrend` và `completionRate` vẫn còn trong response. */}

            <DataTableShell
                title="Chi tiết theo môn học"
                action={
                    <TableToolbar>
                        <FilterChips
                            ariaLabel="Lọc nhóm môn học"
                            items={SUBJECT_GROUPS.map((g) => ({ ...g, count: groupCounts[g.key] }))}
                            value={group}
                            onChange={(key) => {
                                setGroup(key);
                                subjectPage.setPage(1);
                            }}
                        />
                        <SearchInput
                            value={query}
                            placeholder="Tên môn học…"
                            ariaLabel="Tìm trong danh sách môn học"
                            onChange={(value) => {
                                setQuery(value);
                                subjectPage.setPage(1);
                            }}
                        />
                        <SortSelect
                            items={SUBJECT_SORTS}
                            value={sort}
                            onChange={(key) => {
                                setSort(key);
                                subjectPage.setPage(1);
                            }}
                        />
                    </TableToolbar>
                }
                pagination={{
                    current: subjectPage.page,
                    pageSize: subjectPage.pageSize,
                    total: subjectPage.total,
                    onChange: subjectPage.setPage,
                }}
            >
                {subjectRows.length === 0 ? (
                    /* Ca cả kỳ không có môn nào đã chặn bằng ReportEmpty ở đầu tab, nên tới
                       đây chỉ còn một nghĩa: bộ lọc đang che hết. */
                    <ReportEmpty label="Không có môn học nào khớp bộ lọc đang chọn" />
                ) : (
                    <table className="rev-table">
                        <thead>
                            <tr>
                                <th>Môn học</th>
                                <th className="rev-num">Giá trị lịch đặt</th>
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
                    </table>
                )}
            </DataTableShell>
        </div>
    );
};

export default SubjectsTab;
