import { useState } from 'react';
import { count, money, moneyVnd } from '@/utils/formatMoney';
import MetricCard from '../components/MetricCard';
import { getTutorRevenue } from '@/services/revenueReports.service';
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
import { RankBarChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE, rankHeight } from '@/components/shared/RevenueCharts/revenueChartTheme';
import type { TutorRevenueRow } from '@/types/revenueReports.types';

/**
 * Nhãn hiển thị của một gia sư, có phân biệt khi TRÙNG TÊN.
 *
 * Dữ liệu thật có 5 tài khoản cùng tên "LÊ THÀNH CÔNG" và 4 tài khoản "LÊ THÀNH NAM" — trên
 * biểu đồ xếp hạng chúng thành mấy vạch giống hệt nhau, không cách nào biết vạch nào là ai,
 * và trong bảng thì hai dòng khác người trông như một dòng bị lặp.
 *
 * Chỉ thêm hậu tố cho tên THỰC SỰ trùng: tên duy nhất giữ nguyên, không ai phải đọc thêm một
 * chuỗi id vô nghĩa. Bốn ký tự đầu của id là đủ để phân biệt và vẫn ngắn để lọt nhãn biểu đồ.
 */
const makeLabeller = (tutors: TutorRevenueRow[]) => {
    const seen = new Map<string, number>();
    tutors.forEach((t) => seen.set(t.tutorName, (seen.get(t.tutorName) ?? 0) + 1));
    return (t: TutorRevenueRow) =>
        (seen.get(t.tutorName) ?? 0) > 1
            ? `${t.tutorName} · ${t.tutorId.slice(0, 4)}`
            : t.tutorName;
};

/**
 * Ba chỉ tiêu xếp hạng. `escrowHeld` đã BỎ khỏi bộ chọn: nó là SỐ DƯ HIỆN TẠI của ví, không
 * thuộc khoảng thời gian nào, nên xếp hạng gia sư theo nó trong một trang có bộ lọc thời gian
 * là so hai thứ khác đơn vị đo. Tổng escrow toàn sàn vẫn còn ở thẻ chỉ số, và số của từng gia
 * sư vẫn còn ở cột "Giữ hộ" của bảng — chỗ nó thuộc về.
 */
type RankMetric = 'tutorFeeRevenue' | 'gmv' | 'sessionsDelivered';

const metricMeta: Record<
    RankMetric,
    { label: string; name: string; money: boolean; color: string; hint: string }
> = {
    tutorFeeRevenue: {
        label: 'Doanh thu từ phí gia sư',
        name: 'Phí gia sư',
        money: true,
        color: PALETTE.navy,
        hint: 'Phần doanh thu đến TỪ GIA SƯ này: 5% cắt từ tiền gia sư, của những buổi họ đã dạy xong trong kỳ. KHÔNG gồm 5% phí dịch vụ phụ huynh trả — nửa đó đến từ khách hàng nên nằm ở tab Khách hàng. Vì vậy tổng trang này nhỏ hơn "Doanh thu đã ghi nhận" ở tab Doanh thu, đúng bằng một nửa nguồn.',
    },
    gmv: {
        label: 'Tiền khách trả',
        name: 'Tiền khách trả',
        money: true,
        color: PALETTE.blue,
        hint: 'Tổng tiền phụ huynh trả cho gia sư này. Lớn hơn doanh thu khoảng 10 lần vì phần lớn chảy về gia sư.',
    },
    sessionsDelivered: {
        label: 'Số buổi đã dạy',
        name: 'Số buổi',
        money: false,
        color: PALETTE.emerald,
        hint: 'Số buổi đã dạy xong và được xác nhận. Đo năng suất chứ không đo giá trị — gia sư dạy nhiều buổi giá thấp vẫn xếp trên.',
    },
};

const TutorsTab = ({ range }: { range: RevenueRange }) => {
    const [metric, setMetric] = useState<RankMetric>('tutorFeeRevenue');
    const { data, loading, error, reload } = useRevenueReport(
        (r) => getTutorRevenue(r, 50),
        range,
    );
    const tutorPage = useClientPagination(data?.tutors ?? []);

    if (loading) return <ReportSkeleton charts={2} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!data) return null;

    if (data.tutors.length === 0) {
        return <ReportEmpty label="Chưa có gia sư nào phát sinh doanh thu trong kỳ" />;
    }

    const meta = metricMeta[metric];
    const labelOf = makeLabeller(data.tutors);

    // Lọc bỏ giá trị 0 trước khi cắt top 15: gia sư có lịch mà chưa dạy được buổi nào vẫn nằm
    // trong `tutors` (họ cần có mặt ở bảng chi tiết), nhưng trên biểu đồ XẾP HẠNG họ thành
    // những vạch dài bằng 0 nối đuôi nhau ở đáy — chiếm chỗ mà không xếp hạng gì cả. Số lượng
    // của họ đã được nói bằng chữ ở thẻ "Gia sư có doanh thu" rồi.
    const ranked = [...data.tutors]
        .filter((t) => (t[metric] as number) > 0)
        .sort((a, b) => (b[metric] as number) - (a[metric] as number))
        .slice(0, 15)
        .map((t) => ({ ...t, label: labelOf(t) }));

    // Chỉ xếp hạng gia sư ĐÃ DẠY ít nhất một buổi.
    //
    // `cancelRate = huỷ / (đã dạy + huỷ)`, nên người chưa dạy buổi nào mà có buổi bị huỷ luôn
    // ra tròn 100% — và vì bảng sắp giảm dần, ba cái 100% đó chiếm sạch đầu bảng. Người đọc
    // thấy "gia sư huỷ nhiều nhất" hoá ra là ba người chưa từng dạy, còn hai ca đáng lo thật
    // (52% trên 34 buổi, 56% trên 11 buổi) bị đẩy xuống dưới.
    //
    // Nhóm chưa dạy buổi nào đã được đếm bằng chữ ở thẻ "Gia sư có doanh thu" — đó mới là chỗ
    // của họ. Biểu đồ này trả lời câu khác: trong số người ĐANG dạy, ai hay huỷ.
    const cancelRanked = [...data.tutors]
        .filter((t) => t.cancelRate > 0 && t.sessionsDelivered > 0)
        .sort((a, b) => b.cancelRate - a.cancelRate)
        .slice(0, 12)
        .map((t) => ({ ...t, label: labelOf(t) }));

    return (
        <div className="rev-stack">
            <div className="rev-metric-grid">
                <MetricCard
                    icon="groups"
                    value={count(data.tutorsWithRevenue)}
                    label="Gia sư có doanh thu"
                    subLabel={
                        data.activeTutors > data.tutorsWithRevenue
                            ? `${count(data.activeTutors - data.tutorsWithRevenue)} gia sư có lịch nhưng chưa dạy được buổi nào`
                            : undefined
                    }
                    badgeVariant="blue"
                    hint="Số gia sư đã dạy xong và được xác nhận ít nhất một buổi trong kỳ. Gia sư có lịch nhưng buổi bị huỷ hết không tính vào đây."
                />
                <MetricCard
                    icon="payments"
                    value={moneyVnd(data.totalTutorFeeRevenue)}
                    label="Doanh thu từ phí gia sư"
                    badgeVariant="green"
                    hint="Tổng 5% cắt từ tiền gia sư, của các buổi đã dạy xong trong kỳ. Đây là MỘT trong hai nguồn của phí sàn 10%; nguồn còn lại là 5% phí dịch vụ phụ huynh trả, xem tab Khách hàng. Cộng hai nguồn mới ra 'Doanh thu đã ghi nhận' của tab Doanh thu."
                />
            </div>

            <ChartBlock
                title="Xếp hạng gia sư"
                hint={meta.hint}
                action={
                    <div className="rev-segmented" role="tablist" aria-label="Chỉ tiêu xếp hạng">
                        {(Object.keys(metricMeta) as RankMetric[]).map((k) => (
                            <button
                                key={k}
                                type="button"
                                role="tab"
                                aria-selected={metric === k}
                                className={metric === k ? 'is-active' : ''}
                                onClick={() => setMetric(k)}
                            >
                                {metricMeta[k].label}
                            </button>
                        ))}
                    </div>
                }
            >
                <RankBarChart
                    data={ranked}
                    labelKey="label"
                    valueKey={metric}
                    name={meta.name}
                    color={meta.color}
                    money={meta.money}
                    height={rankHeight(ranked.length)}
                />
            </ChartBlock>

            {/* Khối "Phân bố đội ngũ gia sư" đã BỎ (01/09/2026) — cả vành khuyên lẫn tán xạ.
                Cả hai đều cần một mạng lưới đủ lớn mới nói được điều gì, mà đây là trang admin
                đọc hằng ngày ở quy mô hiện tại.

                • Vành khuyên "Top 10 / 11-50 / Còn lại": dưới 10 gia sư thì cả sàn nằm gọn trong
                  lát đầu — một vòng tròn đặc 100% kèm hai mục chú giải bằng 0. Nó đã tự ẩn theo
                  `isSmallPool` từ trước, tức trên dữ liệu thật nó gần như chưa từng hiện.

                • Tán xạ "Năng suất mỗi buổi": trên dữ liệu thật 13 gia sư chỉ vẽ ra 6 chấm, vì
                  6 người trùng khít tại (1 buổi, 7.500đ) và 3 người chồng lên gốc toạ độ. Hai
                  trục của nó — số buổi và doanh thu mỗi buổi — vốn đã là hai cột trong bảng xếp
                  hạng chi tiết, nơi đọc được từng người thay vì một chấm gộp.

                Muốn dựng lại thì chờ mạng lưới đủ lớn để hai hình đó phân tách được. */}
            <ChartBlock
                title="Tỷ lệ hủy buổi theo gia sư"
                hint="Tỷ lệ buổi bị hủy hoặc vắng mặt trên tổng số buổi, sắp xếp giảm dần. Gia sư ở nhóm đầu vừa làm mất doanh thu vừa dễ dẫn tới khiếu nại. Chỉ tính gia sư đã dạy ít nhất một buổi — người chưa dạy buổi nào luôn ra 100% nên vào đây chỉ che mất các ca đáng lo thật; số lượng nhóm đó xem ở thẻ đầu trang."
            >
                <RankBarChart
                    data={cancelRanked}
                    labelKey="label"
                    valueKey="cancelRate"
                    name="Tỷ lệ hủy"
                    color={PALETTE.red}
                    percent
                    height={rankHeight(cancelRanked.length)}
                />
            </ChartBlock>

            <DataTableShell
                title="Bảng xếp hạng chi tiết"
                pagination={{
                    current: tutorPage.page,
                    pageSize: tutorPage.pageSize,
                    total: tutorPage.total,
                    onChange: tutorPage.setPage,
                }}
            >
                <table className="rev-table">
                    <thead>
                        <tr>
                            <th>Gia sư</th>
                            <th>Môn</th>
                            <th className="rev-num">Khách trả</th>
                            <th className="rev-num">Phí gia sư</th>
                            {/* Cột "Tỷ lệ giữ lại" (= Doanh thu ÷ Khách trả) đã BỎ 01/09/2026.
                                Hai số đó neo theo hai mốc khác nhau — "Khách trả" tính trên lịch
                                ĐẶT trong kỳ, "Doanh thu" tính trên buổi DẠY trong kỳ — nên tỷ lệ
                                giữa chúng không phải take rate của bất cứ thứ gì. Trên dữ liệu
                                thật nó ra 0,6%–9,5% trong khi phí sàn thực là 10%, tức cột này
                                đang nói sai về chính con số quan trọng nhất của mô hình kinh
                                doanh. Muốn có take rate thật thì phải so hai số CÙNG một tập
                                booking, không suy được từ hai cột đứng cạnh nhau ở đây. */}
                            <th className="rev-num">Gia sư nhận</th>
                            <th className="rev-num">Giữ hộ</th>
                            <th className="rev-num">Buổi</th>
                            {/* "Doanh thu/buổi" đã BỎ 01/09/2026: bằng đúng cột Doanh thu chia
                                cột Buổi, hai cột đứng ngay cạnh nhau trong cùng hàng. */}
                            <th className="rev-num">Tỷ lệ hủy</th>
                            <th className="rev-num">Khiếu nại</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tutorPage.pageItems.map((t) => (
                            <tr key={t.tutorId}>
                                <td>
                                    <strong>{labelOf(t)}</strong>
                                    <span className="rev-cell-sub">
                                        {t.rating > 0 ? `★ ${t.rating}` : 'Chưa có đánh giá'}
                                    </span>
                                </td>
                                <td>{t.subject}</td>
                                <td className="rev-num">{money(t.gmv)}</td>
                                <td className="rev-num rev-pos">{money(t.tutorFeeRevenue)}</td>
                                <td className="rev-num">{money(t.tutorEarnings)}</td>
                                <td className="rev-num rev-warn">{money(t.escrowHeld)}</td>
                                <td className="rev-num">{t.sessionsDelivered}</td>
                                <td className={`rev-num ${t.cancelRate > 5 ? 'rev-neg' : ''}`}>
                                    {t.cancelRate}%
                                </td>
                                <td className={`rev-num ${t.disputeCount > 1 ? 'rev-neg' : ''}`}>
                                    {t.disputeCount}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </DataTableShell>
        </div>
    );
};

export default TutorsTab;
