import { money } from '@/utils/formatMoney';
import type { CommissionPercents } from '@/hooks/useCommissionPercents';
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

export interface MoneySplitProps {
    gmv: number;
    /**
     * Học phí gốc — giá gia sư niêm yết. Vừa hiện thành một dòng riêng dưới tiêu đề (mẫu số
     * của hai chip −5% / +5%), vừa dùng để suy ra phí gia sư = học phí gốc − tiền gia sư nhận.
     */
    baseAmount: number;
    tutorReceivable: number;
    /** Doanh thu TẠM TÍNH: phí sàn của mọi lịch đặt trong kỳ, chốt ngay lúc đặt. */
    commissionSold: number;
    /**
     * Ba số phận của `commissionSold`, cộng khít bằng nó theo construction.
     *
     * CỐ Ý tính bằng công thức ở backend (`EarnedSoFar`), KHÔNG đọc sổ ví — nên miễn nhiễm với
     * lỗi đảo escrow từng làm vành khuyên cũ sai. Xem ghi chú "Ba bản đã bỏ" ở dưới.
     */
    commissionMatured: number;
    commissionPending: number;
    commissionUnrecoverable: number;
    /** Tỉ lệ phí sàn đang áp dụng. `null` khi chưa tải xong — chip tự ẩn. */
    percents: CommissionPercents | null;
}

/**
 * Khối chia tiền của tab Doanh thu, viết dưới dạng MỘT PHÉP CỘNG:
 *
 *     [tiêu đề: tiền khách trả]
 *     Gia sư nhận  +  Doanh thu tạm tính
 *
 * Hai cột lớn, cột phải mở thêm hai dòng con vì phí sàn có hai nửa. Tổng nằm ở tiêu đề, cỡ
 * nhỏ — bản trước để nó thành cột thứ nhất của phương trình `tổng = gia sư + Tutora`, nhưng
 * con số đó đã là thẻ đầu của dải chỉ số nên hiện hai lần cùng cỡ chữ lớn.
 *
 * Thẻ này nằm SAU biểu đồ "Dòng tiền theo thời gian" (đổi chỗ 01/09/2026) và có khung trắng
 * riêng — trước đó nó dùng chung khung `.rev-hero` với dải chỉ số.
 *
 * ─── Quy ước từ ngữ dùng chung cả cụm trang lẫn dashboard ─────────────────────
 *
 *   Tiền khách trả       — GMV, tổng tiền khách bỏ ra. KHÔNG phải doanh thu.
 *   Doanh thu tạm tính       — phí sàn chốt lúc đặt lịch. Chưa phải tiền thật.
 *   Doanh thu đã ghi nhận    — doanh thu kế toán của kỳ, neo theo NGÀY DẠY nên khác mốc với
 *                              hai số trên. Hiện ở dashboard và ở tab Gia sư / Khách hàng.
 *
 * Chữ "hoa hồng" đã bỏ hẳn khỏi giao diện.
 *
 * ─── Ba bản đã bỏ, đừng dựng lại bản nào ──────────────────────────────────────
 *
 * 1. **Vành khuyên "Số tạm tính đi về đâu"** (gỡ 01/09/2026). Không phải vì khó hiểu, mà vì
 *    cả ba lát SAI SỐ: chúng suy từ `PlatformKept = cashIn − refunded − released`, mà
 *    `released` đang hụt do lỗi đảo escrow ở backend (escrow là túi chung theo ví gia sư, luồng
 *    huỷ đảo theo số buổi HỢP ĐỒNG nên rút vượt phần khoá đó thực nạp và ăn sang khoá khác).
 *    Đo trên dev 01/09/2026: 950.000đ bị đảo lố, 2 gia sư thiếu 665.000đ; booking #294 phụ huynh
 *    trả đủ 262.500đ, gia sư dạy 3 buổi nhận 0đ mà báo cáo vẫn tính là "đã thu đủ".
 *    Backend VẪN trả `commissionEarned`/`commissionLost` — cố ý giữ để đo lại sau khi sửa xong.
 *    Đừng thay bằng một dòng chữ kiểu "trong đó đã thu được X": X cũng đang phồng.
 *
 * 2. **Hai thanh tỉ lệ "Tiền vào / Tiền ra"**. Tỉ lệ thật là 90,5 / 4,8 / 4,8 — quá lệch để
 *    thanh đọc được, hai thanh chênh nhau đúng 4,8% nên trông y hệt nhau.
 *
 * 3. **Bảng lồng nhau 6 hàng**. Hỏng vì hai lẽ. Một: kéo dãn hàng ra 1350px thì nhãn kết thúc
 *    ở x≈340 còn số của chính hàng đó nằm ở x≈1400 — hơn 1000px trống, mắt lạc hàng. Hai: bảng
 *    trộn hai loại thông tin khác bản chất — ĐÍCH ĐẾN của tiền (gia sư nhận, doanh thu tạm
 *    tính) với BƯỚC TÍNH trung gian (học phí gốc). Chính vì nhét "học phí gốc" vào cùng danh
 *    sách nên mới phải thụt cấp, phải vạch dọc, phải ghi chú từng hàng.
 *
 * Bài học chung của cả ba: **bề ngang phải dùng làm CỘT, không phải để kéo dãn hàng**, và
 * đừng vẽ tỉ lệ khi một lát chưa tới 5%.
 *
 * ─── "Học phí gốc" nằm ở đâu, và vì sao ───────────────────────────────────────
 *
 * Nó KHÔNG phải một hàng ngang hàng với hai vế của phép cộng — đó chính là lỗi của bản bảng
 * 6 hàng (mục 3 ở trên): trộn ĐÍCH ĐẾN của tiền với BƯỚC TÍNH trung gian, nên phải đẻ ra thụt
 * cấp và vạch dọc để phân biệt hai loại.
 *
 * Nhưng nó cũng không thể chỉ nằm trong tooltip: hai chip −5% / +5% tính TRÊN nó, không có nó
 * thì đọc "−5%" mà không biết 5% của cái gì. Nên từ 02/09/2026 nó là một DÒNG BỐI CẢNH cỡ nhỏ
 * ngay dưới tiêu đề — cùng tầng với con số tổng ở góc phải, tách hẳn khỏi phép cộng bên dưới.
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

    /**
     * Tooltip gánh phần mặt thẻ cố ý không in.
     *
     * Từ 02/09/2026 mặt thẻ không còn hai tỉ lệ 90.5% / 9.5% (phần của tiền khách trả),
     * nên tooltip cũng bỏ đoạn giải thích "hai mẫu số khác nhau" — giờ trên thẻ chỉ còn MỘT
     * loại phần trăm là chip −5% / +5%, và học phí gốc đã hiện thành dòng riêng ngay dưới tiêu
     * đề nên người đọc thấy thẳng mẫu số của nó.
     */
    const allocationHint =
        'Toàn bộ giá trị các lịch ĐẶT trong kỳ, theo giá hợp đồng, chia làm hai: phần chuyển về gia'
        + ' sư và phần Tutora giữ lại.'
        + '\n\nHọc phí gốc là giá gia sư niêm yết, bằng gia sư nhận cộng phí gia sư. Phí gia sư'
        + ' trừ vào bên trong khoản đó, còn phí phụ huynh cộng thêm lên trên — nên tiền khách'
        + ' trả luôn lớn hơn học phí gốc.'
        + '\n\nChip −5% / +5% là mức phí tính trên HỌC PHÍ GỐC, không phải trên tiền khách trả.'
        // Nói thẳng để không ai đọc "Gia sư nhận" như số gia sư đã cầm về.
        + '\n\nĐây là cách chia THEO HỢP ĐỒNG, chốt ngay lúc đặt lịch — nên gọi là TẠM TÍNH. Với'
        + ' lịch bị huỷ giữa chừng, số thực nhận ít hơn: phần đã thành tiền thật xem ở tab Gia sư'
        + ' (phí gia sư) và tab Khách hàng (phí dịch vụ).';

    return (
        <section className="rev-alloc" aria-labelledby="rev-alloc-title">
            <div className="rev-alloc-main">
                {/* Con số TỔNG ở góc phải tiêu đề đã bỏ 02/09/2026. Nó từng là mẫu số cho hai
                    tỉ lệ 90.5% / 9.5%; hai tỉ lệ đó bỏ trước rồi nên nó hết việc, mà vẫn lặp lại
                    đúng thẻ đầu của dải chỉ số đầu trang. Tiêu đề nay chỉ còn chữ + ⓘ. */}
                <h4 className="rev-alloc-title" id="rev-alloc-title">
                    Phân bổ giá trị lịch đặt
                    <InfoHint text={allocationHint} />
                </h4>

                {/* Học phí gốc — dòng bối cảnh, là MẪU SỐ của hai chip −5% / +5% bên dưới.
                    Không có nó thì đọc "−5%" mà không biết 5% của cái gì.

                    Câu mô tả "giá gia sư niêm yết, chưa cộng phí" đã bỏ 02/09/2026 — nó lặp
                    lại thứ tooltip ⓘ đã nói kỹ hơn, và làm dòng này dài gần bằng cả hàng số
                    chính bên dưới. */}
                <p className="rev-alloc-base">
                    Học phí gốc
                    <b>
                        <VndAmount value={baseAmount} />
                    </b>
                </p>

                {/* Grid 3 cột / 3 hàng, đặt vị trí TƯỜNG MINH bằng grid-column + grid-row thay
                    vì để hai div con tự xếp. Lý do: hai con số lớn bắt buộc phải nằm đúng một
                    đường baseline thì mắt mới đọc được thành một phép cộng. Cột phải cao hơn
                    (có thêm hai dòng con) nên để tự xếp là lệch ngay, và dấu + cũng không còn
                    cách nào canh cho khớp hàng số.

                    Tên class vẫn là `c2` / `c3` / `o2` dù giờ chỉ còn hai vế: `c1`/`o1` là cột
                    tổng và dấu = đã bỏ. Giữ nguyên tên để khỏi đổi một loạt selector cho một
                    thay đổi thuần đánh số. */}
                <div className="rev-eq">
                    <span className="rev-eq-label rev-eq-c2">Gia sư nhận</span>
                    <span className="rev-eq-value rev-eq-c2">
                        <VndAmount value={tutorReceivable} />
                    </span>

                    <span className="rev-eq-op rev-eq-o2" aria-hidden="true">+</span>

                    <span className="rev-eq-label rev-eq-c3">Doanh thu tạm tính</span>
                    <span className="rev-eq-value rev-eq-c3">
                        <VndAmount value={commissionSold} />
                    </span>

                    {/* Hai nửa của phí sàn. Số căn trái thành một cột để mắt thấy ngay chúng
                        BẰNG NHAU — sự thật dễ nhớ nhất về cấu trúc phí 5%+5%, mà cả ba bản
                        trước đều giấu mất.

                        Grid ĐÚNG HAI cột (số | tên+chip), chip nằm BÊN TRONG ô tên chứ không
                        phải cột thứ ba. Mức phí đọc từ cấu hình admin nên `percents` có thể là
                        `null` lúc chưa tải xong; nếu chip là một ô grid riêng thì lúc đó hàng
                        thứ hai sẽ trượt lên chỗ trống của hàng đầu và cả khối lệch hẳn. */}
                    <div className="rev-eq-parts">
                        <span className="rev-eq-part-amt"><VndAmount value={tutorCut} /></span>
                        <span className="rev-eq-part-name">
                            phí gia sư
                            {percents && <span className="rev-alloc-rate">−{percents.tutor}%</span>}
                        </span>

                        <span className="rev-eq-part-amt"><VndAmount value={parentFee} /></span>
                        <span className="rev-eq-part-name">
                            phí phụ huynh
                            {percents && <span className="rev-alloc-rate">+{percents.parent}%</span>}
                        </span>
                    </div>
                </div>

                {/* Ba số phận của doanh thu tạm tính — khôi phục 02/09/2026, nhưng tính bằng
                    CÁCH KHÁC hẳn bản vành khuyên đã gỡ.

                    Bản cũ đọc `PlatformKept` từ sổ ví, mà ví đang sai vì lỗi đảo escrow → cả ba
                    lát sai số. Bản này chỉ dùng công thức `EarnedSoFar` (phí phụ huynh đã chín +
                    phí gia sư của buổi đã dạy), không chạm sổ ví một dòng nào. Đã kiểm nó tái lập
                    đúng ví dụ chuẩn của doc §2.1 (khoá 100k/10 buổi, học 1 buổi rồi huỷ → đã chín
                    5.500, gồm cả 4.500 phí dịch vụ không hoàn).

                    Một HÀNG NGANG chứ không phải vành khuyên: tỉ lệ ba lát vẫn lệch tới mức không
                    vẽ hình được (đã thu 25%, không thu 49%, chờ 26% — riêng lát nhỏ nhất từng chỉ
                    còn 4,8% ở kỳ khác). Chữ nói tỉ lệ chính xác, hình thì không.

                    Bộ từ "Đã thu được / Còn chờ / Không thu được" là quy ước đã chốt 31/08/2026
                    cho ba số phận của khoản tạm tính — đừng đặt tên khác. Bản dựng lại đầu tiên
                    dùng "Đã chín" (động từ nội bộ của backend) và làm mất cặp phản nghĩa với
                    "Không thu được" ngay cạnh nó.

                    "Không thu được" PHẢI tách khỏi "còn chờ": chờ nghĩa là buổi còn ở phía trước,
                    tiền còn cơ hội về; khoản kia thì hết. Gộp chung là báo một khoản đã chết như
                    thể vẫn đang chờ — và nó sẽ không bao giờ giảm qua các kỳ. */}
                <p className="rev-fate">
                    <span className="rev-fate-item">
                        <span className="rev-fate-dot is-matured" aria-hidden="true" />
                        Đã thu được
                        <b><VndAmount value={matured} /></b>
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
