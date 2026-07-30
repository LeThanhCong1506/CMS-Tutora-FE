import { getRevenueRecognition } from '@/services/revenueReports.service';
import type { RevenueRange } from '@/services/revenueReports.service';
import { useRevenueReport } from '@/hooks/useRevenueReport';
import { count, growthBadge, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import {
    ChartBlock,
    DataTableShell,
    ReportEmpty,
    ReportError,
} from '../components/ReportShell';
import ReportSkeleton from '../components/ReportSkeleton';
import { BarGroupChart, RankBarChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';

const RecognitionTab = ({ range }: { range: RevenueRange }) => {
    const { data, loading, error, reload } = useRevenueReport(getRevenueRecognition, range);

    if (loading) return <ReportSkeleton charts={4} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    const s = data.summary;
    const st = data.stalled;
    const rf = data.refunds;
    const ns = data.neverStarted;

    const progressRows = data.bookingProgress.map((b) => ({
        ...b,
        label: `#${b.bookingId} · ${b.tutorName}`,
        progress: b.totalSessions > 0
            ? Math.round((b.deliveredSessions / b.totalSessions) * 100)
            : 0,
    }));

    return (
        <div className="rev-stack">
            <div className="rev-metric-grid">
                <MetricCard
                    icon="payments"
                    value={moneyVnd(s.cashCollected)}
                    label="Tiền mặt đã thu"
                    subLabel="Booking + AI, đã vào tài khoản"
                    badgeVariant="blue"
                    hint="Tổng tiền thực tế đã vào tài khoản trong kỳ, gồm cả phần sẽ trả cho gia sư. Đây là dòng tiền, không phải doanh thu của Tutora."
                />
                <MetricCard
                    icon="verified"
                    value={moneyVnd(s.recognisedRevenue)}
                    label="Doanh thu thực hiện"
                    subLabel="Hoa hồng của buổi đã dạy xong"
                    badgeVariant="green"
                    hint="Phần hoa hồng ứng với số buổi đã dạy và được xác nhận. Đây là con số Tutora thực sự kiếm được, đúng chuẩn kế toán."
                />
                <MetricCard
                    icon="pending_actions"
                    value={moneyVnd(s.deferredRevenue)}
                    label="Doanh thu chưa thực hiện"
                    subLabel="Nghĩa vụ dịch vụ chưa hoàn thành"
                    badgeVariant="orange"
                    hint="Hoa hồng của những buổi đã bán nhưng chưa dạy. Nếu ngừng hoạt động hôm nay thì đây là phần dịch vụ còn nợ khách."
                />
                <MetricCard
                    icon="undo"
                    value={moneyVnd(rf.amount)}
                    label="Hoàn tiền trong kỳ"
                    subLabel={`${count(rf.count)} lượt · ${rf.rateOfCash}% tiền mặt đã thu`}
                    badge={growthBadge(rf.amount, rf.amountPrevious)}
                    badgeVariant="red"
                    hint="Tiền đã thu rồi phải trả lại khách do huỷ buổi, gia sư từ chối hoặc xử lý khiếu nại. Đây là dòng tiền ÂM: doanh thu ở các thẻ bên trái chưa trừ khoản này. Tỷ lệ tăng dần là dấu hiệu chất lượng dịch vụ hoặc khâu ghép gia sư có vấn đề."
                />
                <MetricCard
                    icon="hourglass_disabled"
                    value={count(ns.count)}
                    label="Trả tiền nhưng chưa học"
                    subLabel={`${moneyVnd(ns.cashHeld)} nằm im · ${moneyVnd(ns.feeAtRisk)} hoa hồng`}
                    badgeVariant="orange"
                    hint={
                        'Khách đã trả tiền đợt 1 nhưng CHƯA học buổi nào, booking nằm im quá 14 ngày.\n\n'
                        + 'Khác với thẻ "Booking dừng sau đợt 1" bên cạnh: ở đây dịch vụ chưa từng bắt đầu — '
                        + 'thường do tắc khâu xếp lịch hoặc gia sư không nhận dạy, tức vấn đề từ phía nền tảng '
                        + 'chứ không phải khách bỏ cuộc.\n\n'
                        + 'Đây là nhóm dễ phát sinh yêu cầu hoàn tiền nhất và nên xử lý trước.'
                    }
                />
                <MetricCard
                    icon="running_with_errors"
                    value={count(st.count)}
                    label="Booking dừng sau đợt 1"
                    subLabel={`${st.dropOffRate}% booking đã đặt cọc · mất ${moneyVnd(st.contractedFeeAtRisk)} hoa hồng`}
                    badge={`${st.dropOffRate >= st.dropOffPrevious ? '▲' : '▼'} ${Math.abs(st.dropOffRate - st.dropOffPrevious).toFixed(1)}pp`}
                    badgeVariant="red"
                    hint={
                        'Khách trả tiền đợt 1, học ĐÚNG MỘT buổi (hết phần đã trả), rồi không trả tiếp — '
                        + 'chủ động dừng, huỷ, hoặc để quá hạn.\n\n'
                        + 'Không tính: khách chưa học buổi nào (xem thẻ bên cạnh), khách đã trả đợt 2 rồi mới bỏ dở, '
                        + 'gia sư từ chối nhận lớp — những ca đó có nguyên nhân khác và đã nằm ở thẻ Hoàn tiền '
                        + 'hoặc Doanh thu chưa thực hiện.\n\n'
                        + `Số tiền ${moneyVnd(st.contractedFeeAtRisk)} là HOA HỒNG NỀN TẢNG của những buổi đã bán mà sẽ không được dạy `
                        + '(đơn giá hoa hồng mỗi buổi × số buổi còn lại). Không phải tiền khách trả — số đó lớn hơn khoảng 10 lần.\n\n'
                        + 'Lưu ý khi cộng sổ: khoản này đã nằm SẴN trong thẻ "Doanh thu chưa thực hiện" bên trái, '
                        + 'là phần xấu nhất của khoản đó chứ không phải khoản cộng thêm.'
                    }
                />
            </div>

            <div className="rev-grid-2">
                <ChartBlock
                    title="Phân rã độ lệch doanh thu"
                    subtitle="Từ doanh thu ghi nhận sớm xuống doanh thu thực hiện"
                    hint="Cột đầu là hoa hồng của booking đặt trong kỳ. Cột cuối là hoa hồng của buổi đã dạy trong kỳ. Cột giữa là hiệu của hai cột đó — lưu ý đây KHÁC thẻ Chưa thực hiện ở tab Tổng quan, vốn là số luỹ kế toàn bộ lịch sử."
                >
                    <BarGroupChart
                        data={[
                            { stage: 'Ghi nhận sớm', value: s.contractedRevenue },
                            {
                                stage: 'Độ lệch',
                                value: Math.max(s.contractedRevenue - s.recognisedRevenue, 0),
                            },
                            { stage: 'Thực hiện', value: s.recognisedRevenue },
                        ]}
                        xKey="stage"
                        height={280}
                        series={[{ key: 'value', name: 'Giá trị', color: PALETTE.navy }]}
                    />
                </ChartBlock>

                <ChartBlock
                    title="Doanh thu chưa thực hiện theo tuổi nợ"
                    subtitle="Toàn bộ booking dang dở, không lọc theo kỳ"
                    hint="Khoản càng cũ càng đáng lo: khách trả tiền từ lâu mà chưa học xong, khả năng cao khóa học bị bỏ dở và sẽ phát sinh yêu cầu hoàn tiền. Đây là số dư luỹ kế tính tới cuối kỳ đang xem — gồm cả booking đặt từ những kỳ trước, nên đổi khoảng thời gian sẽ không làm đổi cơ cấu này nhiều."
                >
                    <BarGroupChart
                        data={data.deferredAging}
                        xKey="bucket"
                        height={280}
                        series={[{ key: 'amount', name: 'Giá trị', color: PALETTE.amber }]}
                    />
                </ChartBlock>
            </div>

            <ChartBlock
                title="Booking chết sau đợt 1 so với chuyển đổi thành công"
                subtitle="Phụ huynh trả tiền buổi đầu, học thử rồi không trả tiếp"
                hint="Chỉ số rò rỉ doanh thu quan trọng nhất của mô hình trả 2 đợt. Với cách tính hiện tại, những booking này vẫn được ghi nhận đủ 100% phí dù chỉ dạy 1 buổi."
            >
                <BarGroupChart
                    data={data.stalledTrend}
                    xKey="month"
                    money={false}
                    height={280}
                    series={[
                        { key: 'converted', name: 'Trả tiếp đợt 2', color: PALETTE.emerald },
                        { key: 'stalled', name: 'Dừng sau đợt 1', color: PALETTE.red },
                    ]}
                />
            </ChartBlock>

            <ChartBlock
                title="Hoàn tiền theo tháng"
                subtitle="Dòng tiền âm — tiền đã thu phải trả lại khách"
                hint="Khoản hoàn trả do huỷ buổi, gia sư từ chối hoặc xử lý khiếu nại. Các thẻ doanh thu phía trên CHƯA trừ khoản này, nên cần đọc kèm để biết doanh thu ròng thực tế. Cột tăng dần đều là dấu hiệu rò rỉ có hệ thống chứ không phải sự cố lẻ."
            >
                <BarGroupChart
                    data={data.refundTrend}
                    xKey="month"
                    height={280}
                    series={[{ key: 'amount', name: 'Hoàn tiền', color: PALETTE.red }]}
                />
            </ChartBlock>

            {progressRows.length > 0 && (
                <ChartBlock
                    title="Tiến độ thực hiện theo lịch học"
                    subtitle="Sắp xếp từ chậm nhất — nơi doanh thu bị ghi nhận sớm nhất"
                    hint="Phần trăm buổi đã dạy trên tổng buổi đã bán. Lịch học dưới 20% mà đã đặt từ lâu là dấu hiệu khóa học bị bỏ dở."
                >
                    <RankBarChart
                        data={progressRows.slice(0, 15)}
                        labelKey="label"
                        valueKey="progress"
                        name="Tiến độ"
                        color={PALETTE.blue}
                        percent
                        height={400}
                    />
                </ChartBlock>
            )}

            <DataTableShell
                title="Chi tiết booking chưa hoàn thành"
                subtitle="30 lịch học chậm nhất — đối chiếu doanh thu thực hiện với ghi nhận sớm"
            >
                {data.bookingProgress.length === 0 ? (
                    <ReportEmpty label="Không có booking nào đang dang dở" />
                ) : (
                    <table className="rev-table">
                        <thead>
                            <tr>
                                <th>Booking</th>
                                <th>Khách hàng</th>
                                <th>Gia sư</th>
                                <th>Môn</th>
                                <th className="rev-num">Buổi</th>
                                <th className="rev-num">Ghi nhận sớm</th>
                                <th className="rev-num">Thực hiện</th>
                                <th className="rev-num">Chưa thực hiện</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.bookingProgress.map((b) => {
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
                                        <td className="rev-num">
                                            {b.deliveredSessions}/{b.totalSessions}
                                        </td>
                                        <td className="rev-num">{money(b.contractedFee)}</td>
                                        <td className="rev-num rev-pos">
                                            {money(b.recognisedFee)}
                                        </td>
                                        <td className="rev-num rev-warn">
                                            {pending > 0 ? money(pending) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={5}>Tổng {data.bookingProgress.length} dòng trên</td>
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
                            </tr>
                        </tfoot>
                    </table>
                )}
            </DataTableShell>
        </div>
    );
};

export default RecognitionTab;
