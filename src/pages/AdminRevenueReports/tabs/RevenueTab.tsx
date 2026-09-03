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
import { matchesSearch } from '@/utils/vietnameseSearch';
import MetricCard from '../components/MetricCard';
import { FilterChips, SearchInput, SortSelect, TableToolbar } from '../components/TableToolbar';
import { PersonName } from '../components/PersonName';
import { findDuplicateNames } from '../components/personIdentity';
import { FEE_SIDE_COLOR } from '../components/feeSideColors';
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

    if (query.trim()) {
        out = out.filter((b) =>
            matchesSearch(query, String(b.bookingId), b.parentName, b.tutorName, b.subject,
                b.parentContact, b.tutorContact));
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

    if (loading) return <ReportSkeleton alloc metrics={3} charts={1} splits={0} />;
    if (error) return <ReportError message={error} onRetry={reload} />;
    if (!overview.data || !recognition.data) return null;

    const data = recognition.data;

    // Trùng tên tính trên TOÀN BỘ booking của kỳ, không phải trang đang xem hay tập đã lọc:
    // hai người trùng tên rơi vào hai trang khác nhau thì vẫn là trùng, và chuỗi phân biệt
    // không được lúc có lúc không theo bộ lọc. Hai tập riêng vì cột Khách và cột Gia sư là
    // hai nhóm người khác nhau — một cái tên trùng bên khách không có nghĩa là trùng bên
    // gia sư.
    const dupParentNames = findDuplicateNames(
        (allRows ?? []).map((b) => ({ name: b.parentName, contact: b.parentContact })),
    );
    const dupTutorNames = findDuplicateNames(
        (allRows ?? []).map((b) => ({ name: b.tutorName, contact: b.tutorContact })),
    );

    const s = overview.data.summary;
    const st = data.stalled;
    const rf = data.refunds;
    const ns = data.neverStarted;

    /**
     * Phí phụ huynh đã cộng vào giá trị lịch đặt, tính bằng TỈ LỆ THỰC TẾ của kỳ chứ không đọc
     * từ bảng cấu hình phí sàn.
     *
     * Bản trước ghép `${percents.parent}%` vào tooltip. Sai cùng một kiểu với hai chip của thẻ
     * Phân bổ (đã sửa 03/09/2026, xem đầu MoneySplit.tsx): phí chốt cứng lúc khách đặt lịch và
     * không hồi tố, nên ngay sau khi admin đổi mức, câu này nói 10% trong khi khoản phí thật sự
     * nằm trong `gmv` chỉ là 5,2%.
     *
     * `null` khi kỳ không có lịch đặt nào — mẫu số bằng 0 thì cả mệnh đề tự biến mất.
     */
    const parentFeePct = s.baseAmount > 0
        ? ((s.gmv - s.baseAmount) / s.baseAmount) * 100
        : null;

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
        // Câu này từng chỉ người đọc sang hai lát "Còn chờ" / "Không thu được" của vành khuyên
        // bên dưới. Vành khuyên đã gỡ (01/09/2026, xem đầu file MoneySplit.tsx) nên phải bỏ chỉ
        // dẫn đó — một tooltip trỏ tới thứ không còn trên màn hình thì tệ hơn là không trỏ gì.
        // Điều duy nhất cần giữ vẫn đúng: số này KHÔNG được cộng thêm vào đâu cả.
        + '\n\nSố đó KHÔNG phải tiền khách trả, và cũng KHÔNG phải một khoản riêng cần cộng thêm '
        + '— nó đã nằm sẵn trong "Doanh thu tạm tính" ở khối bên dưới.';

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

    /**
     * Kỳ này có bán được gói AI nào không — quyết định có vẽ đường AI lên biểu đồ hay không.
     *
     * Cùng luật với dòng tách nguồn ở góc phải tiêu đề và với biểu đồ cùng tên bên tab AI: không
     * bán gói nào thì đường này dính đáy suốt kỳ, thêm một mục chú giải để nói đúng điều mà việc
     * không có đường đã nói. Đọc `timeline` chứ không đọc `s.aiRevenue`: hai cái này là cùng một
     * số chia theo mốc khác nhau, nhưng thứ quyết định đường có hình hài gì là dữ liệu đang vẽ.
     */
    const hasAiRevenue = timeline.some((t) => t.aiRevenue > 0);

    /**
     * Vạch dọc "admin đổi mức phí sàn", vẽ đè lên biểu đồ xu hướng.
     *
     * Đây là chỗ câu chuyện về đổi phí trở nên KỂ ĐƯỢC. Doanh thu tạm tính neo theo ngày ĐẶT
     * lịch, nên vạch chia đúng đường đứt ấy làm hai đoạn: bên trái là lịch bán ở mức cũ, bên
     * phải ở mức mới. Không có vạch thì người xem chỉ thấy một tỉ lệ trung bình lơ lửng (5,2%
     * trong khi cấu hình ghi 10%) và không có cách nào tự giải thích.
     *
     * Đường doanh thu đã ghi nhận thì KHÔNG đổi dốc ngay tại vạch — nó neo theo ngày DẠY nên
     * phản ứng trễ, và độ trễ đúng bằng khoảng cách từ lúc đặt tới lúc dạy. Đó là hành vi đúng,
     * đã ghi vào chú thích ⓘ của biểu đồ để không ai đọc thành lỗi.
     *
     * Ô chứa mốc tìm bằng `start` do backend trả, KHÔNG parse ngược nhãn trục: nhãn có ba dạng
     * tuỳ độ dài kỳ và hai dạng không mang năm — xem `RevenueTrendPoint.start`.
     */
    const rateMarkers = (() => {
        if (!percents || percents.history.length === 0) return [];

        const starts = timeline.map((t) => (t.start ? Date.parse(t.start) : NaN));
        // Backend chưa nạp bản có `start` thì bỏ hẳn vạch — thà thiếu chú thích còn hơn gắn nó
        // vào một ô đoán mò.
        if (!starts.length || !Number.isFinite(starts[0])) return [];

        // `range.to` rỗng nghĩa là "tới hiện tại", đúng như `rangeParams` gửi lên backend.
        const rangeEnd = (range.to ?? new Date()).getTime();

        // Gộp theo Ô, không theo lần đổi: hai lần đổi rơi cùng một ô thì hai vạch chồng khít
        // lên nhau và hai nhãn đè nhau thành một vệt không đọc được. Giữ lần MỚI NHẤT của ô —
        // đó mới là mức có hiệu lực khi ô đó kết thúc.
        //
        // NHƯNG phải NÓI RA là đã gộp. Bản đầu im lặng, và trên dev nó nuốt mất hẳn một lần
        // đổi: admin đổi 5→10 rồi 10→20 trong cùng ngày 03/09, biểu đồ chỉ hiện "→ 20% + 20%"
        // nên nhìn vào tưởng mức nhảy thẳng từ 5% lên 20%. Một chú thích giấu bớt sự kiện thì
        // tệ hơn là không có chú thích.
        //
        // Giữ hai vế phí RỜI NHAU (không ghép sẵn thành chuỗi "5% + 5%" như bản đầu) vì mỗi vế
        // được tô một màu riêng ở nhãn — xem `FEE_SIDE_COLOR`.
        const byBucket = new Map<
            number,
            { at: number; tutor: number; parent: number; count: number }
        >();

        for (const h of percents.history) {
            const at = Date.parse(h.changedAt);
            if (!Number.isFinite(at) || at < starts[0] || at >= rangeEnd) continue;

            let idx = -1;
            for (let i = 0; i < starts.length; i += 1) {
                if (Number.isFinite(starts[i]) && starts[i] <= at) idx = i;
            }
            if (idx < 0) continue;

            const kept = byBucket.get(idx);
            const count = (kept?.count ?? 0) + 1;
            if (!kept || at > kept.at) {
                byBucket.set(idx, { at, tutor: h.tutor, parent: h.parent, count });
            } else {
                byBucket.set(idx, { ...kept, count });
            }
        }

        return [...byBucket.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([idx, marker]) => ({
                x: timeline[idx].month,
                /* Nhiều lần đổi trong cùng một ô thì nhãn phải kể ĐỦ CÂU, không chỉ dán thêm
                   một con số. "Phí sàn → 5% + 5% (4 lần đổi)" đọc mơ hồ — 4 lần đổi cái gì, và
                   5% là lần nào trong bốn lần đó. "Đổi phí 4 lần → 5% + 5%" nói đúng thứ tự sự
                   việc: đổi mấy lần, rồi dừng ở đâu.

                   Chữ giữ nguyên từng ký tự so với bản một chuỗi; chỉ khác là hai con số % nay
                   là hai ĐOẠN riêng để tô hai màu định danh (03/09/2026). "5% + 5%" tự nó không
                   nói vế nào của ai, và đọc SAI hẳn khi admin đặt hai mức lệch nhau — đúng lý do
                   thẻ "Doanh thu tạm tính" ngay dưới đã tô màu. Hai chỗ nói về cùng một mức phí
                   nên phải dùng chung một cặp màu, xem `FEE_SIDE_COLOR`.

                   Thứ tự tutor-trước-parent phải khớp thứ tự ở thẻ dưới: vị trí là manh mối thứ
                   hai bên cạnh màu, cho người không phân biệt được hai màu. */
                label: [
                    {
                        text: marker.count > 1
                            ? `Đổi phí ${marker.count} lần → `
                            : 'Phí sàn → ',
                    },
                    { text: `${marker.tutor}%`, color: FEE_SIDE_COLOR.tutor },
                    { text: ' + ' },
                    { text: `${marker.parent}%`, color: FEE_SIDE_COLOR.parent },
                ],
            }));
    })();

    return (
        <div className="rev-stack">
            {/* Dải chỉ số đứng MỘT MÌNH từ 01/09/2026.
                Trước đây nó dùng chung khung `.rev-hero` với thẻ phân bổ, vì hai khối là "hai
                nửa của một câu": trên là các con số tổng, dưới là cách chúng được chia. Nay
                thẻ phân bổ đã chuyển xuống dưới biểu đồ nên không còn kề nhau, và `.rev-strip`
                tự nó đã có khung riêng. */}
            <div className="rev-strip">
                <MetricCard
                    icon="account_balance_wallet"
                    tone="blue"
                    value={moneyVnd(s.gmv)}
                    label="Giá trị lịch đặt"
                    subLabel={`khách đã thực trả ${moneyVnd(s.gmvPaid)}`}
                    // Không còn dòng phụ "Học phí gốc … · Phí phụ huynh …": đúng hai con
                    // số đó giờ nằm ngay dưới, ở chú thích của thanh "Tiền vào". In hai
                    // lần cách nhau 100px chỉ khiến mắt phải kiểm tra xem chúng có phải
                    // cùng một số không.
                    hint={
                        'Tổng giá trị các lịch đặt trong kỳ, tính theo GIÁ HỢP ĐỒNG chốt lúc khách bấm đặt'
                        + (parentFeePct !== null ? `, đã gồm ${parentFeePct.toFixed(1)}% phí phụ huynh` : '')
                        + '. Trừ doanh thu tạm tính ra đúng số tiền gia sư nhận.'
                        + '\n\nĐÂY KHÔNG PHẢI TIỀN MẶT ĐÃ VÀO. Khách trả làm 2 đợt, nên khoá mới'
                        + ' trả đợt 1 vẫn tính trọn giá gói ở đây. Số khách ĐÃ THỰC TRẢ nằm ở dòng'
                        + ' ngay dưới con số này.'
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
                        // Câu này từng trỏ sang lát "Đã thu được" của vành khuyên bên dưới.
                        // Vành khuyên đã gỡ 01/09/2026, nên nói thẳng vào chỗ khoản hoàn
                        // thực sự đã được trừ: doanh thu ghi nhận ở tab Gia sư / Khách hàng.
                        + 'Khoản hoàn của các lịch đã huỷ ĐÃ được trừ sẵn khi tính doanh thu ghi '
                        + 'nhận (tab Gia sư và tab Phụ huynh/học sinh) — trừ lần nữa là trừ hai lần.\n\n'
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
                    'Đường xanh lá là DOANH THU DẠY HỌC ĐÃ GHI NHẬN — tiền thật: phí phụ huynh cộng '
                    + 'vào ngày buổi ĐẦU dạy xong, phí gia sư cộng vào ngày dạy của từng buổi. Đường đứt là doanh thu tạm tính, '
                    + 'quy về ngày khách đặt lịch; hai đường càng xa nhau thì phần chưa được phép '
                    + 'ghi nhận càng lớn. Cả hai đường này chỉ tính tiền từ buổi dạy, KHÔNG gồm gói AI.\n\n'
                    + 'Đường xanh dương là tiền bán gói AI, ghi nhận ngay ngày khách trả tiền chứ không '
                    + 'chờ buổi dạy nào — nên nó nhảy theo lượt mua chứ không chạy theo lịch học. Kỳ '
                    + 'không bán được gói nào thì đường này không hiện. Chi tiết ở tab Doanh thu AI.\n\n'
                    + 'Cột đỏ là học phí hoàn trả lại khách, vẽ chung một trục vì cùng đơn vị nên '
                    + 'so trực tiếp được.\n\n'
                    + 'Cộng cả đường xanh lá và đường xanh dương trong kỳ ra đúng con số ở góc phải '
                    + 'tiêu đề, theo đúng phép chia hai nguồn in ngay dưới nó — cũng chính là "Doanh '
                    + 'thu đã ghi nhận" trên trang Tổng quan hệ thống.'
                    // Chỉ nói về vạch mốc khi kỳ này thật sự có vạch. Giải thích một thứ không có
                    // trên màn hình chỉ làm người đọc đi tìm.
                    + (rateMarkers.length > 0
                        ? '\n\nVạch dọc nét đứt là lúc admin đổi mức phí sàn. Phí chốt cứng lúc '
                          + 'khách bấm đặt nên đổi mức KHÔNG hồi tố: đường đứt (tạm tính, quy về '
                          + 'ngày đặt) đổi mức ngay tại vạch, còn đường xanh lá (đã ghi nhận, quy '
                          + 'về ngày dạy) đổi trễ hơn — trễ đúng bằng khoảng cách từ lúc đặt tới '
                          + 'lúc dạy. Hai đường phản ứng lệch nhau ở đây là đúng, không phải lỗi.'
                          // Nhãn vạch tô hai màu thì phải nói ra màu nào là vế nào — cùng cặp
                          // màu với thẻ Doanh thu tạm tính ngay dưới, xem `FEE_SIDE_COLOR`.
                          + '\n\nTrong nhãn của vạch, vế TÍM là phí gia sư và vế XANH MÒNG KÉT '
                          + 'là phí phụ huynh — đúng hai màu dùng ở thẻ "Doanh thu tạm tính" '
                          + 'ngay dưới biểu đồ.'
                        : '')
                }
                /* Tổng của đường xanh lá cộng đường xanh dương, in ngay cạnh tiêu đề.
                   Đây là con số trả lời câu "rốt cuộc kỳ này Tutora thu được bao nhiêu", và
                   trước đây nó không hiện ở đâu trên cả trang — `summary.recognisedRevenue`
                   có trong response nhưng chỉ được dùng để vẽ. Hệ quả là dashboard báo một
                   con số mà người đọc không dò lại được ở báo cáo.

                   Dòng thứ hai bóc nó theo NGUỒN: tiền từ buổi dạy (phí gia sư + phí phụ
                   huynh) và tiền bán gói AI. Hai nguồn này khác nhau về bản chất — một khoản
                   chỉ chín khi có buổi dạy xong, một khoản thu đứt ngay lúc mua — nên gộp
                   chung một con số mà không ghi rõ là để người đọc tự đoán sai tỉ lệ.

                   Phép cộng ở đây KHÍT TUYỆT ĐỐI, không có số dư: nó chia một con số theo
                   nguồn gốc. Bản trước đặt ở cuối thẻ Phân bổ và cộng "đã thu được" (neo ngày
                   ĐẶT) với "gói AI" rồi phải thêm một số hạng "chênh mốc" để bù — hai mốc
                   khác nhau thì không bao giờ khít. Xem đầu MoneySplit.tsx. */
                action={
                    <span className="rev-block-figure">
                        <span className="rev-block-figure-main">
                            <span className="rev-block-figure-label">Doanh thu đã ghi nhận</span>
                            <strong>{moneyVnd(s.recognisedRevenue)}</strong>
                        </span>
                        {/* Tách theo NGUỒN, và chỉ hiện khi thật sự có hai nguồn. Kỳ không bán
                            gói AI nào thì dòng này là tiếng ồn: nó lặp lại con số ngay trên đầu
                            rồi cộng thêm số 0. Backend cũ chưa trả `aiRevenue` cũng rơi vào
                            nhánh này, nên viên thuốc suy biến về đúng bản một dòng cũ. */}
                        {s.aiRevenue > 0 && (
                            <span className="rev-block-figure-split">
                                {money(s.recognisedRevenue - s.aiRevenue)} dạy học
                                <span className="rev-block-figure-op" aria-hidden="true">+</span>
                                {money(s.aiRevenue)} gói AI
                            </span>
                        )}
                    </span>
                }
            >
                <LineTrendChart
                    data={timeline}
                    xKey="month"
                    height={260}
                    markers={rateMarkers}
                    bars={[{ key: 'refund', name: 'Hoàn tiền', color: PALETTE.red }]}
                    series={[
                        /* Hai đường dạy học đều KHÔNG gồm tiền gói AI, và tên chúng nói ra điều đó
                           từ 02/09/2026. Trước đó đường liền mang đúng nhãn "Doanh thu đã ghi nhận" như
                           con số ở góc phải tiêu đề, trong khi hai thứ khác nhau đúng phần gói AI: backend
                           cộng `aiIn` vào `RecognisedRevenue` của summary nhưng KHÔNG cộng vào `Recognised`
                           của từng mốc trong `trend` — xem AdminRevenueAnalyticsService.Overview.cs. Cùng
                           một cái tên cho hai con số khác nhau, cách nhau 200px, thì người đọc cộng
                           nhẩm ra không khớp và không có cách nào tự giải thích. Giờ đường xanh lá cộng
                           đường xanh dương mới ra con số ở tiêu đề, đúng bằng phép chia nguồn in ngay
                           dưới nó. Đừng bỏ chữ "dạy học" để nhãn ngắn lại. */
                        {
                            key: 'recognised',
                            name: 'Doanh thu dạy học đã ghi nhận',
                            color: PALETTE.emerald,
                            area: true,
                        },
                        /* Tiền gói AI vẽ bằng ĐƯỜNG chứ không bằng cột như hoàn tiền: trong khung này hình
                           dạng đang mã hoá CHIỀU của dòng tiền — đường là tiền vào, cột là tiền ra. Vẽ
                           nó thành cột thì hai khoản ngược dấu nhau lại trông giống hệt nhau, chỉ khác
                           màu. Để cạnh đường xanh lá cũng hợp lý: doanh thu ghi nhận cũng rời rạc y hệt
                           (chín theo từng buổi dạy xong) mà vẫn đã là đường từ đầu.

                           Màu xanh dương là màu đã dùng cho doanh thu AI ở tab AI — giữ nguyên để một
                           khoản tiền không đổi màu khi đổi tab. Không tô nền: `area` để dành cho chuỗi
                           chính, hai mảng tô chồng nhau thì không đọc được cái nào.

                           Kỳ không bán gói nào thì bỏ hẳn, không vẽ đường 0 — xem `hasAiRevenue`. */
                        ...(hasAiRevenue
                            ? [{
                                key: 'aiRevenue',
                                name: 'Doanh thu gói AI',
                                color: PALETTE.blue,
                            }]
                            : []),
                        {
                            key: 'contracted',
                            name: 'Doanh thu dạy học tạm tính',
                            color: PALETTE.amber,
                            dashed: true,
                        },
                    ]}
                />
            </ChartBlock>

            {/* Thẻ phân bổ nằm SAU biểu đồ (đổi chỗ 01/09/2026). Biểu đồ trả lời câu hỏi lớn
                của trang — tiền vào ra thế nào theo thời gian — nên nó lên ngay dưới dải chỉ
                số; phần bóc tách một con số thành hai vế là chi tiết, để sau.

                `s.commissionFromCancelled` cố ý KHÔNG truyền xuống — xem lý do đầy đủ ở đầu
                file MoneySplit.tsx. Tóm tắt: nó neo theo NGÀY HUỶ, khác mốc "booking tạo trong
                kỳ" của mọi con số trong thẻ này.

                `s.commissionEarned` / `s.commissionLost` cũng không truyền nữa từ 01/09/2026:
                vành khuyên "Số tạm tính đi về đâu" đã gỡ vì cả ba lát đang sai số (lỗi đảo
                escrow ở backend làm `released` hụt ⇒ hai số này lệch). API vẫn trả về, giữ để
                đối soát sau khi sửa xong luồng escrow. */}
            <MoneySplit
                gmv={s.gmv}
                baseAmount={s.baseAmount}
                tutorReceivable={s.tutorReceivable}
                commissionSold={s.commissionSold}
                commissionMatured={s.commissionMatured}
                commissionPending={s.commissionPending}
                commissionUnrecoverable={s.commissionUnrecoverable}
                percents={percents}
                rateMix={s.rateMix}
            />

            <DataTableShell
                title="Doanh thu theo booking"
                /* Ba bộ điều khiển, mỗi cái trả lời một câu hỏi khác nhau — trước đây chỉ có
                   thanh sắp xếp, nên muốn xem riêng lịch đã huỷ thì phải lật từng trang.

                   Markup đã chuyển sang `TableToolbar` để bốn tab còn lại dùng đúng một hình
                   dạng; luật ẩn chip rỗng nằm trong `FilterChips`. */
                action={
                    <TableToolbar>
                        <FilterChips
                            ariaLabel="Lọc theo trạng thái"
                            items={BUCKETS.map((b) => ({
                                ...b,
                                count: b.key === 'all' ? allRows?.length ?? 0 : counts[b.key],
                            }))}
                            value={bucket}
                            onChange={(key) => {
                                setBucket(key);
                                bookingPage.setPage(1);
                            }}
                        />
                        <SearchInput
                            value={query}
                            placeholder="Mã lịch, khách, gia sư, môn…"
                            ariaLabel="Tìm trong danh sách booking"
                            onChange={(value) => {
                                setQuery(value);
                                bookingPage.setPage(1);
                            }}
                        />
                        <SortSelect
                            items={SORTS}
                            value={sort}
                            onChange={(key) => {
                                setSort(key);
                                bookingPage.setPage(1);
                            }}
                        />
                    </TableToolbar>
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
                                    khách trả" ở đầu trang là giá hợp đồng cả kỳ. Hai tên
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
                                        <td>
                                            <PersonName
                                                name={b.parentName}
                                                contact={b.parentContact}
                                                duplicates={dupParentNames}
                                            />
                                        </td>
                                        <td>
                                            <PersonName
                                                name={b.tutorName}
                                                contact={b.tutorContact}
                                                duplicates={dupTutorNames}
                                            />
                                        </td>
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
                    </table>
                )}
            </DataTableShell>
        </div>
    );
};

export default RevenueTab;
