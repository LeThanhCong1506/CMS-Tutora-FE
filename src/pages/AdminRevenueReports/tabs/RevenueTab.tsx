import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '@/components/shared';
import { BOOKING_STATUS_MAP } from '@/pages/AdminBookings/bookingDisplay';
import { getRevenueOverview, getRevenueRecognition } from '@/services/revenueReports.service';
import type { RevenueRange } from '@/services/revenueReports.service';
import type { RevenueRecognitionResponse } from '@/types/revenueReports.types';
import { useRevenueReport } from '@/hooks/useRevenueReport';
import { useCommissionPercents } from '@/hooks/useCommissionPercents';
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
import { LineTrendChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';

type BookingRow = RevenueRecognitionResponse['bookingProgress'][number];
type SortKey = 'newest' | 'slowest' | 'pending' | 'refund';
type BucketKey = 'all' | 'running' | 'done' | 'cancelled';

const SORTS: { key: SortKey; label: string }[] = [
    { key: 'newest', label: 'Mới nhất' },
    { key: 'slowest', label: 'Dạy chậm nhất' },
    { key: 'pending', label: 'Treo nhiều tiền nhất' },
    { key: 'refund', label: 'Hoàn tiền nhiều nhất' },
];

/**
 * Ba nhóm trạng thái, không phải liệt kê 12 status thô của backend.
 *
 * Admin đọc bảng này để trả lời "khoá nào còn đang chạy / đã xong / đã chết và hoàn bao
 * nhiêu" — chứ không phân biệt `cancelled_by_staff` với `cancelled_by_dispute`, hai thứ đó
 * đã hiện ở cột Trạng thái rồi. Gộp thành 3 chip thì lọc được bằng một cú bấm.
 *
 * `payment_timeout` xếp CHUNG với nhóm huỷ: về mặt tiền thì nó cũng là một lịch chết, gom
 * riêng chỉ tạo thêm một chip mà admin phải bấm hai lần mới xem hết lịch hỏng.
 *
 * Nhóm "đã đóng" bám cờ `closed` của backend chứ KHÔNG bám status: khoá bị đóng giữa chừng
 * (gia sư bị đình chỉ, khách bỏ dở sau đợt 1) vẫn mang status `completed` trong khi escrow
 * đã chốt. Lọc theo status sẽ xếp nhầm chúng vào "đang chạy".
 */
const bucketOf = (b: BookingRow): Exclude<BucketKey, 'all'> => {
    if (b.status.startsWith('cancelled') || b.status === 'payment_timeout') return 'cancelled';
    return b.closed ? 'done' : 'running';
};

const BUCKETS: { key: BucketKey; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'running', label: 'Đang chạy' },
    { key: 'done', label: 'Đã đóng' },
    { key: 'cancelled', label: 'Huỷ / quá hạn' },
];

/** Bỏ dấu để gõ "nguyen" vẫn tìm ra "Nguyễn" — admin không gõ dấu khi tra nhanh. */
const norm = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0111/g, 'd').toLowerCase();

const ratioOf = (b: BookingRow) =>
    b.totalSessions > 0 ? b.deliveredSessions / b.totalSessions : 0;

/**
 * Lọc theo nhóm trạng thái + từ khoá, rồi sắp xếp. Nhận `undefined` vì hook phân trang chạy
 * trước khi dữ liệu về.
 */
const selectBookings = (
    rows: BookingRow[] | undefined,
    bucket: BucketKey,
    query: string,
    sort: SortKey,
): BookingRow[] => {
    if (!rows) return [];

    let out = bucket === 'all' ? rows : rows.filter((b) => bucketOf(b) === bucket);

    const q = norm(query.trim());
    if (q) {
        out = out.filter((b) =>
            String(b.bookingId).includes(q)
            || norm(b.parentName).includes(q)
            || norm(b.tutorName).includes(q)
            || norm(b.subject).includes(q));
    }

    if (sort === 'slowest') return [...out].sort((a, b) => ratioOf(a) - ratioOf(b));
    if (sort === 'pending') {
        /**
         * "Treo" chỉ có nghĩa với khoá CHƯA đóng sổ — tiền còn cơ hội về.
         *
         * Khoá đã đóng sổ cũng có chênh giữa hai cột doanh thu, nhưng đó là phần MẤT HẲN.
         * Không loại chúng ra thì bảng xếp một lịch đã huỷ mất 75.000 lên trên một lịch đang
         * chạy còn treo 60.000, trong khi chỉ cái sau mới là thứ đi đòi được.
         */
        const pending = (b: BookingRow) => (b.closed ? 0 : b.contractedFee - b.recognisedFee);
        return [...out].sort((a, b) => pending(b) - pending(a));
    }
    if (sort === 'refund') return [...out].sort((a, b) => b.refundedAmount - a.refundedAmount);
    return out;
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
    const [bucket, setBucket] = useState<BucketKey>('all');
    const [query, setQuery] = useState('');
    // Mức phí sàn admin đang đặt, không phải hằng số 5%/5% viết cứng trong giao diện.
    const percents = useCommissionPercents();
    const allRows = recognition.data?.bookingProgress;
    const rows = selectBookings(allRows, bucket, query, sort);
    const bookingPage = useClientPagination(rows);

    // Số dòng mỗi nhóm, đếm trên TOÀN BỘ dữ liệu chứ không phải trên kết quả đã lọc — chip
    // phải nói "nhóm này có bao nhiêu", nếu đếm sau khi lọc thì mọi chip không được chọn đều
    // hiện 0 và không ai bấm sang được nữa.
    const counts = { running: 0, done: 0, cancelled: 0 };
    for (const b of allRows ?? []) counts[bucketOf(b)] += 1;

    // Trang lấy dữ liệu từ hai endpoint. Chỉ vẽ khi cả hai đã về, nếu không các con số ở đầu
    // trang và bảng bên dưới sẽ mô tả hai khoảng thời gian khác nhau trong chốc lát.
    const loading = overview.loading || recognition.loading;
    const error = overview.error || recognition.error;
    const reload = () => {
        overview.reload();
        recognition.reload();
    };

    if (loading) return <ReportSkeleton hero metrics={3} charts={1} splits={0} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!overview.data || !recognition.data) return null;

    const data = recognition.data;
    const s = overview.data.summary;
    const st = data.stalled;
    const rf = data.refunds;
    const ns = data.neverStarted;

    /**
     * Chi tiết của "Booking dừng sau đợt 1" nằm trong tooltip, không in ra mặt thẻ.
     *
     * Chuỗi cũ ("52% số đã đặt cọc · mất 530,000 VND hoa hồng") dài tới mức tràn sang dòng
     * thứ hai và kéo cao cả dải ba thẻ, trong khi hai con số đó là thứ để TRA CỨU khi thắc
     * mắc chứ không phải để quét. Con số đáng hành động là số lịch, và nó vẫn đứng to ở giữa
     * thẻ.
     *
     * Mệnh đề "chưa học buổi nào" chỉ ghép vào khi lớn hơn 0 — một chỉ số rủi ro luôn bằng 0
     * chỉ tổ làm loãng câu.
     */
    const stalledHint =
        'Phụ huynh trả tiền buổi đầu, học đúng một buổi rồi không trả tiếp — chỗ rò rỉ doanh '
        + 'thu lớn nhất của mô hình trả hai đợt.\n\n'
        + `Chiếm ${st.dropOffRate}% số lịch đã qua được đợt 1, kéo theo `
        + `${moneyVnd(st.contractedFeeAtRisk)} doanh thu tạm tính của những buổi đã bán mà sẽ `
        + 'không được dạy.'
        + (ns.count > 0 ? ` Trong đó ${count(ns.count)} lịch chưa học buổi nào.` : '')
        // Câu cũ ghi khoản này "đã nằm sẵn trong phần còn chờ" — chỉ đúng một nửa. Nhóm dừng
        // sau đợt 1 có cả lịch đã bị hệ thống đóng khoá, và phần hụt của chúng nằm ở lát
        // "Không thu được" chứ không phải "Còn chờ". Điều cần nói là nó KHÔNG cộng thêm vào
        // đâu cả, nên nói đúng cả hai lát thay vì đoán bừa một lát.
        + '\n\nSố đó KHÔNG phải tiền khách trả. Nó đã nằm sẵn trong doanh thu tạm tính ở dưới — '
        + 'lát "Còn chờ" với lịch vẫn đang mở, lát "Không thu được" với lịch đã bị đóng khoá — '
        + 'nên đừng cộng thêm lần nữa.';

    /**
     * Một dòng thời gian duy nhất cho cả doanh thu lẫn hoàn tiền.
     *
     * `trend` và `refundTrend` đến từ HAI endpoint khác nhau. Cả hai cùng chia mốc bằng
     * `TimeBuckets(from, to)` ở backend nên nhãn tháng trùng nhau, nhưng vẫn nối theo NHÃN
     * chứ không theo chỉ số mảng: nếu một ngày nào đó hai endpoint lệch số mốc, nối theo
     * chỉ số sẽ gán tiền hoàn của tháng này sang tháng khác mà không có gì báo lỗi. Nối
     * theo nhãn thì trường hợp đó chỉ ra 0, sai kiểu nhìn thấy được.
     */
    const refundByMonth = new Map(data.refundTrend.map((r) => [r.month, r.amount]));
    const timeline = overview.data.trend.map((t) => ({
        ...t,
        refund: refundByMonth.get(t.month) ?? 0,
    }));

    return (
        <div className="rev-stack">
            {/* Dải chỉ số và thẻ phân bổ cố ý KHÔNG lặp con số của nhau: trên là các con số
                tổng, dưới là cách chúng được chia. Cả trang bám một mốc duy nhất — booking tạo
                trong kỳ — nên không còn cảnh hai con số cùng mang chữ "doanh thu" đứng cạnh
                nhau mà tính theo hai mốc khác nhau.

                Vì là hai nửa của MỘT câu, chúng nằm chung một khung (.rev-hero) và ngăn nhau
                bằng đúng một đường kẻ mảnh, thay vì hai khung trắng cách nhau 16px — cùng thủ
                pháp mà .rev-strip đã dùng để ngăn ba ô chỉ số bên trong nó. */}
            <section className="rev-hero">
                <div className="rev-strip">
                    <MetricCard
                        icon="account_balance_wallet"
                        tone="blue"
                        value={moneyVnd(s.gmv)}
                        label="Tiền phụ huynh trả"
                        // Không còn dòng phụ "Học phí gốc … · Phí phụ huynh …": đúng hai con
                        // số đó giờ nằm ngay dưới, ở chú thích của thanh "Tiền vào". In hai
                        // lần cách nhau 100px chỉ khiến mắt phải kiểm tra xem chúng có phải
                        // cùng một số không.
                        hint={
                            'Tổng tiền phụ huynh phải trả cho các lịch đặt trong kỳ'
                            + (percents ? `, đã gồm ${percents.parent}% phí phụ huynh` : '')
                            + '. Trừ doanh thu tạm tính ra đúng số tiền gia sư nhận.'
                            + '\n\nĐây KHÔNG phải doanh thu — phần lớn khoản này chảy về gia sư. '
                            + 'Thuật ngữ tài chính gọi là GMV. Dashboard hiện đúng con số này.'
                        }
                    />
                    <MetricCard
                        icon="undo"
                        tone="red"
                        value={moneyVnd(rf.amount)}
                        label="Đã hoàn tiền"
                        subLabel={`${count(rf.count)} lượt hoàn`}
                        badgeVariant="red"
                        hint={
                            // Câu cũ ghi "Hoa hồng Tutora ở trên chưa trừ khoản này", nghe như phải
                            // lấy phí sàn trừ đi con số này. Sai đơn vị: đây là HỌC PHÍ GỘP trả lại
                            // khách, còn doanh thu tạm tính chỉ là 10% của học phí.
                            'Học phí trả lại cho phụ huynh hoặc học sinh do huỷ buổi, gia sư từ chối, '
                            + 'hoặc xử lý khiếu nại.\n\n'
                            + 'Đây là tiền học phí gộp, KHÔNG phải doanh thu — đừng trừ thẳng vào '
                            + 'Doanh thu tạm tính ở dưới.\n\n'
                            // Câu cũ nói tiếp "lịch đã hủy đã bị loại khỏi mọi con số phía trên nên
                            // không có gì để trừ" — không còn đúng: lịch huỷ đã có tiền nay nằm
                            // trong cả GMV lẫn doanh thu tạm tính, và phần hoàn tiền đã được trừ
                            // sẵn khỏi "Đã thu được".
                            + 'Khoản hoàn của các lịch đã huỷ ĐÃ được trừ sẵn khi tính "Đã thu được" '
                            + 'ở vành khuyên bên dưới — trừ lần nữa là trừ hai lần.\n\n'
                            // Hai mốc thời gian khác nhau, và đây là chỗ DUY NHẤT nói ra điều đó.
                            // Thẻ này đếm theo ngày hoàn; cột "Đã hoàn" ở bảng cuối trang thì gắn
                            // vào từng lịch. Hôm nay hai số trùng nhau vì dữ liệu gọn trong một
                            // tháng, nên nếu không ghi trước thì lần đầu chúng tách ra sẽ bị đọc
                            // thành lỗi số liệu.
                            + 'Thẻ này đếm các lượt hoàn PHÁT SINH trong kỳ. Cột "Đã hoàn" ở bảng '
                            + 'cuối trang lại là tiền đã hoàn của từng lịch ĐẶT trong kỳ, nên hai '
                            + 'tổng có thể lệch nhau khi một lịch được hoàn tiền ở kỳ sau — cả hai '
                            + 'đều đúng, chỉ là hai câu hỏi khác nhau.'
                        }
                    />
                    <MetricCard
                        icon="running_with_errors"
                        tone="orange"
                        value={count(st.count)}
                        label="Booking dừng sau đợt 1"
                        badgeVariant="orange"
                        hint={stalledHint}
                    />
                </div>

                {/* `s.commissionFromCancelled` cố ý KHÔNG truyền xuống — xem lý do đầy đủ ở
                    đầu file MoneySplit.tsx. Tóm tắt: nó neo theo NGÀY HUỶ, khác mốc "booking
                    tạo trong kỳ" của mọi con số trong thẻ này. `commissionLost` thì cùng mốc
                    nên truyền được. */}
                <MoneySplit
                    gmv={s.gmv}
                    baseAmount={s.baseAmount}
                    tutorReceivable={s.tutorReceivable}
                    commissionSold={s.commissionSold}
                    commissionEarned={s.commissionEarned}
                    commissionLost={s.commissionLost}
                    percents={percents}
                />
            </section>

            {/* Hoàn tiền GỘP THẲNG vào biểu đồ chính dưới dạng cột, thay vì đứng riêng một ô.
                Ba lý do, theo thứ tự quan trọng:

                  1. Cùng trục X (tháng) và cùng đơn vị (VND), nên chồng được lên nhau mà
                     không cần trục Y thứ hai — thứ mà cụm trang này đã phải bỏ hẳn một biểu
                     đồ vì nó khiến hai đại lượng trông như so được với nhau trong khi không.
                  2. Câu hỏi thật của admin là "tháng nào hoàn tiền vọt lên thì doanh thu ghi
                     nhận có hụt theo không". Để hai biểu đồ cạnh nhau thì phải tự nhớ cột
                     tháng 3 cao bao nhiêu rồi liếc sang; chồng lên nhau thì thấy ngay.
                  3. Bớt một ô, trang ngắn lại.

                ─── Biểu đồ "Nợ dịch vụ theo tuổi nợ" đã BỎ ─────────────────────────────

                `recognition.deferredAging` vẫn có trong response và cố ý không được vẽ. Đừng
                thêm lại chỉ vì thấy API có trường mà giao diện thiếu.

                Nó chia nợ dịch vụ theo TUỔI (0-30 / 31-60 / 61-90 / >90 ngày) trên toàn bộ
                booking dang dở, không lọc theo kỳ — nên không gộp được vào biểu đồ trên (khác
                trục X) và cũng không trùng với lát "Còn chờ" của vành khuyên (khác phạm vi). Bỏ đi là đánh đổi có ý thức: trang gọn hơn, đổi lại mất cái nhìn duy nhất
                về nợ tồn đọng lâu ngày — khoản dễ bị đòi hoàn tiền nhất. Cần lại thì dữ liệu
                vẫn nằm nguyên trong `deferredAging`. */}
            <ChartBlock
                title="Dòng tiền theo thời gian"
                hint={
                    'Đường liền là DOANH THU ĐÃ GHI NHẬN — tiền thật: phí phụ huynh cộng vào '
                    + 'ngày buổi ĐẦU dạy xong, phí gia sư cộng vào ngày dạy của từng buổi. Đường đứt là doanh thu tạm tính, '
                    + 'quy về ngày khách đặt lịch; hai đường càng xa nhau thì phần chưa được phép '
                    + 'ghi nhận càng lớn.\n\n'
                    + 'Cột đỏ là học phí hoàn trả lại khách, vẽ chung một trục vì cùng đơn vị nên '
                    + 'so trực tiếp được.\n\n'
                    + 'Cộng cả đường liền trong kỳ, cộng thêm tiền bán gói AI, ra đúng con số ở '
                    + 'góc phải tiêu đề — cũng chính là "Doanh thu đã ghi nhận" trên trang Tổng '
                    + 'quan hệ thống.'
                }
                /* Tổng của đường liền, in ngay cạnh tiêu đề.
                   Đây là con số trả lời câu "rốt cuộc kỳ này Tutora thu được bao nhiêu", và
                   trước đây nó không hiện ở đâu trên cả trang — `summary.recognisedRevenue`
                   có trong response nhưng chỉ được dùng để vẽ. Hệ quả là dashboard báo một
                   con số mà người đọc không dò lại được ở báo cáo. */
                action={
                    <span className="rev-block-figure">
                        <span className="rev-block-figure-label">Doanh thu đã ghi nhận</span>
                        <strong>{moneyVnd(s.recognisedRevenue)}</strong>
                    </span>
                }
            >
                <LineTrendChart
                    data={timeline}
                    xKey="month"
                    height={260}
                    bars={[{ key: 'refund', name: 'Hoàn tiền', color: PALETTE.red }]}
                    series={[
                        {
                            key: 'recognised',
                            name: 'Doanh thu đã ghi nhận',
                            color: PALETTE.emerald,
                            area: true,
                        },
                        {
                            key: 'contracted',
                            name: 'Doanh thu tạm tính',
                            color: PALETTE.amber,
                            dashed: true,
                        },
                    ]}
                />
            </ChartBlock>

            <DataTableShell
                title="Doanh thu theo booking"
                /* Ba bộ điều khiển, mỗi cái trả lời một câu hỏi khác nhau — trước đây chỉ có
                   thanh sắp xếp, nên muốn xem riêng lịch đã huỷ thì phải lật từng trang.

                   Chip lọc để trống nhóm nào không có dòng nào: một chip "Đã huỷ 0" chỉ tổ
                   mời người ta bấm vào một bảng rỗng. */
                action={
                    <div className="rev-table-toolbar">
                        <div className="rev-segmented" role="tablist" aria-label="Lọc theo trạng thái">
                            {BUCKETS.filter((b) => b.key === 'all' || counts[b.key] > 0).map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={bucket === item.key}
                                    className={bucket === item.key ? 'is-active' : ''}
                                    onClick={() => {
                                        setBucket(item.key);
                                        bookingPage.setPage(1);
                                    }}
                                >
                                    {item.label}
                                    <span className="rev-chip-count">
                                        {item.key === 'all' ? allRows?.length ?? 0 : counts[item.key]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <label className="rev-search">
                            <span className="material-symbols-outlined" aria-hidden="true">search</span>
                            <input
                                type="search"
                                value={query}
                                placeholder="Mã lịch, khách, gia sư, môn…"
                                aria-label="Tìm trong danh sách booking"
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    bookingPage.setPage(1);
                                }}
                            />
                        </label>

                        <label className="rev-select">
                            <span className="rev-select-label">Sắp xếp</span>
                            <select
                                value={sort}
                                onChange={(e) => {
                                    setSort(e.target.value as SortKey);
                                    bookingPage.setPage(1);
                                }}
                            >
                                {SORTS.map((item) => (
                                    <option key={item.key} value={item.key}>{item.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                }
                pagination={{
                    current: bookingPage.page,
                    pageSize: bookingPage.pageSize,
                    total: bookingPage.total,
                    onChange: bookingPage.setPage,
                }}
            >
                {rows.length === 0 ? (
                    /* Phân biệt "chưa có gì" với "bộ lọc đang che hết" — nếu không, admin gõ
                       nhầm một chữ vào ô tìm là tưởng kỳ này không có doanh thu nào. */
                    <ReportEmpty
                        label={
                            (allRows?.length ?? 0) === 0
                                ? 'Không có booking nào phát sinh doanh thu'
                                : 'Không có booking nào khớp bộ lọc đang chọn'
                        }
                    />
                ) : (
                    /* ─── Hai cột đã BỎ, đừng thêm lại ────────────────────────────────
                        Bảng cũ có 12 cột và phải cuộn ngang trên màn 1920px, nên cột cuối
                        cùng lẫn nút Xem đều nằm ngoài màn hình. Chi tiết đầy đủ của một
                        booking đã có ở trang /admin-portal/bookings/:id sau nút Xem — bảng
                        này chỉ cần đủ để CHỌN ra dòng đáng mở.

                          • "Môn" — đã có nguyên tab "Môn & Lớp" trả lời câu hỏi doanh thu
                            theo môn, và trong dữ liệu thật cột này gần như một giá trị duy
                            nhất nên không phân biệt được dòng nào với dòng nào. Ô tìm kiếm
                            VẪN lọc theo môn (`selectBookings`), chỉ là không in ra cột.

                          • "Còn chờ" — bằng đúng hiệu của hai cột đứng ngay cạnh nhau
                            (tạm tính − đã thu được). Và nó KHÔNG thể quay lại dưới cái tên
                            đó nữa: từ 31/08 hiệu ấy mang hai nghĩa tuỳ dòng — còn chờ dạy
                            với lịch đang chạy, mất hẳn với lịch đã huỷ. Một cột tên "Còn
                            chờ" sẽ báo khoản đã mất như thể vẫn đòi được. Cột Trạng thái
                            phân biệt hai ca đó, và câu phụ dưới tiêu đề bảng nói rõ.
                            Sắp xếp "Treo nhiều tiền nhất" vẫn còn và chỉ xét lịch đang chạy.

                        Không bỏ "Tiến độ" dù nó cũng chiếm chỗ: đó là cột DUY NHẤT giải
                        thích vì sao một dòng có doanh thu bằng 0 (chưa dạy buổi nào), và
                        sắp xếp "Dạy chậm nhất" đọc thẳng vào nó. */
                    <table className="rev-table">
                        <thead>
                            <tr>
                                <th>Booking</th>
                                <th>Khách hàng</th>
                                <th>Gia sư</th>
                                <th>Trạng thái</th>
                                <th>Tiến độ</th>
                                {/* "Đã thanh toán", KHÔNG phải "Khách trả": cột này là tiền
                                    mặt thực nhận (mới đợt 1 thì chỉ có đợt 1), còn thẻ "Tiền
                                    phụ huynh trả" ở đầu trang là giá hợp đồng cả kỳ. Hai tên
                                    cũ gần như trùng chữ mà số chênh gấp gần ba lần, đọc lướt
                                    là tưởng một trong hai sai. */}
                                <th className="rev-num">Đã thanh toán</th>
                                <th className="rev-num">Đã hoàn</th>
                                <th className="rev-num">Doanh thu tạm tính</th>
                                <th className="rev-num">Đã thu được</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {bookingPage.pageItems.map((b) => (
                                    <tr key={b.bookingId}>
                                        <td>
                                            <strong>#{b.bookingId}</strong>
                                            <span className="rev-cell-sub">
                                                {b.createdAt ? b.createdAt.slice(0, 10) : '—'}
                                            </span>
                                        </td>
                                        <td>{b.parentName}</td>
                                        <td>{b.tutorName}</td>
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
                                        {/* Hai cột tiền mặt đứng TRƯỚC hai cột doanh thu: đọc từ
                                            trái sang phải thành đúng câu chuyện của một dòng
                                            đã huỷ — khách trả bao nhiêu, hoàn lại bao nhiêu,
                                            Tutora giữ lại bao nhiêu. */}
                                        <td className="rev-num">
                                            {b.cashCollected > 0 ? money(b.cashCollected) : '—'}
                                        </td>
                                        <td className="rev-num rev-neg">
                                            {b.refundedAmount > 0 ? money(b.refundedAmount) : '—'}
                                        </td>
                                        <td className="rev-num">{money(b.contractedFee)}</td>
                                        <td className="rev-num rev-pos">{money(b.recognisedFee)}</td>
                                        <td>
                                            <Link
                                                to={`/admin-portal/bookings/${b.bookingId}`}
                                                className="admin-ui-row-btn"
                                                aria-label={`Xem chi tiết booking #${b.bookingId}`}
                                            >
                                                <span className="material-symbols-outlined">visibility</span>
                                                <span className="admin-ui-row-btn-label">Xem</span>
                                            </Link>
                                        </td>
                                    </tr>
                            ))}
                        </tbody>
                        {/* Dòng tổng cộng trên TẬP ĐANG LỌC, không phải toàn bộ dữ liệu: người
                            đã bấm "Đã huỷ" thì muốn biết riêng nhóm đó cộng lại bao nhiêu. Vẫn
                            cộng trên toàn bộ kết quả lọc chứ không phải trang đang xem. */}
                        <tfoot>
                            <tr>
                                {/* colSpan bám đúng số cột phi-tiền ở đầu bảng: Booking, Khách
                                    hàng, Gia sư, Trạng thái, Tiến độ. Bỏ cột "Môn" nên là 5,
                                    không còn 6. */}
                                <td colSpan={5}>
                                    Tổng {rows.length} booking
                                    {rows.length !== (allRows?.length ?? 0)
                                        && ` (lọc từ ${allRows?.length ?? 0})`}
                                </td>
                                <td className="rev-num">
                                    {moneyVnd(rows.reduce((x, b) => x + b.cashCollected, 0))}
                                </td>
                                <td className="rev-num rev-neg">
                                    {moneyVnd(rows.reduce((x, b) => x + b.refundedAmount, 0))}
                                </td>
                                <td className="rev-num">
                                    {moneyVnd(rows.reduce((x, b) => x + b.contractedFee, 0))}
                                </td>
                                <td className="rev-num rev-pos">
                                    {moneyVnd(rows.reduce((x, b) => x + b.recognisedFee, 0))}
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
