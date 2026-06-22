import styles from './AdminBookings.module.css';
import { BOOKING_STATUS_FILTER_OPTIONS } from './bookingDisplay';

interface BookingFilterBarProps {
    status: string;
    onStatusChange: (value: string) => void;
    from: string;
    to: string;
    onDateRangeChange: (from: string, to: string) => void;
    searchInput: string;
    searchQuery: string;
    onSearchInputChange: (value: string) => void;
    onSearchSubmit: () => void;
    onReset: () => void;
}

export default function BookingFilterBar({
    status,
    onStatusChange,
    from,
    to,
    onDateRangeChange,
    searchInput,
    searchQuery,
    onSearchInputChange,
    onSearchSubmit,
    onReset,
}: BookingFilterBarProps) {
    const hasActiveFilters = Boolean(status || from || to || searchQuery);

    const handleFromChange = (newFrom: string) => {
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
        <section className={styles.filterBar} aria-label="Bộ lọc danh sách đặt lịch">
            <div className={styles.filterHeading}>
                <div className={styles.filterHeadingText}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                        tune
                    </span>
                    <span>
                        <strong>Bộ lọc</strong>
                    </span>
                </div>
                <button type="button" className={styles.resetBtn} onClick={onReset} disabled={!hasActiveFilters}>
                    <span className="material-symbols-outlined" aria-hidden="true">
                        filter_alt_off
                    </span>
                    Xóa bộ lọc
                </button>
            </div>

            <div className={styles.filterGrid}>
                <div className={`${styles.filterGroup} ${styles.searchGroup}`}>
                    <label className={styles.filterLabel} htmlFor="booking-search">
                        Học sinh hoặc gia sư
                    </label>
                    <div className={styles.searchInputWrap}>
                        <span className={`material-symbols-outlined ${styles.fieldIcon}`} aria-hidden="true">
                            search
                        </span>
                        <input
                            id="booking-search"
                            type="search"
                            className={styles.filterInput}
                            placeholder="Nhập tên học sinh hoặc gia sư..."
                            value={searchInput}
                            onChange={(event) => onSearchInputChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') onSearchSubmit();
                            }}
                        />
                        <button type="button" className={styles.searchBtn} onClick={onSearchSubmit}>
                            Tìm kiếm
                        </button>
                    </div>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="booking-status">
                        Trạng thái
                    </label>
                    <select
                        id="booking-status"
                        className={styles.filterSelect}
                        value={status}
                        onChange={(event) => onStatusChange(event.target.value)}
                    >
                        {BOOKING_STATUS_FILTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="booking-from-date">
                        Từ ngày
                    </label>
                    <input
                        id="booking-from-date"
                        type="date"
                        className={styles.filterInput}
                        value={from}
                        max={to || undefined}
                        onChange={(event) => handleFromChange(event.target.value)}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="booking-to-date">
                        Đến ngày
                    </label>
                    <input
                        id="booking-to-date"
                        type="date"
                        className={styles.filterInput}
                        value={to}
                        min={from || undefined}
                        onChange={(event) => handleToChange(event.target.value)}
                    />
                </div>
            </div>
        </section>
    );
}
