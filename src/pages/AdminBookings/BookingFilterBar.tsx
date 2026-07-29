import type { KeyboardEvent } from 'react';
import styles from './AdminBookings.module.css';
import { BOOKING_STATUS_FILTER_OPTIONS } from './bookingDisplay';
import type { ListSortDirection } from '../../types/admin.types';

interface BookingFilterBarProps {
    status: string;
    onStatusChange: (value: string) => void;
    from: string;
    to: string;
    onDateRangeChange: (from: string, to: string) => void;
    searchInput: string;
    searchQuery: string;
    onSearchInputChange: (value: string) => void;
    /** Áp dụng cùng lúc ô tìm kiếm và hai ô lọc theo id. */
    onFiltersSubmit: () => void;
    bookingIdInput: string;
    onBookingIdInputChange: (value: string) => void;
    classSessionIdInput: string;
    onClassSessionIdInputChange: (value: string) => void;
    sortDirection: ListSortDirection;
    onSortDirectionChange: (value: ListSortDirection) => void;
    hasAppliedIdFilters: boolean;
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
    onFiltersSubmit,
    bookingIdInput,
    onBookingIdInputChange,
    classSessionIdInput,
    onClassSessionIdInputChange,
    sortDirection,
    onSortDirectionChange,
    hasAppliedIdFilters,
    onReset,
}: BookingFilterBarProps) {
    const hasActiveFilters = Boolean(status || from || to || searchQuery || hasAppliedIdFilters);

    // Enter ở bất kỳ ô lọc theo id nào cũng áp dụng, giống ô tìm kiếm.
    const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') onFiltersSubmit();
    };

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
                            onKeyDown={submitOnEnter}
                        />
                        <button type="button" className={styles.searchBtn} onClick={onFiltersSubmit}>
                            Tìm kiếm
                        </button>
                    </div>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="booking-id-filter">
                        Mã đặt lịch
                    </label>
                    <input
                        id="booking-id-filter"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        className={styles.filterInput}
                        placeholder="VD: 88"
                        value={bookingIdInput}
                        onChange={(event) => onBookingIdInputChange(event.target.value)}
                        onKeyDown={submitOnEnter}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="booking-class-session-filter">
                        ID buổi học
                    </label>
                    <input
                        id="booking-class-session-filter"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        className={styles.filterInput}
                        placeholder="VD: 12345"
                        value={classSessionIdInput}
                        onChange={(event) => onClassSessionIdInputChange(event.target.value)}
                        onKeyDown={submitOnEnter}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="booking-sort-direction">
                        Sắp xếp
                    </label>
                    <select
                        id="booking-sort-direction"
                        className={styles.filterSelect}
                        value={sortDirection}
                        onChange={(event) => onSortDirectionChange(event.target.value as ListSortDirection)}
                    >
                        <option value="desc">Mới nhất trước</option>
                        <option value="asc">Cũ nhất trước</option>
                    </select>
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
