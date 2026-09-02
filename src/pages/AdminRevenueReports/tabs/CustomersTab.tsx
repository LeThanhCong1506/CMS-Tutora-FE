import { useState } from 'react';
import { growthBadge, money, moneyVnd } from '@/utils/formatMoney';
import { matchesSearch } from '@/utils/vietnameseSearch';
import MetricCard from '../components/MetricCard';
import { FilterChips, SearchInput, SortSelect, TableToolbar } from '../components/TableToolbar';
import { PersonName } from '../components/PersonName';
import { findDuplicateNames } from '../components/personIdentity';
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
import { LineTrendChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';
import type { ParentRevenueRow } from '@/types/revenueReports.types';

/**
 * Hai nhóm khách, đúng bằng cột "Loại" của bảng: phụ huynh đặt cho con, và học sinh tự đặt
 * lịch (`Parentid = null` ở backend). Là phân hoạch thật nên hai chip con cộng lại bằng
 * chip "Tất cả".
 */
type CustomerGroup = 'all' | 'Phụ huynh' | 'Học sinh';

const CUSTOMER_GROUPS: { key: CustomerGroup; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'Phụ huynh', label: 'Phụ huynh' },
    { key: 'Học sinh', label: 'Học sinh' },
];

type CustomerSort = 'spent' | 'pending' | 'bookings' | 'progress' | 'recent';

const CUSTOMER_SORTS: { key: CustomerSort; label: string }[] = [
    { key: 'spent', label: 'Chi tiêu nhiều nhất' },
    { key: 'pending', label: 'Phí DV đợi ghi nhận nhiều nhất' },
    { key: 'bookings', label: 'Nhiều booking nhất' },
    { key: 'progress', label: 'Tiến độ học thấp nhất' },
    { key: 'recent', label: 'Đặt lịch gần đây nhất' },
];

/** Cùng công thức với cột "Tiến độ" của bảng — đổi ở đây thì phải đổi cả ở đó. */
const progressOf = (p: ParentRevenueRow) =>
    p.sessionsPurchased > 0 ? p.sessionsCompleted / p.sessionsPurchased : 0;

const CUSTOMER_SORTERS: Record<
    CustomerSort,
    (a: ParentRevenueRow, b: ParentRevenueRow) => number
> = {
    spent: (a, b) => b.totalSpent - a.totalSpent,
    pending: (a, b) => b.serviceFeePending - a.serviceFeePending,
    bookings: (a, b) => b.bookingCount - a.bookingCount,
    progress: (a, b) => progressOf(a) - progressOf(b),
    // Khách chưa có ngày đặt nào xuống cuối thay vì lên đầu: chuỗi rỗng so sánh nhỏ hơn mọi
    // ngày thật, nên phải quy về '' rồi đảo chiều mới ra đúng "gần đây nhất".
    recent: (a, b) => (b.lastBookingAt ?? '').localeCompare(a.lastBookingAt ?? ''),
};

/**
 * Lọc theo loại khách + từ khoá rồi sắp xếp. Nhận `undefined` vì hook phân trang chạy trước
 * khi dữ liệu về.
 *
 * `spent` là mặc định vì đó đúng là thứ tự backend trả về (`OrderByDescending(TotalSpent)`) —
 * mở trang lên chưa đụng gì thì bảng không được tự đổi thứ tự.
 */
const selectParents = (
    rows: ParentRevenueRow[] | undefined,
    group: CustomerGroup,
    query: string,
    sort: CustomerSort,
): ParentRevenueRow[] => {
    if (!rows) return [];

    let out = group === 'all' ? rows : rows.filter((p) => p.customerType === group);

    if (query.trim()) {
        out = out.filter((p) => matchesSearch(query, p.parentName, p.studentName, p.contact));
    }

    return [...out].sort(CUSTOMER_SORTERS[sort]);
};

const CustomersTab = ({ range }: { range: RevenueRange }) => {
    const [group, setGroup] = useState<CustomerGroup>('all');
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<CustomerSort>('spent');
    const { data, loading, error, reload } = useRevenueReport(
        (r) => getCustomerRevenue(r, 50),
        range,
    );
    const allParents = data?.parents;
    const parentRows = selectParents(allParents, group, query, sort);
    const parentPage = useClientPagination(parentRows);

    // Đếm trên TOÀN BỘ dữ liệu, không phải trên kết quả đã lọc — xem `ChipItem.count`.
    const groupCounts = {
        all: allParents?.length ?? 0,
        'Phụ huynh': (allParents ?? []).filter((p) => p.customerType === 'Phụ huynh').length,
        'Học sinh': (allParents ?? []).filter((p) => p.customerType === 'Học sinh').length,
    };

    if (loading) return <ReportSkeleton metrics={3} charts={1} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    if (data.parents.length === 0) {
        return <ReportEmpty label="Chưa có khách hàng nào phát sinh giao dịch trong kỳ" />;
    }

    const c = data.summary;

    // Trên toàn bộ khách của kỳ, không phải trang đang xem — xem PersonName.
    const dupNames = findDuplicateNames(
        data.parents.map((p) => ({ name: p.parentName, contact: p.contact })),
    );

    /* `data.segments`, `data.cohorts`, `data.newVsReturning` và
       `data.bookingValueDistribution` vẫn có trong response nhưng KHÔNG còn màn hình nào đọc
       (gỡ 01/09/2026 — lý do ở từng chỗ dưới). Đừng thêm lại chỉ vì thấy API có trường mà
       giao diện thiếu. */

    return (
        <div className="rev-stack">
            {/* Dải chỉ số dùng chung khuôn `.rev-strip` với cả bốn tab còn lại (thống nhất
                01/09/2026): MỘT thẻ trắng, các ô ngăn nhau bằng kẻ mảnh, tối đa 3 ô.

                Trước đây tab này có SÁU thẻ chia hai hàng `.rev-metric-grid`. Bốn thẻ đo tệp
                khách (số khách, tỷ lệ tái mua, giá trị vòng đời) và hai thẻ đo tiền của sàn —
                hai loại đơn vị, xếp thành hai hàng để khỏi cộng nhầm. Nay bỏ hẳn nhóm đo tệp
                khách: đây là báo cáo DOANH THU, còn số khách và tỷ lệ quay lại là câu hỏi
                marketing. Riêng "Giá trị vòng đời khách hàng" bỏ vì chính doc §1 đã ghi nó vô
                nghĩa khi chưa có chi phí thu hút khách (CAC quản lý ngoài hệ thống).

                Hai thẻ phí dịch vụ giờ đứng ĐẦU vì chúng mới là số của tab này — cộng với
                `TutorFeeRevenue` bên tab Gia sư ra đúng doanh thu đã ghi nhận (doc §2.0). */}
            <div className="rev-strip">
                <MetricCard
                    icon="verified"
                    value={moneyVnd(c.serviceFeeRecognised)}
                    label="Phí dịch vụ đã ghi nhận"
                    subLabel="của buổi dạy trong kỳ"
                    valueTone="recognised"
                    badgeVariant="green"
                    hint="5% phí dịch vụ khách trả thêm, phần ĐÃ thành tiền thật: khoá đã qua buổi học đầu tiên nên khoản phí này hết đường hoàn. Đây là MỘT trong hai nguồn của phí sàn 10% — nguồn còn lại là 5% cắt từ tiền gia sư, xem tab Gia sư."
                />
                <MetricCard
                    icon="hourglass_top"
                    value={moneyVnd(c.serviceFeePending)}
                    label="Phí dịch vụ đợi ghi nhận"
                    subLabel="của lịch đặt trong kỳ"
                    valueTone="pending"
                    badgeVariant="orange"
                    hint="5% phí dịch vụ chưa thành tiền thật: khách chưa trả nốt, HOẶC đã trả mà buổi đầu chưa diễn ra — lúc đó khách huỷ vẫn được hoàn lại 100% kể cả phí này. Với khoá ĐANG CHẠY, cộng hai thẻ ra đúng tổng phí dịch vụ của lịch đặt trong kỳ. Khoá đã đóng sổ thì vế chờ về 0, nên tổng hai thẻ nhỏ hơn phí theo hợp đồng đúng bằng phần đã mất."
                />
                <MetricCard
                    icon="savings"
                    value={moneyVnd(c.avgBookingValue)}
                    label="Giá trị booking trung bình"
                    badge={growthBadge(c.avgBookingValue, c.avgBookingValuePrevious)}
                    badgeVariant="green"
                    hint="Số tiền trung bình khách trả cho mỗi lần đặt lịch. Tăng nghĩa là bán được gói nhiều buổi hơn hoặc giá gia sư cao hơn."
                />
            </div>

            {/* Bảng "Doanh thu theo phân khúc khách hàng" (Phụ huynh / Học sinh) đã BỎ
               01/09/2026: nó mang Giá trị vòng đời và Tỷ lệ tái mua — hai chỉ số marketing vừa
               bị gỡ khỏi dải chỉ số — và phần doanh thu của nó thì bảng "Khách hàng giá trị
               cao" bên dưới đã nói chi tiết hơn theo từng khách. `data.segments` vẫn còn
               trong response. */}

            {/* Biểu đồ "Top 15 khách hàng theo chi tiêu" đã BỎ.
                Bảng "Khách hàng giá trị cao" ở cuối trang CHÍNH LÀ dữ liệu đó — cùng nguồn,
                cùng thứ tự giảm dần theo chi tiêu — chỉ khác là nó còn kèm 6 cột nữa và phân
                trang được. Vẽ lại 15 dòng đầu dưới dạng cột chỉ để đọc cùng một thứ tự hai lần. */}

            {/* Còn đúng MỘT biểu đồ: doanh thu bình quân mỗi khách theo thời gian.

                Trước đây đây là khối `split` hai biểu đồ, nửa còn lại là "Khách lần đầu so với
                khách quay lại". Bỏ nửa đó 01/09/2026 vì nó đếm NGƯỜI chứ không đo tiền — câu
                hỏi marketing, không phải câu hỏi doanh thu. `data.newVsReturning` vẫn còn trong
                response.

                Hai khối khác cũng bỏ cùng đợt:
                  • "Giữ chân khách hàng" (heatmap cohort) — đo tỉ lệ quay lại, và với mốc mặc
                    định 30 ngày thì nó chỉ sinh đúng một cột nên gần như luôn bị ẩn.
                  • "Phân bổ giá trị booking" — đo cơ cấu gói bán, phục vụ việc đóng gói khoá
                    học chứ không trả lời tiền về bao nhiêu.
                `data.cohorts` và `data.bookingValueDistribution` vẫn còn trong response. */}
            <ChartBlock
                title="Doanh thu bình quân mỗi khách"
                hint="Số này tăng nghĩa là bán được gói lớn hơn hoặc khách học nhiều hơn. Nếu số khách tăng mà nó giảm, nền tảng đang tăng trưởng bằng khách giá trị thấp."
            >
                <LineTrendChart
                    data={data.arpuTrend}
                    xKey="month"
                    height={240}
                    series={[{ key: 'arpu', name: 'Bình quân mỗi khách', color: PALETTE.navy, area: true }]}
                />
            </ChartBlock>

            <DataTableShell
                title="Khách hàng giá trị cao"
                action={
                    <TableToolbar>
                        <FilterChips
                            ariaLabel="Lọc theo loại khách hàng"
                            items={CUSTOMER_GROUPS.map((g) => ({
                                ...g,
                                count: groupCounts[g.key],
                            }))}
                            value={group}
                            onChange={(key) => {
                                setGroup(key);
                                parentPage.setPage(1);
                            }}
                        />
                        <SearchInput
                            value={query}
                            placeholder="Tên khách, tên học sinh…"
                            ariaLabel="Tìm trong danh sách khách hàng"
                            onChange={(value) => {
                                setQuery(value);
                                parentPage.setPage(1);
                            }}
                        />
                        <SortSelect
                            items={CUSTOMER_SORTS}
                            value={sort}
                            onChange={(key) => {
                                setSort(key);
                                parentPage.setPage(1);
                            }}
                        />
                    </TableToolbar>
                }
                pagination={{
                    current: parentPage.page,
                    pageSize: parentPage.pageSize,
                    total: parentPage.total,
                    onChange: parentPage.setPage,
                }}
            >
                {parentRows.length === 0 ? (
                    /* Ca cả kỳ không có khách nào đã chặn bằng ReportEmpty ở đầu tab, nên
                       tới đây chỉ còn một nghĩa: bộ lọc đang che hết. */
                    <ReportEmpty label="Không có khách hàng nào khớp bộ lọc đang chọn" />
                ) : (
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
                                            <PersonName
                                                name={p.parentName}
                                                contact={p.contact}
                                                duplicates={dupNames}
                                            />
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
                    </table>
                )}
            </DataTableShell>
        </div>
    );
};

export default CustomersTab;
