import { money, moneyVnd } from '@/utils/formatMoney';
import { DonutChart } from '@/components/shared/RevenueCharts/RevenueCharts';
import { PALETTE } from '@/components/shared/RevenueCharts/revenueChartTheme';
import type { CommissionPercents } from '@/hooks/useCommissionPercents';
import InfoHint from './InfoHint';

/**
 * Bốn trường của khối này mới thêm vào API. Nếu backend chưa được nạp bản mới, chúng về
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
    tutorReceivable: number;
    commissionSold: number;
    commissionEarned: number;
    commissionFromCancelled: number;
    /** Tỉ lệ phí sàn đang áp dụng. `null` khi chưa tải xong — phần chú thích tự ẩn. */
    percents: CommissionPercents | null;
}

/**
 * Khối chia tiền của tab Doanh thu: phần gia sư nhận, hoa hồng Tutora, và bao nhiêu
 * hoa hồng trong đó đã thành doanh thu thật.
 *
 * Hai số trong thanh luôn cộng lại thành tổng tiền phụ huynh trả — con số đó nằm ở dải
 * chỉ số ngay trên, nên ở đây không lặp lại lần nữa; thanh phân bổ tự nó là 100%.
 *
 * Hoa hồng từ booking đã hủy được tách xuống chân thẻ vì nó nằm ngoài phép cộng đó.
 */
const MoneySplit = (props: MoneySplitProps) => {
    const { percents } = props;
    const gmv = num(props.gmv);
    const tutorReceivable = num(props.tutorReceivable);
    const commissionSold = num(props.commissionSold);
    const commissionEarned = num(props.commissionEarned);
    const commissionFromCancelled = num(props.commissionFromCancelled);
    const pending = Math.max(commissionSold - commissionEarned, 0);

    const tutorShare = pct(tutorReceivable, gmv);
    const platformShare = pct(commissionSold, gmv);

    /**
     * Hai tỉ lệ hiện trên thẻ dùng hai mẫu số khác nhau — % trong phần chú thích là phần của
     * TIỀN PHỤ HUYNH TRẢ, còn mức phí sàn tính trên HỌC PHÍ GỐC. Nói rõ chỗ này trong tooltip
     * để trên mặt thẻ không phải nhồi thêm chữ.
     */
    const allocationHint =
        'Toàn bộ tiền phụ huynh trả cho các lịch đặt trong kỳ chia làm hai phần: tiền gia sư'
        + ' nhận và hoa hồng Tutora. Hai phần luôn cộng lại thành 100%.'
        + (percents
            ? `\n\nHoa hồng gồm ${percents.parent}% phí phụ huynh cộng thêm vào giá và `
              + `${percents.tutor}% phí gia sư trừ vào tiền gia sư nhận — tổng `
              + `${percents.total}% HỌC PHÍ GỐC. Lấy hoa hồng chia cho tiền phụ huynh trả thì `
              + 'ra tỉ lệ nhỏ hơn, vì tiền phụ huynh trả đã gồm sẵn phần phí cộng thêm.'
            : '');

    const statusHint =
        'Hoa hồng chỉ thành doanh thu khi buổi học đã dạy xong và tiền đã giải ngân cho gia sư.'
        + ' Phần còn lại vẫn là nghĩa vụ dịch vụ chưa hoàn thành.';

    return (
        <section className="rev-alloc" aria-labelledby="rev-alloc-title">
            <div className="rev-alloc-main">
                <div className="rev-alloc-head">
                    <h4 className="rev-alloc-title" id="rev-alloc-title">
                        Phân bổ tiền phụ huynh trả
                        <InfoHint text={allocationHint} />
                    </h4>
                </div>

                <div
                    className="rev-alloc-bar"
                    role="img"
                    aria-label={`Gia sư nhận ${moneyVnd(tutorReceivable)}, hoa hồng Tutora ${moneyVnd(commissionSold)}`}
                >
                    <span className="rev-alloc-seg is-tutor" style={{ width: `${tutorShare}%` }} />
                    <span
                        className="rev-alloc-seg is-platform"
                        style={{ width: `${platformShare}%` }}
                    />
                </div>

                <ul className="rev-alloc-legend" aria-label="Chi tiết phân bổ tiền thanh toán">
                    <li>
                        <span className="rev-alloc-name">
                            <span className="rev-alloc-dot is-tutor" aria-hidden="true" />
                            Gia sư nhận
                            <span className="rev-alloc-share">{tutorShare.toFixed(1)}%</span>
                        </span>
                        <span className="rev-alloc-amount">
                            <VndAmount value={tutorReceivable} />
                        </span>
                        {percents && (
                            <span className="rev-alloc-note">
                                Đã trừ {percents.tutor}% phí gia sư
                            </span>
                        )}
                    </li>
                    <li>
                        <span className="rev-alloc-name">
                            <span className="rev-alloc-dot is-platform" aria-hidden="true" />
                            Hoa hồng Tutora
                            <span className="rev-alloc-share">{platformShare.toFixed(1)}%</span>
                        </span>
                        <span className="rev-alloc-amount">
                            <VndAmount value={commissionSold} />
                        </span>
                        {percents && (
                            <span className="rev-alloc-note">
                                {percents.parent}% phí phụ huynh + {percents.tutor}% phí gia sư
                            </span>
                        )}
                    </li>
                </ul>
            </div>

            <div className="rev-alloc-aside">
                <div className="rev-alloc-aside-head">
                    <h4 className="rev-alloc-title">
                        Trạng thái hoa hồng
                        <InfoHint text={statusHint} />
                    </h4>
                </div>

                {commissionSold > 0 ? (
                    <DonutChart
                        height={168}
                        centerLabel="Hoa hồng kỳ này"
                        colors={[PALETTE.emerald, PALETTE.amber]}
                        data={[
                            { name: 'Đã dạy xong', value: commissionEarned },
                            { name: 'Còn chờ ghi nhận', value: pending },
                        ]}
                    />
                ) : (
                    <p className="rev-alloc-note" style={{ marginTop: 12 }}>
                        Chưa phát sinh hoa hồng trong kỳ.
                    </p>
                )}
            </div>

            {commissionFromCancelled > 0 && (
                <p className="rev-alloc-foot">
                    Ngoài khoản trên còn <strong>{moneyVnd(commissionFromCancelled)}</strong> hoa
                    hồng của những buổi đã dạy xong thuộc lịch đặt về sau bị hủy. Tiền đó đã kiếm
                    được thật, nhưng lịch đặt đã rời khỏi nhóm phát sinh doanh thu nên không cộng
                    vào con số nào ở đây — nó chỉ nằm trong đường “Hoa hồng buổi đã dạy” của biểu
                    đồ theo thời gian bên dưới.
                </p>
            )}
        </section>
    );
};

export default MoneySplit;
