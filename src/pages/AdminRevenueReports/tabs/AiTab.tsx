import { useState } from 'react';
import { count, growthBadge, money, moneyVnd } from '@/utils/formatMoney';
import { matchesSearch } from '@/utils/vietnameseSearch';
import MetricCard from '../components/MetricCard';
import { FilterChips, SearchInput, SortSelect, TableToolbar } from '../components/TableToolbar';
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
import { LineTrendChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';
import type { AiPackageRow } from '@/types/revenueReports.types';

/**
 * Hai nhóm gói, đúng theo cột "Giá": gói bán tiền và gói tặng kèm khi đăng ký (giá 0, in ra
 * dấu "—"). Phân hoạch thật, và tách được là cần: gói miễn phí có `unitsSold` rất lớn nhưng
 * doanh thu bằng 0, nên nó luôn nằm lẫn trong bảng mà không đóng góp gì cho cột tiền.
 */
type PackageGroup = 'all' | 'paid' | 'free';

const PACKAGE_GROUPS: { key: PackageGroup; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'paid', label: 'Gói có phí' },
    { key: 'free', label: 'Gói miễn phí' },
];

type PackageSort = 'revenue' | 'units' | 'price' | 'credits';

const PACKAGE_SORTS: { key: PackageSort; label: string }[] = [
    { key: 'revenue', label: 'Doanh thu cao nhất' },
    { key: 'units', label: 'Bán chạy nhất' },
    { key: 'price', label: 'Giá cao nhất' },
    { key: 'credits', label: 'Nhiều lượt nhất' },
];

const PACKAGE_SORTERS: Record<PackageSort, (a: AiPackageRow, b: AiPackageRow) => number> = {
    revenue: (a, b) => b.revenue - a.revenue,
    units: (a, b) => b.unitsSold - a.unitsSold,
    price: (a, b) => b.price - a.price,
    credits: (a, b) => b.creditAmount - a.creditAmount,
};

/**
 * Lọc theo nhóm + từ khoá rồi sắp xếp. Nhận `undefined` vì hook phân trang chạy trước khi
 * dữ liệu về.
 *
 * `revenue` là mặc định vì đó đúng là thứ tự backend trả về (`OrderByDescending(Revenue)`) —
 * mở trang lên chưa đụng gì thì bảng không được tự đổi thứ tự.
 */
const selectPackages = (
    rows: AiPackageRow[] | undefined,
    group: PackageGroup,
    query: string,
    sort: PackageSort,
): AiPackageRow[] => {
    if (!rows) return [];

    let out = rows;
    if (group === 'paid') out = out.filter((p) => p.price > 0);
    if (group === 'free') out = out.filter((p) => p.price === 0);

    if (query.trim()) out = out.filter((p) => matchesSearch(query, p.name));

    return [...out].sort(PACKAGE_SORTERS[sort]);
};

const AiTab = ({ range }: { range: RevenueRange }) => {
    const [group, setGroup] = useState<PackageGroup>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<PackageSort>('revenue');
    const { data, loading, error, reload } = useRevenueReport((r) => getAiRevenue(r, 20), range);
    const allPackages = data?.packages;
    const packageRows = selectPackages(allPackages, group, query, sort);
    const packagePage = useClientPagination(packageRows);

    // Đếm trên TOÀN BỘ dữ liệu, không phải trên kết quả đã lọc — xem `ChipItem.count`.
    const groupCounts = {
        all: allPackages?.length ?? 0,
        paid: (allPackages ?? []).filter((p) => p.price > 0).length,
        free: (allPackages ?? []).filter((p) => p.price === 0).length,
    };

    if (loading) return <ReportSkeleton metrics={2} charts={1} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    const a = data.summary;

    if (a.revenue === 0 && a.creditsSold === 0) {
        return <ReportEmpty label="Chưa có giao dịch gói AI nào trong kỳ" />;
    }

    /**
     * Kỳ này có bán được gói nào không.
     *
     * Không có lượt mua nào thì biểu đồ doanh thu theo thời gian chỉ là một đường thẳng dính
     * đáy — 240px chiều cao để nói đúng điều mà thẻ "Doanh thu AI kỳ này" ở trên đã nói bằng
     * số 0. Bảng chi tiết gói thì vẫn hiện: nó nói về việc DÙNG credit, thứ vẫn diễn ra kể cả
     * khi chưa ai trả tiền.
     */
    const hasPaidSales = data.trend.some((t) => t.aiRevenue > 0) || a.revenue > 0;

    return (
        <div className="rev-stack">
            {/* `.rev-strip` — khuôn dùng chung cả 5 tab (thống nhất 01/09/2026).

                Hai thẻ "Tỷ lệ kích hoạt" và "Tỷ lệ sử dụng" đã bỏ cùng đợt: chúng đo mức độ
                DÙNG sản phẩm (bao nhiêu người mở tính năng, dùng hết bao nhiêu lượt), không
                phải tiền về bao nhiêu. `activatedUsers`, `activatedCreditsGranted`… vẫn còn
                trong response. */}
            <div className="rev-strip">
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

            {/* Hai khối đã BỎ 01/09/2026:
                  • "Ai mua gói AI, và mua gói nào" — nửa "Cơ cấu theo gói" trùng cột doanh thu
                    của bảng ngay dưới, nửa "Top 5 người mua" là xếp hạng người dùng chứ không
                    phải câu hỏi doanh thu của sàn.
                  • "Lượt đã cấp so với lượt đã dùng" — đo tiêu thụ lượt AI, thuộc phía chi phí
                    vận hành. `data.creditFlow` vẫn còn trong response. */}

            <DataTableShell
                title="Chi tiết gói AI"
                action={
                    <TableToolbar>
                        <FilterChips
                            ariaLabel="Lọc nhóm gói AI"
                            items={PACKAGE_GROUPS.map((g) => ({ ...g, count: groupCounts[g.key] }))}
                            value={group}
                            onChange={(key) => {
                                setGroup(key);
                                packagePage.setPage(1);
                            }}
                        />
                        <SearchInput
                            value={query}
                            placeholder="Tên gói…"
                            ariaLabel="Tìm trong danh sách gói AI"
                            onChange={(value) => {
                                setQuery(value);
                                packagePage.setPage(1);
                            }}
                        />
                        <SortSelect
                            items={PACKAGE_SORTS}
                            value={sort}
                            onChange={(key) => {
                                setSort(key);
                                packagePage.setPage(1);
                            }}
                        />
                    </TableToolbar>
                }
                pagination={{
                    current: packagePage.page,
                    pageSize: packagePage.pageSize,
                    total: packagePage.total,
                    onChange: packagePage.setPage,
                }}
            >
                {packageRows.length === 0 ? (
                    /* Khác ba tab kia: ReportEmpty ở đầu tab chỉ chặn ca "chưa bán được gói
                       nào", không đảm bảo mảng `packages` có phần tử — nên ở đây phải phân
                       biệt "chưa có gói nào" với "bộ lọc đang che hết". */
                    <ReportEmpty
                        label={
                            (allPackages?.length ?? 0) === 0
                                ? 'Chưa có gói AI nào'
                                : 'Không có gói nào khớp bộ lọc đang chọn'
                        }
                    />
                ) : (
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
                        {/* Cộng trên TẬP ĐANG LỌC, không phải trên toàn bộ dữ liệu — nếu không,
                            lọc riêng "Gói có phí" xong dòng tổng vẫn kể cả lượt cấp của gói miễn
                            phí, tức một con số không khớp dòng nào đang hiển thị. */}
                        <tfoot>
                            <tr>
                                <td colSpan={3}>
                                    {packageRows.length < (allPackages?.length ?? 0)
                                        ? 'Tổng (đã lọc)'
                                        : 'Tổng'}
                                </td>
                                <td className="rev-num">
                                    {count(packageRows.reduce((s, p) => s + p.unitsSold, 0))}
                                </td>
                                <td className="rev-num rev-pos">
                                    {moneyVnd(packageRows.reduce((s, p) => s + p.revenue, 0))}
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                )}
            </DataTableShell>
        </div>
    );
};

export default AiTab;
