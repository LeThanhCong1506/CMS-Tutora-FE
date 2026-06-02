import styles from './AdminBookings.module.css';
import { BOOKING_STATUS_FILTER_OPTIONS } from './bookingDisplay';

interface BookingFilterBarProps {
    status: string;
    onStatusChange: (value: string) => void;
    from: string;
    to: string;
    onDateRangeChange: (from: string, to: string) => void;
    /** Live input value (uncommitted) */
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    /** Triggered when user submits search (Enter / click button) */
    onSearchSubmit: () => void;
    onReset: () => void;
}

/**
 * Filter bar cho danh sách booking.
 *
 * Search input có 2 state (live + committed) ở parent để tránh 1 API call mỗi
 * keystroke — pattern theo `UserManagementPage`.
 *
 * Date inputs (`<input type="date">`) chỉ fire `onChange` khi user pick xong
 * ngày hoàn chỉnh → không cần local state buffering, dùng prop trực tiếp.
 */
export default function BookingFilterBar({
    status,
    onStatusChange,
    from,
    to,
    onDateRangeChange,
    searchInput,
    onSearchInputChange,
    onSearchSubmit,
    onReset,
}: BookingFilterBarProps) {
    const handleFromChange = (newFrom: string) => {
        // Tự swap nếu user pick `from` > `to` để UX forgiving
        if (newFrom && to && newFrom > to) {
            onDateRangeChange(to, newFrom);
        } else {
            onDateRangeChange(newFrom, to);
        }
    };

    const handleToChange = (newTo: string) => {
        if (newTo && from && from > newTo) {
            onDateRangeChange(newTo, from);
        } else {
            onDateRangeChange(from, newTo);
        }
    };

    return (
        <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Trạng thái</label>
                <select
                    className={styles.filterSelect}
                    value={status}
                    onChange={(e) => onStatusChange(e.target.value)}
                >
                    {BOOKING_STATUS_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Từ ngày</label>
                <input
                    type="date"
                    className={styles.filterInput}
                    value={from}
                    onChange={(e) => handleFromChange(e.target.value)}
                />
            </div>

            <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Đến ngày</label>
                <input
                    type="date"
                    className={styles.filterInput}
                    value={to}
                    onChange={(e) => handleToChange(e.target.value)}
                />
            </div>

            <div className={`${styles.filterGroup} ${styles.searchGroup}`}>
                <label className={styles.filterLabel}>Tìm theo Student / Tutor</label>
                <div className={styles.searchInputWrap}>
                    <input
                        type="text"
                        className={styles.filterInput}
                        placeholder="Tên học sinh, gia sư..."
                        value={searchInput}
                        onChange={(e) => onSearchInputChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSearchSubmit();
                        }}
                    />
                    <button
                        type="button"
                        className={styles.searchBtn}
                        onClick={onSearchSubmit}
                        title="Tìm kiếm"
                    >
                        Tìm
                    </button>
                </div>
            </div>

            <button type="button" className={styles.resetBtn} onClick={onReset} title="Bỏ lọc">
                Đặt lại
            </button>
        </div>
    );
}
