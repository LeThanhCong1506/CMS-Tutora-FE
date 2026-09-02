import { useMemo } from 'react';
import { computeAllocationTotals } from './sessionAllocationTotals';
import { formatCurrency } from '../../utils/formatters';
import type {
    CancelPreviewSessionRow,
    CourseCancelPreviewDto,
    SessionAllocation,
} from '../../services/admin.service';

/**
 * Bảng phân bổ từng buổi cho phương án "Hủy khóa học & hoàn tiền".
 *
 * Thay cho thẻ tự động cũ, thẻ đó đưa ra một phán quyết mà không cho admin thấy căn cứ. Ở đây mỗi
 * buổi là một dòng, đặt bằng chứng có mặt ngay cạnh số tiền, và admin tự tick bên nào được nhận.
 *
 * Hai ràng buộc quan trọng, cả hai đều là chuyện tiền:
 *  1. Mỗi buổi BẮT BUỘC tick một ô, và không bao giờ được tick cả hai — tick cả hai là chi
 *     47.500 + 50.000đ cho một buổi chỉ thu về 52.500đ. Vì vậy dùng radio chứ không phải hai
 *     checkbox độc lập: trạng thái sai bị loại bỏ ngay ở cấu trúc, không phải bằng cảnh báo.
 *  2. Tổng chi không bao giờ được vượt số tiền đã thu. Backend đã chặn cứng, nhưng nếu giao diện
 *     không hiện trần thì admin sẽ hứa với phụ huynh một khoản không chi được — đúng vấn đề của
 *     thẻ cũ, nơi con số "hoàn 450.000đ" chỉ bị đính chính trong hộp cảnh báo màu vàng.
 */

interface Props {
    preview: CourseCancelPreviewDto;
    allocations: Record<number, SessionAllocation>;
    onChange: (classSessionId: number, allocation: SessionAllocation) => void;
    disabled?: boolean;
}

/** "65p" / "19s" — đủ để so sánh nhanh giữa các dòng, không cần độ chính xác đến giây ở mọi mốc. */
const formatDuration = (seconds: number | null): string => {
    if (seconds == null) return '—';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.round(seconds / 60)}p`;
};

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const SessionAllocationTable = ({ preview, allocations, onChange, disabled = false }: Props) => {
    const totals = useMemo(() => computeAllocationTotals(preview, allocations), [preview, allocations]);

    const overBudget = totals.tutor + totals.parent > preview.totalCollectedFromParent;

    return (
        <div className="dispute-alloc">
            <div className="dispute-alloc__budget">
                <span>Tiền đã thu của phụ huynh</span>
                <strong>{formatCurrency(preview.totalCollectedFromParent)}</strong>
            </div>

            <p className="dispute-alloc__rule">
                {preview.refundIncludesServiceFee
                    ? `Khóa mới thanh toán đợt một — chỉ ${preview.sessionsPaidByParent} buổi đầu đã được thu tiền
                       nên chỉ những buổi đó cần chia. Hoàn cho phụ huynh gồm cả phí dịch vụ.`
                    : 'Khóa đã thanh toán đợt hai — hoàn theo giá gốc, phí dịch vụ không hoàn.'}
            </p>
            {preview.refundIncludesServiceFee &&
                preview.remainingSessionsCount > preview.sessionsPaidByParent && (
                    <p className="dispute-alloc__rule">
                        Các buổi còn lại của khóa sẽ bị hủy nhưng không xuất hiện ở đây: chưa thu tiền
                        thì không có gì để hoàn cho phụ huynh lẫn giải ngân cho gia sư.
                    </p>
                )}

            <div className="dispute-alloc__scroll">
                <table className="dispute-alloc__table">
                    <thead>
                        <tr>
                            <th>Buổi</th>
                            <th>Thời lượng có mặt</th>
                            <th className="is-center">
                                Gia sư
                                <small>{formatCurrency(preview.tutorAmountPerSession)}</small>
                            </th>
                            <th className="is-center">
                                Phụ huynh
                                <small>{formatCurrency(preview.parentAmountPerSession)}</small>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {preview.sessions.map((row) => (
                            <SessionRow
                                key={row.classSessionId}
                                row={row}
                                choice={allocations[row.classSessionId] ?? 'none'}
                                onChange={onChange}
                                disabled={disabled}
                            />
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colSpan={2}>Trả gia sư · {totals.tutorCount} buổi</th>
                            <td className="is-center is-in">{formatCurrency(totals.tutor)}</td>
                            <td />
                        </tr>
                        <tr>
                            <th colSpan={2}>Hoàn phụ huynh · {totals.parentCount} buổi</th>
                            <td />
                            <td className="is-center is-in">{formatCurrency(totals.parent)}</td>
                        </tr>
                        <tr>
                            <th colSpan={2}>Doanh thu nền tảng</th>
                            <td colSpan={2} className="is-center is-revenue">
                                {formatCurrency(totals.revenue)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {totals.unassigned > 0 && (
                <p className="dispute-alloc__blocker">
                    Còn {totals.unassigned} buổi chưa chọn. Mọi buổi đều phải tick cho gia sư hoặc phụ
                    huynh — bỏ sót buổi nào thì tiền của buổi đó kẹt lại sau khi khóa học đóng.
                </p>
            )}

            {overBudget && (
                <p className="dispute-alloc__blocker">
                    Tổng chi {formatCurrency(totals.tutor + totals.parent)} vượt quá số tiền đã thu{' '}
                    {formatCurrency(preview.totalCollectedFromParent)}. Hệ thống sẽ cắt bớt khi thực
                    hiện — hãy điều chỉnh lại để con số hiển thị đúng với số sẽ chi thật.
                </p>
            )}
        </div>
    );
};

interface RowProps {
    row: CancelPreviewSessionRow;
    choice: SessionAllocation;
    onChange: (classSessionId: number, allocation: SessionAllocation) => void;
    disabled: boolean;
}

const SessionRow = ({ row, choice, onChange, disabled }: RowProps) => {
    // Buổi đã giải ngân trước đó: tiền đã rời escrow, gia sư có thể đã rút. Tick lại là trả lần
    // hai — khoá dòng thay vì tin vào việc admin nhớ không bấm.
    const locked = !row.isAllocatable || disabled;

    const rowClass = [
        row.isDisputedSession ? 'is-disputed' : '',
        !row.isAllocatable ? 'is-locked' : '',
        choice === 'none' && row.isAllocatable ? 'is-unassigned' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <tr
            className={rowClass}
            /* Buổi đã chốt / đã hủy bị khoá dòng và tick sẵn. Trước đây có nhãn giải thích ngay
               trong ô, nhưng cột "Buổi" quá hẹp nên nhãn xuống 3 dòng và phá layout. Đưa vào
               tooltip: giữ lời giải thích mà không tốn chiều cao dòng nào. */
            title={
                row.isAlreadySettled
                    ? 'Buổi đã chốt — phụ huynh đã xác nhận, phần này luôn tính cho gia sư.'
                    : row.isCancelled
                      ? 'Buổi đã hủy — không thuộc về bên nào.'
                      : undefined
            }
        >
                <td>
                    <strong>#{row.sessionNumber}</strong>
                    <small>{formatDate(row.scheduledStart)}</small>
                    {row.isDisputedSession && <span className="dispute-alloc__tag">Đang khiếu nại</span>}
                </td>
                <td>
                    {row.hasAttendanceData ? (
                        <span className="dispute-alloc__durations">
                            GS {formatDuration(row.tutorSeconds)} · HS {formatDuration(row.studentSeconds)}
                            {/* Thời lượng cùng có mặt chỉ suy được từ dữ liệu Agora; rơi về heartbeat
                                trình duyệt thì backend trả null nên không hiện dòng này. */}
                            {row.overlapSeconds != null && (
                                <small>cùng có mặt {formatDuration(row.overlapSeconds)}</small>
                            )}
                        </span>
                    ) : (
                        <span className="dispute-alloc__nodata">Không có dữ liệu có mặt</span>
                    )}
                </td>
                <td className="is-center">
                    <input
                        type="radio"
                        name={`alloc-${row.classSessionId}`}
                        checked={choice === 'tutor'}
                        disabled={locked}
                        onChange={() => onChange(row.classSessionId, 'tutor')}
                        aria-label={`Buổi ${row.sessionNumber}: trả gia sư ${row.tutorAmount}`}
                    />
                </td>
                <td className="is-center">
                    <input
                        type="radio"
                        name={`alloc-${row.classSessionId}`}
                        checked={choice === 'parent'}
                        disabled={locked}
                        onChange={() => onChange(row.classSessionId, 'parent')}
                        aria-label={`Buổi ${row.sessionNumber}: hoàn phụ huynh ${row.parentAmount}`}
                    />
                </td>
        </tr>
    );
};

export default SessionAllocationTable;
