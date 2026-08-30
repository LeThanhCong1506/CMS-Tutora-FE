import { money, moneyVnd } from '@/utils/formatMoney';
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

export interface MoneySplitProps {
    gmv: number;
    baseAmount: number;
    tutorReceivable: number;
    commissionSold: number;
    commissionEarned: number;
    commissionFromCancelled: number;
}

/**
 * Khối chia tiền của tab Doanh thu: tổng phụ huynh trả, phần gia sư nhận và hoa hồng Tutora.
 *
 * Hai số trong thanh luôn cộng lại thành tổng tiền phụ huynh trả. Hoa hồng từ booking đã hủy
 * được tách thành ghi chú riêng vì nó nằm ngoài phép cộng đó.
 */
const MoneySplit = (props: MoneySplitProps) => {
    const gmv = num(props.gmv);
    const baseAmount = num(props.baseAmount);
    const tutorReceivable = num(props.tutorReceivable);
    const commissionSold = num(props.commissionSold);
    const commissionEarned = num(props.commissionEarned);
    const commissionFromCancelled = num(props.commissionFromCancelled);
    const pending = Math.max(commissionSold - commissionEarned, 0);
    const parentFee = Math.max(gmv - baseAmount, 0);

    const share = (v: number) => (gmv > 0 ? `${(v / gmv) * 100}%` : '0%');

    /**
     * Hoa hồng từ lịch đặt đã hủy trước đây là một badge "+50,000" nằm ngay dưới hai con số này.
     * Dấu cộng đó hứa một phép cộng không có thật: khoản này KHÔNG nằm trong bất kỳ số nào đang
     * hiển thị trên trang, vì mọi số ở đây chỉ tính lịch đặt còn trạng thái phát sinh doanh thu.
     * Nói rõ nó nằm ở đâu và không nằm ở đâu, đúng chỗ người đọc sẽ thắc mắc.
     */
    const statusHint = [
        'Hoa hồng chỉ thành doanh thu khi buổi học đã dạy xong và tiền đã giải ngân cho gia sư.'
            + ' Phần còn lại vẫn là nghĩa vụ dịch vụ chưa hoàn thành.',
        commissionFromCancelled > 0
            ? `Ngoài khoản này còn ${moneyVnd(commissionFromCancelled)} hoa hồng của những buổi đã`
              + ' dạy xong thuộc lịch đặt về sau bị hủy. Tiền đó đã kiếm được thật, nhưng lịch đặt'
              + ' đã rời khỏi nhóm phát sinh doanh thu nên không cộng vào con số nào ở đây — nó chỉ'
              + ' nằm trong đường "Hoa hồng buổi đã dạy" của biểu đồ theo thời gian bên dưới.'
            : null,
    ]
        .filter(Boolean)
        .join('\n\n');

    return (
        <section className="rev-flow" aria-labelledby="rev-flow-parent-payment">
            <header className="rev-flow-head">
                <div className="rev-flow-total-block">
                    <span id="rev-flow-parent-payment" className="rev-flow-eyebrow">
                        Tiền phụ huynh trả
                        <InfoHint text="Tổng tiền phụ huynh phải trả cho các lịch đặt trong kỳ, đã gồm 5% phí phụ huynh. Trừ hoa hồng Tutora ra đúng số tiền gia sư nhận." />
                    </span>
                    <strong className="rev-flow-total">
                        <VndAmount value={gmv} />
                    </strong>
                </div>
                {baseAmount > 0 && (
                    <dl className="rev-flow-source" aria-label="Cấu thành tiền phụ huynh trả">
                        <div>
                            <dt>Học phí gốc</dt>
                            <dd>
                                <VndAmount value={baseAmount} />
                            </dd>
                        </div>
                        <div>
                            <dt>Phí phụ huynh</dt>
                            <dd>
                                <VndAmount value={parentFee} />
                            </dd>
                        </div>
                    </dl>
                )}
            </header>

            <div className="rev-flow-allocation">
                <div className="rev-flow-allocation-head">
                    <span>Phân bổ tiền thanh toán</span>
                    <span>Gia sư nhận và hoa hồng Tutora</span>
                </div>

                <div
                    className="rev-flow-bar"
                    role="img"
                    aria-label={`Gia sư nhận ${moneyVnd(tutorReceivable)}, hoa hồng Tutora ${moneyVnd(commissionSold)}`}
                >
                    <span className="rev-flow-seg is-tutor" style={{ width: share(tutorReceivable) }} />
                    <span className="rev-flow-seg is-platform" style={{ width: share(commissionSold) }} />
                </div>

                <ul className="rev-flow-legend" aria-label="Chi tiết phân bổ tiền thanh toán">
                    <li className="rev-flow-share is-tutor">
                        <span className="rev-flow-share-label">
                            <span className="rev-flow-dot is-tutor" aria-hidden="true" />
                            Gia sư nhận
                        </span>
                        <strong>
                            <VndAmount value={tutorReceivable} />
                        </strong>
                        <span className="rev-flow-share-note">Đã trừ 5% phí nền tảng</span>
                    </li>
                    <li className="rev-flow-share is-platform">
                        <span className="rev-flow-share-label">
                            <span className="rev-flow-dot is-platform" aria-hidden="true" />
                            Hoa hồng Tutora
                        </span>
                        <strong>
                            <VndAmount value={commissionSold} />
                        </strong>
                        <span className="rev-flow-share-note">10% học phí gốc</span>
                    </li>
                </ul>
            </div>

            {commissionSold > 0 && (
                <div className="rev-flow-detail">
                    <div className="rev-flow-detail-head">
                        <span>
                            Trạng thái hoa hồng
                            <InfoHint text={statusHint} />
                        </span>
                        <strong>
                            <VndAmount value={commissionSold} />
                        </strong>
                    </div>
                    <dl className="rev-flow-detail-stats">
                        <div>
                            <dt>Đã dạy xong</dt>
                            <dd>
                                <VndAmount value={commissionEarned} />
                            </dd>
                        </div>
                        <div>
                            <dt>Còn chờ ghi nhận</dt>
                            <dd>
                                <VndAmount value={pending} />
                            </dd>
                        </div>
                    </dl>
                </div>
            )}
        </section>
    );
};

export default MoneySplit;
