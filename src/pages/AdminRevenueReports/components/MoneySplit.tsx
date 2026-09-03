import { money, moneyVnd } from '@/utils/formatMoney';
import type { CommissionPercents } from '@/hooks/useCommissionPercents';
import type { RevenueRateMix } from '@/types/revenueReports.types';
import InfoHint from './InfoHint';

/**
 * Các trường của khối này mới thêm vào API. Nếu backend chưa được nạp bản mới, chúng về
 * `undefined` và mọi phép chia sau đó ra `NaN`. Quy về 0 để trang xấu đi chứ không vỡ.
 */
const num = (v: number | undefined | null) => (Number.isFinite(v) ? (v as number) : 0);

/** Giữ đơn vị tiền nhẹ hơn phần số, để mắt quét các giá trị nhanh hơn. */
const VndAmount = ({ value }: { value: number }) => (
    <>
        <span className="rev-flow-amount">{money(value)}</span>
        <span className="rev-flow-currency">VND</span>
    </>
);

/** Một chữ số sau dấu chấm, cùng quy ước với `growthBadge` của `formatMoney`. */
const pct = (value: number) => `${value.toFixed(1)}%`;

/**
 * Mức phí in dạng "5% + 5%" — bỏ số 0 thừa sau dấu chấm.
 *
 * Khác `pct`: chỗ này in một mức phí CÓ THẬT do admin đặt (luôn là số nguyên trên giao diện
 * Cài đặt), không phải một tỉ lệ suy ra từ phép chia. "5%" đọc ra ngay là mức chính sách, còn
 * "5.0%" trông như kết quả đo.
 */
const onePct = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)}%`;

/* `ratePair` (ghép sẵn chuỗi "5% + 5%") đã bỏ 03/09/2026: hai vế nay được tô hai màu khác nhau
   nên phải là hai phần tử riêng, không thể là một chuỗi. */

/**
 * Số mức phí in ra tối đa. Nhiều hơn thì phần còn lại gộp thành "khác" — vẫn cộng khít bằng
 * doanh thu tạm tính, chỉ mất chi tiết của những mức bé nhất.
 */
const MAX_RATE_ROWS = 3;

export interface MoneySplitProps {
    gmv: number;
    /**
     * Học phí gốc — giá gia sư niêm yết. Là MẪU SỐ của hai tỉ lệ phí trên thẻ, và dùng để suy
     * ra phí gia sư = học phí gốc − tiền gia sư nhận. Từ 03/09/2026 con số này không còn in ra
     * mặt thẻ nữa, chỉ còn trong tooltip — xem ghi chú "Đã cắt khỏi mặt thẻ" bên dưới.
     */
    baseAmount: number;
    tutorReceivable: number;
    /** Doanh thu TẠM TÍNH: phí sàn của mọi lịch đặt trong kỳ, chốt ngay lúc đặt. */
    commissionSold: number;
    /**
     * Ba số phận của `commissionSold`, cộng khít bằng nó theo construction ở mọi kỳ.
     *
     * Khoá đã chốt sổ đọc SỔ VÍ, khoá đang chạy dùng công thức — cùng một chính sách với
     * `recognisedRevenue`. Đổi 02/09/2026; trước đó bộ ba cố ý không chạm sổ ví, và hệ quả là
     * "Đã thu được" lệch 2.500 so với phần dạy học của doanh thu đã ghi nhận mà không ai giải
     * thích được. Xem ghi chú đầy đủ ở DTO `AdminRevenueAnalyticsResponse`.
     */
    commissionMatured: number;
    commissionPending: number;
    commissionUnrecoverable: number;
    /** Mức phí sàn đang cấu hình + mốc đổi. `null` khi chưa tải xong — phần chữ tự ẩn. */
    percents: CommissionPercents | null;
    /**
     * Các mức phí THỰC SỰ có trong kỳ, kèm tiền ở mỗi mức. `undefined` khi backend chưa nạp bản
     * mới — thẻ lùi về in một tỉ lệ trung bình như trước.
     */
    rateMix?: RevenueRateMix[];
}

/**
 * Khối chia tiền của tab Doanh thu, viết dưới dạng MỘT PHÉP CỘNG:
 *
 *     [tiêu đề]
 *     Gia sư nhận  +  Doanh thu tạm tính
 *                     phí gia sư x% + phí phụ huynh y% của học phí gốc
 *
 * Hai cột lớn, cột phải mở thêm một dòng tỉ lệ vì phí sàn có hai nửa. Tổng nằm ở thẻ đầu của
 * dải chỉ số đầu trang, không lặp lại ở đây.
 *
 * Thẻ này nằm SAU biểu đồ "Dòng tiền theo thời gian" (đổi chỗ 01/09/2026) và có khung trắng
 * riêng — trước đó nó dùng chung khung `.rev-hero` với dải chỉ số.
 *
 * ─── Quy ước từ ngữ dùng chung cả cụm trang lẫn dashboard ─────────────────────
 *
 *   Tiền khách trả           — GMV, tổng tiền khách bỏ ra. KHÔNG phải doanh thu.
 *   Doanh thu tạm tính       — phí sàn chốt lúc đặt lịch. Chưa phải tiền thật.
 *   Doanh thu đã ghi nhận    — doanh thu kế toán của kỳ, neo theo NGÀY DẠY nên khác mốc với
 *                              hai số trên. Hiện ở dashboard và ở tab Gia sư / Khách hàng.
 *
 * Chữ "hoa hồng" đã bỏ hẳn khỏi giao diện.
 *
 * ─── TỈ LỆ TRÊN THẺ SUY TỪ TIỀN, KHÔNG ĐỌC TỪ CẤU HÌNH (sửa 03/09/2026) ───────
 *
 * Bản trước in hai chip `−{percents.tutor}%` / `+{percents.parent}%` lấy thẳng từ bảng cấu
 * hình phí sàn. Sai — và sai theo kiểu chỉ lộ ra khi admin đổi mức:
 *
 *   Phí sàn chốt cứng vào từng booking lúc khách bấm đặt và KHÔNG hồi tố. Sau khi admin đổi
 *   5%+5% → 10%+10%, thẻ hiện `−10% / +10%` cạnh 1.206.250đ trên học phí gốc 23.125.000đ.
 *   Người đọc nhẩm theo nhãn ra 20% × 23.125.000 = 4.625.000, nhìn lên thấy doanh thu tạm tính
 *   2.412.500 — vênh 2.212.500 mà không có gì trên màn hình giải thích được. Phép cộng vẫn
 *   đúng tuyệt đối; chỉ cái nhãn là sai.
 *
 * Luật rút ra, áp cho cả cụm trang: **tỉ lệ đứng cạnh một khoản tiền phải chia được từ chính
 * những con số đang hiện trên màn hình.** Cấu hình mô tả chính sách SẮP TỚI, số tiền mô tả kết
 * quả ĐÃ XẢY RA; dán cái trước lên cái sau là trộn hai mốc thời gian.
 *
 * Mức đang cấu hình vẫn đáng hiện — nhưng ở dòng riêng, chỉ khi nó thật sự lệch với tỉ lệ của
 * kỳ. Từ 03/09/2026 nó chỉ còn trong tooltip ⓘ — dòng hiện trên mặt thẻ đã bỏ, xem ghi
 * chú trong thân component.
 *
 * ─── Đã cắt khỏi mặt thẻ 03/09/2026 (thẻ này phải thuyết trình được) ──────────
 *
 * Ba thứ bỏ đi đều là số SUY RA ĐƯỢC từ số còn lại, không phải thông tin mới:
 *
 * 1. **Dòng "Học phí gốc"**. Nó chỉ tồn tại để làm mẫu số cho hai tỉ lệ. Nay chính dòng tỉ lệ
 *    tự gọi tên mẫu số ("của học phí gốc") nên con số không cần đứng riêng một dòng nữa; ai
 *    cần trị số thì mở ⓘ.
 * 2. **Hai con số phí gia sư / phí phụ huynh** (1.206.250 in hai lần). Tổng của chúng đã là
 *    "Doanh thu tạm tính" ngay phía trên, và khi hai mức phí bằng nhau thì chúng còn bằng
 *    nhau nốt — ba con số cho một sự thật. Giữ lại TỈ LỆ vì đó mới là thứ nói lên cấu trúc
 *    phí hai vế, bỏ trị số.
 *
 * Thứ KHÔNG cắt: hàng ba số phận. Nó không suy được từ đâu khác trên trang và là chỗ duy nhất
 * trả lời "khoản tạm tính rồi sẽ ra sao" — cắt là mất thông tin thật, không phải bớt trùng lặp.
 *
 * ─── Ba bản đã bỏ, đừng dựng lại bản nào ──────────────────────────────────────
 *
 * 1. **Vành khuyên "Số tạm tính đi về đâu"** (gỡ 01/09/2026). Ba lát vẫn còn — chúng là hàng
 *    `.rev-fate` bây giờ — nhưng HÌNH TRÒN thì không dựng lại: tỉ lệ thật quá lệch để đọc bằng
 *    hình (đã thu 24%, chờ 17%, không thu 59%, và ở kỳ khác lát nhỏ nhất từng chỉ còn 4,8%).
 *    Chữ nói được tỉ lệ chính xác, hình thì không.
 * 2. **Hai thanh tỉ lệ "Tiền vào / Tiền ra"**. Tỉ lệ thật là 90,1 / 5,0 / 5,0 — quá lệch để
 *    thanh đọc được, hai thanh chênh nhau đúng 5% nên trông y hệt nhau.
 * 3. **Bảng lồng nhau 6 hàng**. Kéo dãn ra 1350px thì nhãn kết thúc ở x≈340 còn số của chính
 *    hàng đó nằm ở x≈1400 — hơn 1000px trống, mắt lạc hàng.
 *
 * Bài học chung: **bề ngang phải dùng làm CỘT, không phải để kéo dãn hàng**, và đừng vẽ tỉ lệ
 * khi một lát chưa tới 5%.
 *
 * ─── "Dòng nối" đã bỏ (02/09/2026, sống được đúng một bản) ────────────────────
 *
 * Từng có một dòng ở cuối thẻ: `Doanh thu đã ghi nhận = X đã thu được + Y gói AI ± Z chênh
 * mốc`. Ý định đúng — cho người đọc thấy hai con số khác mốc nối với nhau thế nào — nhưng
 * cách làm sai: nó bắt người đọc nuốt một số hạng "chênh mốc" mà bản thân nó cần cả một
 * tooltip mới hiểu. Thay bằng cách tách theo NGUỒN ở viên thuốc đầu biểu đồ, khít tuyệt đối.
 *
 * `summary.commissionFromCancelled` vẫn CỐ Ý không vẽ ở đây: nó là số luỹ kế CẢ ĐỜI khoá, quy
 * về ngày huỷ, trong khi mọi con số của thẻ này neo theo "booking tạo trong kỳ". Cộng vào bất
 * kỳ tổng nào ở đây cũng là tính hai lần.
 */
const MoneySplit = (props: MoneySplitProps) => {
    const { percents } = props;
    const gmv = num(props.gmv);
    const tutorReceivable = num(props.tutorReceivable);
    const commissionSold = num(props.commissionSold);
    const matured = num(props.commissionMatured);
    const pending = num(props.commissionPending);
    const unrecoverable = num(props.commissionUnrecoverable);

    // Phí gia sư = phần hụt giữa học phí gốc và số gia sư nhận. Phí phụ huynh = phần cộng thêm
    // lên trên học phí gốc. Chặn dưới ở 0 phòng khi backend cũ chưa trả `baseAmount`.
    //
    // Hai khoản CỐ Ý suy từ ba số gốc chứ không chia đôi `commissionSold`: nếu backend lệch thì
    // thẻ phải hiện ra chỗ lệch, không tự làm cho khớp. Theo BookingFeeCalculator thì luôn có
    // `commissionSold === gmv − tutorReceivable`.
    const baseAmount = num(props.baseAmount);
    const parentFee = Math.max(gmv - baseAmount, 0);
    const tutorCut = Math.max(baseAmount - tutorReceivable, 0);

    // Tỉ lệ THỰC TẾ của kỳ, chia thẳng từ hai con số vừa tính. Kỳ không có lịch đặt nào thì
    // mẫu số bằng 0 và cả dòng tỉ lệ tự ẩn — in "0.0%" ở đó là bịa ra một sự thật.
    const rates = baseAmount > 0
        ? { tutor: (tutorCut / baseAmount) * 100, parent: (parentFee / baseAmount) * 100 }
        : null;

    /**
     * Các mức phí có mặt trong kỳ, đã gộp phần đuôi.
     *
     * Rỗng khi backend chưa trả `rateMix` — lúc đó thẻ lùi về in một tỉ lệ trung bình (`rates`).
     *
     * Số in ra là PHÍ của mỗi mức chứ không phải học phí gốc: ba con số ấy cộng đúng bằng
     * "Doanh thu tạm tính" ngay phía trên, nên người đọc tự kiểm được. Lấy học phí gốc thì
     * chúng cộng ra một số không có mặt trên thẻ.
     */
    const rateRows = (() => {
        const mix = (props.rateMix ?? []).filter((r) => r.baseAmount > 0);
        if (mix.length <= MAX_RATE_ROWS) return mix.map((r) => ({ ...r, other: false }));

        const head = mix.slice(0, MAX_RATE_ROWS - 1).map((r) => ({ ...r, other: false }));
        const tail = mix.slice(MAX_RATE_ROWS - 1);
        return [...head, {
            parentFeePercent: 0,
            tutorFeePercent: 0,
            baseAmount: tail.reduce((s, r) => s + r.baseAmount, 0),
            fee: tail.reduce((s, r) => s + r.fee, 0),
            bookings: tail.reduce((s, r) => s + r.bookings, 0),
            other: true,
        }];
    })();

    /* ─── Dòng "mức phí đang áp dụng" đã BỎ HẲN (03/09/2026, theo yêu cầu) ────────
     *
     * Nó từng nằm ngay dưới phép cộng, nền hổ phách: "Lịch đặt TỪ NAY tính mức X + Y, đặt ngày
     * D. Phí chốt lúc khách bấm đặt và không hồi tố…". Bỏ vì đây là thẻ dùng để THUYẾT TRÌNH,
     * mà dòng ấy nói về lịch CHƯA tồn tại — trong khi mọi con số còn lại trên thẻ đều nói về
     * tiền đã phát sinh. Hai thì khác nhau đứng cạnh nhau chính là thứ làm người xem lạc.
     *
     * Không mất thông tin: hàng "N mức phí trong kỳ" ngay trên đã kể đủ thành phần thật của kỳ,
     * và mức đang cấu hình vẫn còn trong tooltip ⓘ của tiêu đề cho ai cần tra.
     *
     * Cùng lượt này bỏ luôn `RATE_DRIFT_TOLERANCE` và `CommissionPercents.changedAt` — cả hai
     * chỉ tồn tại để nuôi dòng đó. Muốn dựng lại thì phải dựng lại cả ba, và đọc kỹ lý do bỏ
     * trước đã.
     */


    /**
     * Tooltip gánh phần mặt thẻ cố ý không in: trị số học phí gốc, hai khoản phí, và mức đang
     * cấu hình — từ 03/09/2026 đây là chỗ DUY NHẤT trên thẻ nói mức đang áp cho lịch mới.
     *
     * Từ 03/09/2026 KHÔNG còn con số phần trăm nào viết cứng trong chuỗi này. Bản trước ghi
     * "Chip −5% / +5% và cả phí sàn 10% … ra khoảng 9,5% chứ không phải 10%" — bốn con số chết,
     * và cả bốn nói sai ngay khi admin đổi mức, đúng điều mà doc của `useCommissionPercents`
     * đã dặn là không được làm.
     */
    const allocationHint =
        'Phần Tutora giữ lại từ các lịch ĐẶT trong kỳ, tính theo giá hợp đồng chốt lúc khách bấm'
        + ' đặt — nên gọi là TẠM TÍNH, chưa phải tiền thật.'
        + `\n\nHọc phí gốc của kỳ (giá gia sư niêm yết) là ${moneyVnd(baseAmount)}, tách thành`
        + ` ${moneyVnd(tutorCut)} phí gia sư và ${moneyVnd(parentFee)} phí phụ huynh. Phí gia sư`
        + ' trừ vào bên trong học phí gốc, còn phí phụ huynh cộng thêm lên trên.'
        // Vế gia sư không còn trên mặt thẻ (bỏ 03/09/2026), nên tooltip phải chỉ cách suy lại nó
        // — nếu không, con số ấy biến mất khỏi cả trang mà không ai biết tìm ở đâu.
        + `\n\nPhần chuyển về gia sư là ${moneyVnd(tutorReceivable)}: lấy "Giá trị lịch đặt" ở`
        + ' đầu trang trừ đi con số này.'
        + '\n\nTỉ lệ hiện trên thẻ là mức phí THẬT của từng lịch, chốt lúc đặt và không hồi tố.'
        + ' Đổi mức phí không làm đổi lịch đã đặt, nên một kỳ có thể chứa nhiều mức cùng lúc.'
        + (percents
            ? `\n\nMức đang cấu hình: ${percents.tutor}% phí gia sư + ${percents.parent}% phí phụ`
              + ' huynh, áp cho lịch đặt từ nay trở đi.'
            : '')
        + '\n\nĐây là cách chia THEO HỢP ĐỒNG. Với lịch bị huỷ giữa chừng, số thực nhận ít hơn:'
        + ' phần đã thành tiền thật xem ở tab Gia sư (phí gia sư) và tab Phụ huynh/học sinh (phí dịch vụ).';

    /**
     * Tooltip của hàng "N mức phí trong kỳ".
     *
     * Phải trả lời đúng câu người đọc hỏi đầu tiên: vì sao MỘT kỳ lại có NHIỀU mức phí.
     */
    const rateMixHint =
        'Mỗi lịch giữ nguyên mức phí đã chốt lúc khách bấm đặt, nên một kỳ có bao nhiêu lần đổi'
        + ' mức thì có bấy nhiêu mức cùng chạy song song.'
        + '\n\nSố bên cạnh mỗi mức là phần doanh thu tạm tính sinh ra ở mức đó. Cộng tất cả ra'
        + ' đúng “Doanh thu tạm tính” ngay phía trên — không dư, không thiếu.'
        + '\n\nMức nào chiếm nhiều tiền nhất đứng trước. Các mức nhỏ nhất gộp vào “mức khác” khi'
        + ' danh sách quá dài, nhưng tổng vẫn khít.';

    /**
     * Tooltip của lát "Đã thu được".
     *
     * Lý do phải có: con số này TRÙNG với phần "dạy học" ở viên thuốc xanh đầu biểu đồ, và
     * người đọc cần biết trùng đó là CỐ Ý chứ không phải trùng hợp — cũng như biết khi nào nó
     * hết trùng, để lúc lệch thì không tưởng là lỗi.
     */
    const maturedHint =
        'Phí sàn của các lịch đặt trong kỳ đã thành tiền thật tính tới cuối kỳ. Khoá đang chạy'
        + ' tính theo buổi đã dạy; khoá đã đóng thì đọc thẳng sổ ví, vì lúc đó tiền thực giữ mới'
        + ' là con số đúng.'
        + '\n\nĐây cũng chính là phần ‘dạy học’ của Doanh thu đã ghi nhận ở đầu biểu đồ phía'
        + ' trên — hai chỗ dùng chung một cách tính.'
        + '\n\nVới kỳ báo cáo rất ngắn hai số có thể lệch nhau: số ở đây gom theo NGÀY ĐẶT LỊCH,'
        + ' còn doanh thu ghi nhận gom theo NGÀY DẠY, nên buổi dạy trong kỳ của một khoá đặt từ'
        + ' trước kỳ chỉ vào một bên.';

    return (
        <section className="rev-alloc" aria-labelledby="rev-alloc-title">
            <div className="rev-alloc-main">
                {/* Tiêu đề đổi từ "Phân bổ giá trị lịch đặt" 03/09/2026, cùng lượt bỏ vế
                    "Gia sư nhận". Bắt buộc phải đổi: chữ "phân bổ" hứa một phép chia, mà thẻ
                    chỉ còn MỘT vế thì không còn gì được chia nữa — giữ tiêu đề cũ là để lại
                    một lời hứa suông ngay dòng đầu. */}
                <h4 className="rev-alloc-title" id="rev-alloc-title">
                    Doanh thu tạm tính
                    <InfoHint text={allocationHint} />

                    {/* Chú thích màu, chỉ hiện khi kỳ có NHIỀU mức phí.
                        Kỳ một mức thì dòng tỉ lệ ngay dưới đã viết thẳng "phí gia sư … phí phụ
                        huynh" nên chú thích này chỉ là chữ thừa. Hai vế xếp đúng thứ tự chúng
                        xuất hiện trong "5% + 5%" — vị trí là manh mối thứ hai bên cạnh màu, để
                        người không phân biệt được màu vẫn đọc ra được vế nào là vế nào. */}
                    {rateRows.length > 1 && (
                        <span className="rev-rate-legend">
                            <span className="rev-rate-legend-item">
                                <span className="rev-rate-swatch is-tutor" aria-hidden="true" />
                                phí gia sư
                            </span>
                            <span className="rev-rate-legend-item">
                                <span className="rev-rate-swatch is-parent" aria-hidden="true" />
                                phí phụ huynh
                            </span>
                        </span>
                    )}
                </h4>

                {/* ─── Vế "Gia sư nhận" đã BỎ (03/09/2026, theo yêu cầu) ──────────────
                    Kéo theo ba thứ biến mất cùng nó, đều là hệ quả bắt buộc chứ không phải
                    lựa chọn thêm: dấu `+` (không còn số hạng thứ hai để cộng), nhãn "Doanh thu
                    tạm tính" trong thân thẻ (tiêu đề gánh rồi), và cả lưới `.rev-eq`.

                    `.rev-eq` sinh ra để ghim HAI con số lớn lên cùng một đường baseline qua
                    grid 3 cột đặt vị trí tường minh. Còn một số thì nó thành một lưới một cột —
                    tức không còn là lưới. Nên chuyển hẳn sang `.rev-alloc-figure`, một flex cột
                    đơn giản. Số tiền GIỮ NGUYÊN class `rev-eq-value rev-eq-c3` vì viên thuốc
                    nền hổ phách nằm ở đó; hai thuộc tính grid trong selector là no-op ngoài
                    lưới. Muốn dựng lại vế gia sư thì phải khôi phục cả `.rev-eq`.

                    Con số gia sư nhận KHÔNG mất hẳn: nó vẫn suy được bằng "Giá trị lịch đặt" ở
                    thẻ đầu trang trừ đi con số này, và tooltip ⓘ vẫn nói rõ quan hệ đó. */}
                <div className="rev-alloc-figure">
                    <span className="rev-eq-value rev-eq-c3">
                        <VndAmount value={commissionSold} />
                    </span>

                    {/* Cấu trúc phí hai vế, nói bằng TỈ LỆ chứ không bằng trị số — hai trị số
                        cộng lại đúng bằng con số ngay trên đầu nên in ra là nói ba lần một
                        chuyện. Mẫu số gọi tên ngay trong câu: không có nó thì đọc "5,2%" mà
                        không biết 5,2% của cái gì, và giá trị lịch đặt ở thẻ đầu trang lại là
                        một mẫu số khác (đã cộng phí phụ huynh) nên rất dễ lấy nhầm. */}
                    {rateRows.length > 1 ? (
                        <p className="rev-eq-rates is-mixed">
                            <span className="rev-eq-rates-lead">
                                {rateRows.length} mức phí trong kỳ
                                <InfoHint text={rateMixHint} />
                            </span>
                            {rateRows.map((r) => (
                                <span
                                    className="rev-eq-rate-item"
                                    key={r.other ? 'other' : `${r.tutorFeePercent}-${r.parentFeePercent}`}
                                >
                                    <b>
                                        {r.other ? 'mức khác' : (
                                            <>
                                                {/* `title` để chuột dừng lại là biết, không phải
                                                    dò lên chú thích màu ở tiêu đề. */}
                                                <span className="rev-rate-tutor" title="phí gia sư">
                                                    {onePct(r.tutorFeePercent)}
                                                </span>
                                                {' + '}
                                                <span className="rev-rate-parent" title="phí phụ huynh">
                                                    {onePct(r.parentFeePercent)}
                                                </span>
                                            </>
                                        )}
                                    </b>
                                    {/* Không kèm "VND" ở đây: đơn vị đã được con số lớn ngay
                                        trên đầu xác lập, lặp ba lần trong một dòng chỉ là nhiễu. */}
                                    <span className="rev-eq-rate-amt">{money(r.fee)}</span>
                                </span>
                            ))}
                        </p>
                    ) : rateRows.length === 1 ? (
                        <p className="rev-eq-rates">
                            {/* Dòng này tự gọi tên hai vế nên không cần chú thích màu ở tiêu đề,
                                nhưng vẫn tô đúng hai màu ấy: người xem học được bảng màu ở kỳ
                                một mức, rồi đọc được ngay khi kỳ sau pha nhiều mức. */}
                            phí gia sư <b className="rev-rate-tutor">{onePct(rateRows[0].tutorFeePercent)}</b>
                            <span className="rev-eq-rates-op" aria-hidden="true">+</span>
                            phí phụ huynh <b className="rev-rate-parent">{onePct(rateRows[0].parentFeePercent)}</b>
                            <span className="rev-eq-rates-of">của học phí gốc</span>
                        </p>
                    ) : rates && (
                        /* Backend cũ chưa trả `rateMix`: lùi về tỉ lệ trung bình. Đọc được khi kỳ
                           chỉ chạy một mức, còn kỳ pha nhiều mức thì nó ra một con số không trùng
                           mức nào — đó chính là lý do có `rateMix`. */
                        <p className="rev-eq-rates">
                            phí gia sư <b>{pct(rates.tutor)}</b>
                            <span className="rev-eq-rates-op" aria-hidden="true">+</span>
                            phí phụ huynh <b>{pct(rates.parent)}</b>
                            <span className="rev-eq-rates-of">của học phí gốc</span>
                        </p>
                    )}
                </div>

                {/* Ba số phận của doanh thu tạm tính — khôi phục 02/09/2026.

                    Khoá đã chốt sổ đọc SỔ VÍ, khoá đang chạy dùng công thức `EarnedSoFar` (phí phụ
                    huynh đã chín + phí gia sư của buổi đã dạy). Đã kiểm nó tái lập đúng ví dụ
                    chuẩn của doc §2.1 (khoá 100k/10 buổi, học 1 buổi rồi huỷ → đã chín 5.500, gồm
                    cả 4.500 phí dịch vụ không hoàn).

                    Bản phục hồi đầu tiên cố ý KHÔNG đọc sổ ví, và đó là một sai lầm đã sửa trong
                    cùng ngày: `recognisedRevenue` ở viên thuốc phía trên vẫn cộng phần chênh chốt
                    sổ suy từ ví, nên trang in hai con số cho cùng một ý niệm (461.000 và 458.500)
                    mà không có cách nào tự nối. Đừng tách chính sách của hai chỗ này ra lần nữa.

                    Một HÀNG NGANG chứ không phải vành khuyên: tỉ lệ ba lát vẫn lệch tới mức không
                    vẽ hình được. Chữ nói tỉ lệ chính xác, hình thì không.

                    Bộ từ "Đã thu được / Còn chờ / Không thu được" là quy ước đã chốt 31/08/2026
                    cho ba số phận của khoản tạm tính — đừng đặt tên khác. Bản dựng lại đầu tiên
                    dùng "Đã chín" (động từ nội bộ của backend) và làm mất cặp phản nghĩa với
                    "Không thu được" ngay cạnh nó.

                    "Không thu được" PHẢI tách khỏi "còn chờ": chờ nghĩa là buổi còn ở phía trước,
                    tiền còn cơ hội về; khoản kia thì hết. Gộp chung là báo một khoản đã chết như
                    thể vẫn đang chờ — và nó sẽ không bao giờ giảm qua các kỳ. */}
                <p className="rev-fate">
                    {/* ⓘ đứng SAU con số, không chen giữa nhãn và số (đổi 03/09/2026).
                        Hai lát còn lại là cặp "nhãn → số" liền mạch; chen icon vào giữa đúng
                        một lát làm lát ấy lệch nhịp so với hai lát kia, và mắt phải nhảy qua
                        icon mới tới được con số. Đặt ở cuối thì cả ba lát cùng một nhịp. */}
                    <span className="rev-fate-item">
                        <span className="rev-fate-dot is-matured" aria-hidden="true" />
                        Đã thu được
                        <b><VndAmount value={matured} /></b>
                        <InfoHint text={maturedHint} />
                    </span>
                    <span className="rev-fate-item">
                        <span className="rev-fate-dot is-pending" aria-hidden="true" />
                        Còn chờ
                        <b><VndAmount value={pending} /></b>
                    </span>
                    <span className="rev-fate-item">
                        <span className="rev-fate-dot is-dead" aria-hidden="true" />
                        Không thu được
                        <b><VndAmount value={unrecoverable} /></b>
                    </span>
                </p>
            </div>
        </section>
    );
};

export default MoneySplit;
