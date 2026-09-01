import { Fragment } from 'react';
import { money, moneyVnd } from '@/utils/formatMoney';
import { DonutChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';
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

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

export interface MoneySplitProps {
    gmv: number;
    /**
     * Học phí gốc — mẫu số của mức phí sàn 10%.
     *
     * Prop này từng bị bỏ với lý do "dải chỉ số phía trên đã mang con số đó rồi". Nay đưa
     * lại vì khối này không còn chỉ in con số: thanh "Tiền vào" cần tỉ lệ gốc/phí phụ huynh
     * để vẽ, mà tỉ lệ thì không suy ra được từ dải chỉ số.
     */
    baseAmount: number;
    tutorReceivable: number;
    /** Doanh thu TẠM TÍNH: phí sàn của mọi lịch đặt trong kỳ, chốt ngay lúc đặt. */
    commissionSold: number;
    /** Phần đã THU ĐƯỢC của số tạm tính trên — phí phụ huynh (chỉ sau khi buổi đầu đã dạy)
     *  cộng phí gia sư của từng buổi đã dạy xong. */
    commissionEarned: number;
    /**
     * Phần doanh thu tạm tính mà Tutora không thu được: khoá bị huỷ, hoặc khách trả đợt 1
     * rồi bỏ dở nên hệ thống đóng khoá.
     *
     * Phải là lát RIÊNG trên vành khuyên, không gộp vào "Còn chờ": chờ nghĩa là buổi học
     * còn ở phía trước và tiền vẫn có cơ hội về, còn khoản này thì hết cơ hội. Gộp chung là
     * báo cáo một khoản đã mất như thể vẫn đang chờ.
     */
    commissionLost: number;
    /** Tỉ lệ phí sàn đang áp dụng. `null` khi chưa tải xong — phần chú thích tự ẩn. */
    percents: CommissionPercents | null;
}

/**
 * Khối chia tiền của tab Doanh thu: tiền phụ huynh trả được chia theo HAI cách, và bao
 * nhiêu phần trong đó đã thành tiền thật của Tutora.
 *
 * ─── Quy ước từ ngữ dùng thống nhất cả cụm trang lẫn dashboard ─────────────────
 *
 *   Tiền phụ huynh trả       — GMV, tổng tiền khách bỏ ra. KHÔNG phải doanh thu.
 *   Doanh thu tạm tính       — phí sàn chốt lúc đặt lịch. Chưa phải tiền thật.
 *   Đã thu được / Còn chờ /
 *   Không thu được           — ba số phận của chính khoản tạm tính đó.
 *   Doanh thu đã ghi nhận    — doanh thu kế toán của kỳ. Phí phụ huynh neo theo NGÀY BUỔI
 *                              ĐẦU dạy xong, phí gia sư neo theo NGÀY DẠY của từng buổi
 *                              (khác mốc với bốn số trên). Hiện ở dashboard và ở đường liền
 *                              của biểu đồ "Dòng tiền theo thời gian".
 *
 * Chữ "hoa hồng" đã bỏ hẳn: cùng một khoản tiền mà chỗ gọi hoa hồng, chỗ gọi doanh thu,
 * chỗ gọi phí dịch vụ thì người đọc không biết ba con số đó có phải một hay không.
 *
 * Hai thanh, mỗi thanh là một cách chia của CÙNG một tổng:
 *
 *     Tiền vào :  học phí gốc  +  phí phụ huynh      = tiền phụ huynh trả
 *     Tiền ra  :  gia sư nhận  +  doanh thu tạm tính = tiền phụ huynh trả
 *
 * Vì cùng tổng nên hai thanh luôn dài bằng nhau, và so được với nhau. Đây KHÔNG phải bốn
 * phần của một tổng — cộng cả bốn sẽ ra gấp đôi số tiền thật, nên chỗ này không thể vẽ
 * bằng biểu đồ tròn dù nhìn qua rất giống một ca dùng biểu đồ tròn.
 *
 * Bản thân con số tổng nằm ở dải chỉ số ngay trên nên ở đây không in lại; mỗi thanh tự nó
 * là 100%.
 *
 * ─── Khoá đã đóng sổ nằm ở đâu trong thẻ này ───────────────────────────────────
 *
 * Chúng nằm TRONG cả hai thanh, theo giá hợp đồng như mọi khoá khác. Trước đây khoá bị huỷ
 * bị loại khỏi báo cáo, nên một khoá phụ huynh đã trả 105.000đ và đã học một buổi lại hiện
 * "Tiền phụ huynh trả 0đ" ngay cạnh thẻ "Đã hoàn tiền 90.000đ" — hai con số tự mâu thuẫn
 * trên cùng một hàng.
 *
 * Phần thực sự thành tiền của chúng kể ở vành khuyên bên phải: `commissionEarned` lấy số
 * Tutora THỰC GIỮ theo sổ ví, phần hụt so với hợp đồng vào lát `commissionLost`.
 *
 * `summary.commissionFromCancelled` thì vẫn CỐ Ý không vẽ ở đây. Nó là số luỹ kế CẢ ĐỜI
 * khoá, quy về ngày huỷ — trong khi mọi con số của thẻ này neo theo "booking tạo trong kỳ",
 * và phí của những buổi đã dạy trong chính khoá đó có thể đã ghi nhận từ kỳ trước. Cộng nó
 * vào bất kỳ tổng nào ở đây cũng là tính hai lần. Nó chỉ để đối soát với sổ ví.
 */
const MoneySplit = (props: MoneySplitProps) => {
    const { percents } = props;
    const gmv = num(props.gmv);
    const tutorReceivable = num(props.tutorReceivable);
    const commissionSold = num(props.commissionSold);
    const commissionEarned = num(props.commissionEarned);
    const commissionLost = num(props.commissionLost);
    // Ba lát cộng lại đúng bằng commissionSold, nên "chờ" là phần dư — không tính riêng.
    const pending = Math.max(commissionSold - commissionEarned - commissionLost, 0);

    // Phí phụ huynh = phần cộng thêm vào học phí gốc. Chặn dưới ở 0 phòng khi backend cũ
    // chưa trả `baseAmount` và phép trừ ra số âm.
    const baseAmount = num(props.baseAmount);
    const parentFee = Math.max(gmv - baseAmount, 0);

    // Bốn tỉ lệ, hai thanh. Mỗi thanh tự nó là 100% của cùng một tổng `gmv`.
    const baseShare = pct(baseAmount, gmv);
    const parentFeeShare = pct(parentFee, gmv);
    const tutorShare = pct(tutorReceivable, gmv);
    const platformShare = pct(commissionSold, gmv);

    /**
     * Hai tỉ lệ hiện trên thẻ dùng hai mẫu số khác nhau — % trong phần chú thích là phần của
     * TIỀN PHỤ HUYNH TRẢ, còn mức phí sàn tính trên HỌC PHÍ GỐC. Nói rõ chỗ này trong tooltip
     * để trên mặt thẻ không phải nhồi thêm chữ.
     */
    const allocationHint =
        'Toàn bộ tiền phụ huynh trả cho các lịch đặt trong kỳ chia làm hai phần: tiền gia sư'
        + ' nhận và doanh thu tạm tính của Tutora. Hai phần luôn cộng lại thành 100%.'
        // Nói thẳng ở đây để không ai đọc thanh dưới như "số gia sư đã cầm về": với lịch bị
        // huỷ giữa chừng, thanh này vẫn vẽ theo giá hợp đồng, còn số thực nhận thì ít hơn.
        + '\n\nHai thanh này là cách chia THEO HỢP ĐỒNG, chốt ngay lúc đặt lịch — nên gọi là'
        + ' TẠM TÍNH. Với lịch bị huỷ giữa chừng, phần thực sự thành tiền xem ở vành khuyên bên'
        + ' phải (Tutora) và ở tab Gia sư (gia sư nhận).'
        + (percents
            ? `\n\nDoanh thu tạm tính gồm ${percents.parent}% phí phụ huynh cộng thêm vào giá và `
              + `${percents.tutor}% phí gia sư trừ vào tiền gia sư nhận — tổng `
              + `${percents.total}% HỌC PHÍ GỐC. Lấy số này chia cho tiền phụ huynh trả thì `
              + 'ra tỉ lệ nhỏ hơn, vì tiền phụ huynh trả đã gồm sẵn phần phí cộng thêm.'
            : '');

    const statusHint =
        'Số tạm tính bên trái đi về đâu. Hai vế của nó chín ở hai thời điểm khác nhau, vì tiền'
        + ' nằm trong escrow chứ chưa vào túi Tutora:'
        + '\n\n• Phí phụ huynh thành tiền thật khi BUỔI ĐẦU đã dạy xong — không phải lúc thanh'
        + ' toán. Trước buổi đầu, phụ huynh huỷ được và nhận lại 100% KỂ CẢ phí dịch vụ, nên'
        + ' khoản đó vẫn chỉ là tạm tính. Qua buổi đầu rồi thì huỷ giữa chừng chỉ hoàn giá gốc.'
        + '\n\n• Phí gia sư thì tính theo từng buổi dạy xong: buổi chưa dạy thì escrow bị đảo,'
        + ' gia sư không nhận nên Tutora cũng chưa có gì để cắt. Phần này còn nằm ở "Còn chờ".'
        + '\n\nKhoá đã đóng sổ — bị huỷ, hoặc khách trả đợt 1 rồi bỏ dở — thì con số được chốt'
        + ' theo sổ ví: phần Tutora thực giữ (gồm cả phí dịch vụ không hoàn của những buổi bị'
        + ' huỷ) vào "Đã thu được", phần còn lại vào "Không thu được" — đã mất hẳn, không còn'
        + ' cơ hội thu, nên không nằm trong phần còn chờ.'
        // Cảnh báo bắt buộc: đây là con số dễ bị nhầm nhất trên cả cụm trang.
        + '\n\nBa lát này tính trên các lịch ĐẶT trong kỳ và luỹ kế tới hôm nay. Chỉ số "Doanh'
        + ' thu đã ghi nhận" ở dashboard thì neo theo ngày buổi ĐẦU dạy xong (phần phí phụ'
        + ' huynh) và ngày dạy từng buổi (phần phí gia sư), và chỉ tính trong kỳ — khác mốc nên'
        + ' hai con số không bằng nhau, đó không phải lỗi.';

    return (
        <section className="rev-alloc" aria-labelledby="rev-alloc-title">
            <div className="rev-alloc-main">
                <h4 className="rev-alloc-title" id="rev-alloc-title">
                    Phân bổ tiền phụ huynh trả
                    <InfoHint text={allocationHint} />
                </h4>

                {/* HAI thanh, cùng một tổng nên dài bằng nhau — đó là toàn bộ mẹo của khối này.
                    Trên là "tiền đến từ đâu", dưới là "tiền đi về đâu": hai cách chia KHÁC NHAU
                    của cùng số tiền phụ huynh trả, không phải bốn phần của một tổng (cộng cả
                    bốn sẽ ra gấp đôi số thật — đó là lý do chỗ này không thể là biểu đồ tròn).

                    CHỈ HAI MÀU cho cả bốn đoạn, không phải bốn sắc độ: nhạt = tiền rời khỏi
                    Tutora, sẫm = phần Tutora giữ lại. Nhờ vậy mắt thấy khối sẫm NỞ RA từ thanh
                    trên (4.8%) xuống thanh dưới (9.5%) và tự hiểu doanh thu tạm tính = phí phụ huynh CỘNG
                    phí gia sư. Bốn sắc độ gần nhau thì thông điệp đó chìm mất, mà lại thành bốn
                    thứ phải phân biệt.

                    Chú thích nằm NGAY DƯỚI thanh của nó, không gom thành một khối riêng: đứng
                    cạnh nhau thì không phải dò màu để ghép tên với đoạn. */}
                <div className="rev-alloc-flow">
                    {[
                        {
                            label: 'Tiền vào',
                            left: { name: 'Học phí gốc', value: baseAmount, share: baseShare, rate: null },
                            right: {
                                name: 'Phí phụ huynh',
                                value: parentFee,
                                share: parentFeeShare,
                                // Dấu + vì khoản này CỘNG THÊM lên học phí gốc, không trừ đi.
                                rate: percents ? `+${percents.parent}%` : null,
                            },
                        },
                        {
                            label: 'Tiền ra',
                            left: {
                                name: 'Gia sư nhận',
                                value: tutorReceivable,
                                share: tutorShare,
                                // Dấu − vì phí gia sư TRỪ VÀO phần gia sư được nhận.
                                rate: percents ? `−${percents.tutor}%` : null,
                            },
                            right: {
                                name: 'Doanh thu tạm tính',
                                value: commissionSold,
                                share: platformShare,
                                rate: percents ? `${percents.total}%` : null,
                            },
                        },
                    ].map((row) => (
                        // Fragment chứ không phải <div> bọc: nhãn / thanh / chú thích phải là
                        // con TRỰC TIẾP của cùng một grid thì cột nhãn mới dùng chung bề rộng.
                        // Bọc mỗi hàng trong div riêng thì `max-content` tính lại cho từng
                        // hàng, "Tiền vào" rộng hơn "Tiền ra", và hai thanh lệch nhau — hỏng
                        // đúng tiền đề "cùng tổng nên dài bằng nhau" của cả khối.
                        <Fragment key={row.label}>
                            <span className="rev-alloc-flow-label">{row.label}</span>
                            <div
                                className="rev-alloc-bar"
                                role="img"
                                aria-label={`${row.left.name} ${moneyVnd(row.left.value)}, ${row.right.name} ${moneyVnd(row.right.value)}`}
                            >
                                <span
                                    className="rev-alloc-seg is-out"
                                    style={{ width: `${row.left.share}%` }}
                                />
                                <span
                                    className="rev-alloc-seg is-keep"
                                    style={{ width: `${row.right.share}%` }}
                                />
                            </div>
                            <p className="rev-alloc-parts">
                                <span className="rev-alloc-part">
                                    <span className="rev-alloc-dot is-out" aria-hidden="true" />
                                    {row.left.name}
                                    {/* Tỉ lệ phí đọc từ cấu hình admin, KHÔNG viết cứng —
                                        `null` khi chưa tải xong thì chip tự ẩn, vì đoán một
                                        con số còn tệ hơn không nói gì. Đây là tỉ lệ trên HỌC
                                        PHÍ GỐC, khác với tỉ lệ chiều dài của thanh (tính trên
                                        tiền phụ huynh trả) — nên trên thẻ chỉ hiện đúng MỘT
                                        loại phần trăm để không ai phải đoán đang đọc loại nào. */}
                                    {row.left.rate && (
                                        <span className="rev-alloc-rate">{row.left.rate}</span>
                                    )}
                                    <b>
                                        <VndAmount value={row.left.value} />
                                    </b>
                                </span>
                                <span className="rev-alloc-part">
                                    <span className="rev-alloc-dot is-keep" aria-hidden="true" />
                                    {row.right.name}
                                    {row.right.rate && (
                                        <span className="rev-alloc-rate">{row.right.rate}</span>
                                    )}
                                    <b>
                                        <VndAmount value={row.right.value} />
                                    </b>
                                </span>
                            </p>
                        </Fragment>
                    ))}
                </div>
            </div>

            <div className="rev-alloc-aside">
                <h4 className="rev-alloc-title">
                    Số tạm tính đi về đâu
                    <InfoHint text={statusHint} />
                </h4>

                {commissionSold > 0 ? (
                    /* `showCenter={false}`: số ở tâm vành khuyên là tổng của ba lát — đúng con
                       số đã in ở dòng "Doanh thu tạm tính" của cột trái, cách chưa tới 400px
                       trong CÙNG thẻ. Bỏ đi là áp đúng nguyên tắc "hai khối cố ý không lặp
                       con số của nhau" mà tab này đang theo.

                       Bỏ xong thì lỗ donut hết phải chứa chuỗi tiền đầy đủ, nên hạ được
                       chiều cao 168 → 132 mà vành lại DÀY HƠN trước (22.4px so với 18.5px)
                       nhờ `ring="thick"` — vừa thấp hơn vừa dễ nhìn hơn, không đánh đổi.
                       Cột phải nhờ đó khớp chiều cao cột trái, hết 39px trống chết ở đáy. */
                    /* Lát "Mất do huỷ" chỉ xuất hiện khi thật sự có — một lát 0đ nằm im trong
                       chú giải chỉ làm người đọc đi tìm xem nó ở đâu trên vành. Màu đỏ dùng
                       chung với cột hoàn tiền của biểu đồ bên dưới: cùng một câu chuyện tiền
                       rời khỏi Tutora. */
                    <DonutChart
                        height={132}
                        showCenter={false}
                        ring="thick"
                        colors={[PALETTE.emerald, PALETTE.amber, PALETTE.red]}
                        data={[
                            { name: 'Đã thu được', value: commissionEarned },
                            { name: 'Còn chờ', value: pending },
                            ...(commissionLost > 0
                                ? [{ name: 'Không thu được', value: commissionLost }]
                                : []),
                        ]}
                    />
                ) : (
                    <p className="rev-alloc-note" style={{ marginTop: 12 }}>
                        Chưa phát sinh doanh thu trong kỳ.
                    </p>
                )}
            </div>

        </section>
    );
};

export default MoneySplit;
