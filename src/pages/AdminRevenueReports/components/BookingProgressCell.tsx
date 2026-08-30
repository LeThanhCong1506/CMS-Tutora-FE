type State = 'none' | 'running' | 'done' | 'over';

const stateOf = (delivered: number, total: number): State => {
    if (total <= 0 || delivered <= 0) return 'none';
    if (delivered > total) return 'over';
    if (delivered >= total) return 'done';
    return 'running';
};

const TITLE: Record<State, string> = {
    none: 'Chưa dạy buổi nào',
    running: 'Đang dạy dở',
    done: 'Đã dạy đủ số buổi đã bán',
    over: 'Đã dạy vượt số buổi đã bán',
};

/**
 * Tiến độ dạy của một lịch học, gọn trong một ô bảng.
 *
 * Trước đây phần này là một khối biểu đồ riêng đặt ngay trên bảng "Doanh thu theo booking",
 * nhưng hai khối lặp lại cùng bộ cột (mã lịch, gia sư, số buổi) và bắt người đọc nhìn hai chỗ
 * cho một câu hỏi. Gộp vào bảng thì mỗi dòng tự nói được cả tiến độ lẫn số tiền của nó.
 *
 * Số `x/y` luôn hiện kèm thanh: nó là thứ giải thích các dòng vượt quá 100%, mà bản thân
 * thanh chạy thì không nói được vì đã bị kẹp lại ở mức đầy.
 */
const BookingProgressCell = ({ delivered, total }: { delivered: number; total: number }) => {
    const percent = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const state = stateOf(delivered, total);

    return (
        <div className="rev-cell-progress" title={`${TITLE[state]} — ${percent}%`}>
            <span className="rev-cell-progress__track">
                <span
                    className={`rev-cell-progress__fill is-${state}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </span>
            <span className={`rev-cell-progress__count is-${state}`}>
                {delivered}/{total}
            </span>
        </div>
    );
};

export default BookingProgressCell;
