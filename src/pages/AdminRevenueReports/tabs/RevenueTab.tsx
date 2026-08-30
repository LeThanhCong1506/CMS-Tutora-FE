import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/shared';
import { BOOKING_STATUS_MAP } from '@/pages/AdminBookings/bookingDisplay';
import { getRevenueOverview, getRevenueRecognition } from '@/services/revenueReports.service';
import type { RevenueRange } from '@/services/revenueReports.service';
import type { RevenueRecognitionResponse } from '@/types/revenueReports.types';
import { useRevenueReport } from '@/hooks/useRevenueReport';
import { useClientPagination } from '@/hooks/useClientPagination';
import { count, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import MoneySplit from '../components/MoneySplit';
import {
    ChartBlock,
    DataTableShell,
    ReportEmpty,
    ReportError,
} from '../components/ReportShell';
import ReportSkeleton from '../components/ReportSkeleton';
import BookingProgressCell from '../components/BookingProgressCell';
import { BarGroupChart, LineTrendChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';

type BookingRow = RevenueRecognitionResponse['bookingProgress'][number];
type SortKey = 'newest' | 'slowest' | 'pending';

const SORTS: { key: SortKey; label: string }[] = [
    { key: 'newest', label: 'Mới nhất' },
    { key: 'slowest', label: 'Dạy chậm nhất' },
    { key: 'pending', label: 'Treo nhiều tiền nhất' },
];

const ratioOf = (b: BookingRow) =>
    b.totalSessions > 0 ? b.deliveredSessions / b.totalSessions : 0;

/**
 * Ba cách đọc cùng một bảng: sổ doanh thu theo thứ tự mới nhất, "lịch nào đang đứng im", và
 * "chỗ nào còn treo nhiều tiền nhất". Nhận `undefined` vì hook phân trang chạy trước khi dữ
 * liệu về.
 */
const sortBookings = (rows: BookingRow[] | undefined, sort: SortKey): BookingRow[] => {
    if (!rows) return [];
    if (sort === 'slowest') return [...rows].sort((a, b) => ratioOf(a) - ratioOf(b));
    if (sort === 'pending') {
        const pending = (b: BookingRow) => b.contractedFee - b.recognisedFee;
        return [...rows].sort((a, b) => pending(b) - pending(a));
    }
    return rows;
};

/**
 * Trang doanh thu — gộp từ hai tab cũ "Tổng quan" và "Ghi nhận doanh thu".
 *
 * Hai tab đó kể một câu chuyện bị cắt đôi: tab này nói tiền vào bao nhiêu, tab kia nói bao nhiêu
 * trong đó đã thành doanh thu. Hệ quả là vài con số phải xuất hiện ở cả hai nơi, và người đọc
 * phải nhảy qua lại mới ghép được. Gộp xong thì mỗi con số chỉ còn đúng một chỗ.
 *
 * Năm khối bị bỏ trong lần gộp này, và lý do:
 *
 *   - "Cơ cấu doanh thu kỳ này" — biểu đồ tròn chỉ có hai lát, mà lát AI thường bằng 0. Doanh
 *     thu AI đã có nguyên một tab riêng.
 *   - "Giá trị giao dịch và tỷ lệ giữ lại" — chính chú thích của nó thừa nhận hai trục lệch mốc
 *     thời gian nên chỉ so được tương đối. Một biểu đồ tự nhận là không so được thì nên bỏ.
 *   - "Phễu chuyển đổi booking" — câu hỏi về bán hàng, không phải về doanh thu.
 *   - "Doanh thu ghi nhận được bao nhiêu phần" — khối chia tiền ở đầu trang đã nói đúng điều này.
 *   - Biểu đồ "Booking dừng sau đợt 1" — giữ lại con số vì đó mới là thứ để hành động, bỏ đường
 *     xu hướng; muốn biết cụ thể lịch nào thì đã có bảng ở cuối trang.
 */
const RevenueTab = ({ range }: { range: RevenueRange }) => {
    const overview = useRevenueReport(getRevenueOverview, range);
    const recognition = useRevenueReport(getRevenueRecognition, range);
    const [sort, setSort] = useState<SortKey>('newest');
    const bookingPage = useClientPagination(sortBookings(recognition.data?.bookingProgress, sort));

    // Trang lấy dữ liệu từ hai endpoint. Chỉ vẽ khi cả hai đã về, nếu không các con số ở đầu
    // trang và bảng bên dưới sẽ mô tả hai khoảng thời gian khác nhau trong chốc lát.
    const loading = overview.loading || recognition.loading;
    const error = overview.error || recognition.error;
    const reload = () => {
        overview.reload();
        recognition.reload();
    };

    if (loading) return <ReportSkeleton charts={3} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!overview.data || !recognition.data) return null;

    const data = recognition.data;
    const s = overview.data.summary;
    const st = data.stalled;
    const rf = data.refunds;
    const ns = data.neverStarted;

    // Nhóm "chưa học buổi nào" chỉ ghép vào khi lớn hơn 0 — một chỉ số rủi ro luôn bằng 0 chỉ
    // tổ chiếm chỗ và làm loãng những con số có ý nghĩa.
    const stalledDetail = [
        `${st.dropOffRate}% số đã đặt cọc`,
        `mất ${moneyVnd(st.contractedFeeAtRisk)} hoa hồng`,
        ns.count > 0 ? `${count(ns.count)} lịch chưa học buổi nào` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <div className="rev-stack">
            <MoneySplit
                gmv={s.gmv}
                baseAmount={s.baseAmount}
                tutorReceivable={s.tutorReceivable}
                commissionSold={s.commissionSold}
                commissionEarned={s.commissionEarned}
                commissionFromCancelled={s.commissionFromCancelled}
            />

            {/* Hai thẻ này cố ý KHÔNG lặp lại con số nào có trong khối chia tiền phía trên. Cả
                trang bám một mốc duy nhất — booking tạo trong kỳ — nên không còn cảnh hai con số
                cùng mang chữ "doanh thu" đứng cạnh nhau mà tính theo hai mốc khác nhau. */}
            <div className="rev-metric-grid">
                <MetricCard
                    icon="undo"
                    value={moneyVnd(rf.amount)}
                    label="Đã hoàn tiền"
                    subLabel={`${count(rf.count)} lượt hoàn`}
                    badgeVariant="red"
                    hint={
                        // Câu cũ ghi "Hoa hồng Tutora ở trên chưa trừ khoản này", nghe như phải
                        // lấy hoa hồng trừ đi con số này. Sai đơn vị: đây là HỌC PHÍ GỘP trả lại
                        // khách, còn hoa hồng chỉ là 10% của học phí.
                        'Học phí trả lại cho phụ huynh hoặc học sinh do huỷ buổi, gia sư từ chối, '
                        + 'hoặc xử lý khiếu nại.\n\n'
                        + 'Đây là tiền học phí gộp, KHÔNG phải hoa hồng — đừng trừ thẳng vào Hoa '
                        + 'hồng Tutora ở trên. Hầu hết khoản này thuộc lịch đặt đã hủy, vốn đã bị '
                        + 'loại khỏi mọi con số phía trên nên cũng không có gì để trừ.'
                    }
                />
                <MetricCard
                    icon="running_with_errors"
                    value={count(st.count)}
                    label="Booking dừng sau đợt 1"
                    subLabel={stalledDetail}
                    badgeVariant="orange"
                    hint={
                        'Phụ huynh trả tiền buổi đầu, học đúng một buổi rồi không trả tiếp — chỗ '
                        + 'rò rỉ doanh thu lớn nhất của mô hình trả hai đợt.\n\n'
                        + 'Số hoa hồng ghi kèm là phần của những buổi đã bán mà sẽ không được dạy, '
                        + 'không phải tiền khách trả — và đã nằm sẵn trong phần chờ ghi nhận chứ '
                        + 'không cộng thêm.'
                    }
                />
            </div>

            <ChartBlock
                title="Doanh thu theo thời gian"
                hint="Đường liền là doanh thu thật, chỉ tính buổi đã dạy xong. Đường đứt là số sẽ ra nếu tính ngay lúc khách đặt lịch. Hai đường càng xa nhau thì phần doanh thu chưa được phép ghi nhận càng lớn."
            >
                <LineTrendChart
                    data={overview.data.trend}
                    xKey="month"
                    height={280}
                    series={[
                        {
                            key: 'recognised',
                            name: 'Hoa hồng buổi đã dạy',
                            color: PALETTE.emerald,
                            area: true,
                        },
                        {
                            key: 'contracted',
                            name: 'Nếu tính lúc đặt lịch',
                            color: PALETTE.amber,
                            dashed: true,
                        },
                    ]}
                />
            </ChartBlock>

            <div className="rev-grid-2">
                <ChartBlock
                    title="Doanh thu chờ ghi nhận theo thời gian"
                    hint="Khoản càng cũ càng đáng lo — khách trả tiền từ lâu mà chưa học xong thì khả năng cao sẽ đòi hoàn tiền. Đây là số cộng dồn toàn bộ booking dang dở, không lọc theo khoảng thời gian đang chọn."
                >
                    <BarGroupChart
                        data={data.deferredAging}
                        xKey="bucket"
                        height={280}
                        series={[{ key: 'amount', name: 'Giá trị', color: PALETTE.amber }]}
                    />
                </ChartBlock>

                <ChartBlock
                    title="Hoàn tiền theo thời gian"
                    hint="Tiền đã thu phải trả lại khách do huỷ buổi, gia sư từ chối hoặc xử lý khiếu nại. Cột tăng đều là dấu hiệu rò rỉ có hệ thống chứ không phải sự cố lẻ."
                >
                    <BarGroupChart
                        data={data.refundTrend}
                        xKey="month"
                        height={280}
                        series={[{ key: 'amount', name: 'Hoàn tiền', color: PALETTE.red }]}
                    />
                </ChartBlock>
            </div>

            <DataTableShell
                title="Doanh thu theo booking"
                subtitle="Tiến độ dạy và doanh thu của từng lịch. Bấm “Chi tiết” để xem tách phí phụ huynh và phí gia sư."
                action={
                    <div className="rev-segmented" role="tablist" aria-label="Cách sắp xếp">
                        {SORTS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="tab"
                                aria-selected={sort === item.key}
                                className={sort === item.key ? 'is-active' : ''}
                                onClick={() => {
                                    setSort(item.key);
                                    bookingPage.setPage(1);
                                }}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                }
                pagination={{
                    current: bookingPage.page,
                    pageSize: bookingPage.pageSize,
                    total: bookingPage.total,
                    onChange: bookingPage.setPage,
                }}
            >
                {data.bookingProgress.length === 0 ? (
                    <ReportEmpty label="Không có booking nào phát sinh doanh thu" />
                ) : (
                    <table className="rev-table">
                        <thead>
                            <tr>
                                <th>Booking</th>
                                <th>Khách hàng</th>
                                <th>Gia sư</th>
                                <th>Môn</th>
                                <th>Trạng thái</th>
                                <th>Tiến độ</th>
                                <th className="rev-num">Hoa hồng Tutora</th>
                                <th className="rev-num">Đã dạy xong</th>
                                <th className="rev-num">Còn chờ</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {bookingPage.pageItems.map((b) => {
                                const pending = b.contractedFee - b.recognisedFee;
                                return (
                                    <tr key={b.bookingId}>
                                        <td>
                                            <strong>#{b.bookingId}</strong>
                                            <span className="rev-cell-sub">
                                                {b.createdAt ? b.createdAt.slice(0, 10) : '—'}
                                            </span>
                                        </td>
                                        <td>{b.parentName}</td>
                                        <td>{b.tutorName}</td>
                                        <td>{b.subject}</td>
                                        <td>
                                            <StatusBadge
                                                variant={BOOKING_STATUS_MAP[b.status]?.variant ?? 'neutral'}
                                                shape="tag"
                                            >
                                                {BOOKING_STATUS_MAP[b.status]?.label ?? b.status}
                                            </StatusBadge>
                                        </td>
                                        <td>
                                            <BookingProgressCell
                                                delivered={b.deliveredSessions}
                                                total={b.totalSessions}
                                            />
                                        </td>
                                        <td className="rev-num">{money(b.contractedFee)}</td>
                                        <td className="rev-num rev-pos">{money(b.recognisedFee)}</td>
                                        <td className="rev-num rev-warn">
                                            {pending > 0 ? money(pending) : '—'}
                                        </td>
                                        <td>
                                            <Link
                                                to={`/admin-portal/bookings/${b.bookingId}`}
                                                className="rev-detail-link"
                                            >
                                                Chi tiết
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={6}>Tổng {data.bookingProgress.length} booking</td>
                                <td className="rev-num">
                                    {moneyVnd(
                                        data.bookingProgress.reduce((x, b) => x + b.contractedFee, 0),
                                    )}
                                </td>
                                <td className="rev-num rev-pos">
                                    {moneyVnd(
                                        data.bookingProgress.reduce((x, b) => x + b.recognisedFee, 0),
                                    )}
                                </td>
                                <td className="rev-num rev-warn">
                                    {moneyVnd(
                                        data.bookingProgress.reduce(
                                            (x, b) => x + (b.contractedFee - b.recognisedFee),
                                            0,
                                        ),
                                    )}
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

export default RevenueTab;
