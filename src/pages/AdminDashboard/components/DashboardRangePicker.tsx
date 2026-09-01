import { useEffect, useMemo, useRef, useState } from 'react';
import {
    DASHBOARD_QUICK_KEYS,
    DASHBOARD_RANGE_LABELS,
    describeDashboardRange,
    parseDateOnly,
    startOfWeek,
    toDateOnly,
    type DashboardRangeKey,
    type DashboardRangeSelection,
} from '../dashboardDisplay';
import '../../../styles/components/range-picker.css';

/** Preset trượt nằm trong bảng chọn — các mốc rộng hơn 30 ngày. */
const WIDE_PRESETS: DashboardRangeKey[] = ['3m', '6m', '12m'];

const PANEL_TABS = [
    { key: 'quick', label: 'Khoảng rộng', icon: 'timeline' },
    { key: 'month', label: 'Theo tháng', icon: 'calendar_month' },
    { key: 'week', label: 'Theo tuần', icon: 'date_range' },
    { key: 'custom', label: 'Tự chọn', icon: 'tune' },
] as const;

type PanelTab = (typeof PANEL_TABS)[number]['key'];

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatDayMonth = (date: Date) => `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;

/** Tab mở sẵn khi bấm vào nút — khớp với loại khoảng đang xem. */
const initialTabFor = (selection: DashboardRangeSelection): PanelTab => {
    if (selection.kind === 'month') return 'month';
    if (selection.kind === 'week') return 'week';
    if (selection.kind === 'custom') return 'custom';
    return 'quick';
};

interface DashboardRangePickerProps {
    selection: DashboardRangeSelection;
    onChange: (next: DashboardRangeSelection) => void;
}

/**
 * Bộ chọn khoảng thời gian của dashboard.
 *
 * Ba preset dùng thường xuyên nằm thẳng trên header; các mốc rộng hơn và mọi kỳ
 * cố định trong quá khứ (tháng, tuần, khoảng tự chọn) nằm trong bảng thả xuống
 * để header không bị dồn quá nhiều nút.
 */
const DashboardRangePicker = ({ selection, onChange }: DashboardRangePickerProps) => {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<PanelTab>(() => initialTabFor(selection));
    const containerRef = useRef<HTMLDivElement>(null);

    const today = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now;
    }, []);

    // Năm/tháng đang duyệt trong bảng chọn, độc lập với khoảng đang áp dụng.
    const [browseYear, setBrowseYear] = useState(() =>
        selection.kind === 'month' ? selection.year : today.getFullYear()
    );
    const [browseMonth, setBrowseMonth] = useState(() => {
        if (selection.kind === 'week') {
            const start = parseDateOnly(selection.start);
            if (start) return new Date(start.getFullYear(), start.getMonth(), 1);
        }
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const [customFrom, setCustomFrom] = useState(() =>
        selection.kind === 'custom' ? selection.from : toDateOnly(today)
    );
    const [customTo, setCustomTo] = useState(() => (selection.kind === 'custom' ? selection.to : toDateOnly(today)));

    const isQuickPreset =
        selection.kind === 'preset' && (DASHBOARD_QUICK_KEYS as readonly string[]).includes(selection.preset);

    // Đóng khi bấm ra ngoài hoặc bấm Esc — bảng nổi đè lên nội dung phía dưới.
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const applySelection = (next: DashboardRangeSelection) => {
        onChange(next);
        setOpen(false);
    };

    const openPanel = () => {
        setTab(initialTabFor(selection));
        setOpen((prev) => !prev);
    };

    // ── Tuần trong tháng đang duyệt ──
    const weeksOfBrowseMonth = useMemo(() => {
        const lastDay = new Date(browseMonth.getFullYear(), browseMonth.getMonth() + 1, 0);
        const weeks: { start: Date; end: Date }[] = [];

        for (let cursor = startOfWeek(browseMonth); cursor <= lastDay; cursor.setDate(cursor.getDate() + 7)) {
            const start = new Date(cursor);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            weeks.push({ start, end });
        }

        return weeks;
    }, [browseMonth]);

    const currentWeekStart = useMemo(() => toDateOnly(startOfWeek(today)), [today]);

    const customInvalid = (() => {
        const from = parseDateOnly(customFrom);
        const to = parseDateOnly(customTo);
        if (!from || !to) return 'Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.';
        if (from > to) return 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.';
        return null;
    })();

    const shiftBrowseMonth = (delta: number) =>
        setBrowseMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

    return (
        <div className="admin-dash-range" ref={containerRef}>
            <div className="admin-dash-range-quick" role="group" aria-label="Khoảng thời gian nhanh">
                {DASHBOARD_QUICK_KEYS.map((key) => {
                    const active = selection.kind === 'preset' && selection.preset === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            className={active ? 'is-active' : ''}
                            aria-pressed={active}
                            onClick={() => onChange({ kind: 'preset', preset: key })}
                        >
                            {DASHBOARD_RANGE_LABELS[key]}
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                className={`admin-dash-range-trigger ${!isQuickPreset ? 'is-active' : ''}`}
                onClick={openPanel}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                <span className="material-symbols-outlined" aria-hidden="true">
                    calendar_month
                </span>
                <span className="admin-dash-range-trigger-label">
                    {isQuickPreset ? 'Mốc thời gian khác' : describeDashboardRange(selection)}
                </span>
                <span className="material-symbols-outlined admin-dash-range-caret" aria-hidden="true">
                    {open ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {open && (
                <div className="admin-dash-range-panel" role="dialog" aria-label="Chọn khoảng thời gian">
                    <div className="admin-dash-range-panel-tabs" role="tablist">
                        {PANEL_TABS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="tab"
                                aria-selected={tab === item.key}
                                className={tab === item.key ? 'is-active' : ''}
                                onClick={() => setTab(item.key)}
                            >
                                <span className="material-symbols-outlined" aria-hidden="true">
                                    {item.icon}
                                </span>
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="admin-dash-range-panel-body">
                        {tab === 'quick' && (
                            <>
                                <p className="admin-dash-range-hint">Tính ngược từ hôm nay.</p>
                                <div className="admin-dash-range-preset-list">
                                    {WIDE_PRESETS.map((key) => {
                                        const active = selection.kind === 'preset' && selection.preset === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                className={active ? 'is-active' : ''}
                                                onClick={() => applySelection({ kind: 'preset', preset: key })}
                                            >
                                                {DASHBOARD_RANGE_LABELS[key]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {tab === 'month' && (
                            <>
                                <div className="admin-dash-range-stepper">
                                    <button
                                        type="button"
                                        onClick={() => setBrowseYear((year) => year - 1)}
                                        aria-label="Năm trước"
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <strong>Năm {browseYear}</strong>
                                    <button
                                        type="button"
                                        onClick={() => setBrowseYear((year) => year + 1)}
                                        disabled={browseYear >= today.getFullYear()}
                                        aria-label="Năm sau"
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>

                                <div className="admin-dash-range-month-grid">
                                    {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
                                        const active =
                                            selection.kind === 'month' &&
                                            selection.year === browseYear &&
                                            selection.month === month;
                                        // Tháng chưa tới thì không có dữ liệu để xem.
                                        const inFuture =
                                            browseYear > today.getFullYear() ||
                                            (browseYear === today.getFullYear() && month > today.getMonth() + 1);

                                        return (
                                            <button
                                                key={month}
                                                type="button"
                                                disabled={inFuture}
                                                className={active ? 'is-active' : ''}
                                                onClick={() =>
                                                    applySelection({ kind: 'month', year: browseYear, month })
                                                }
                                            >
                                                Th {month}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {tab === 'week' && (
                            <>
                                <div className="admin-dash-range-stepper">
                                    <button type="button" onClick={() => shiftBrowseMonth(-1)} aria-label="Tháng trước">
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <strong>
                                        Tháng {browseMonth.getMonth() + 1}/{browseMonth.getFullYear()}
                                    </strong>
                                    <button
                                        type="button"
                                        onClick={() => shiftBrowseMonth(1)}
                                        disabled={
                                            browseMonth.getFullYear() > today.getFullYear() ||
                                            (browseMonth.getFullYear() === today.getFullYear() &&
                                                browseMonth.getMonth() >= today.getMonth())
                                        }
                                        aria-label="Tháng sau"
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>

                                <div className="admin-dash-range-week-list">
                                    {weeksOfBrowseMonth.map((week) => {
                                        const key = toDateOnly(week.start);
                                        const active = selection.kind === 'week' && selection.start === key;
                                        const inFuture = week.start > today;

                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                disabled={inFuture}
                                                className={active ? 'is-active' : ''}
                                                onClick={() => applySelection({ kind: 'week', start: key })}
                                            >
                                                <span>
                                                    {formatDayMonth(week.start)} – {formatDayMonth(week.end)}
                                                </span>
                                                {key === currentWeekStart && (
                                                    <span className="admin-dash-range-week-tag">Tuần này</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {tab === 'custom' && (
                            <>
                                <div className="admin-dash-range-custom">
                                    <label>
                                        <span>Từ ngày</span>
                                        <input
                                            type="date"
                                            value={customFrom}
                                            max={customTo || toDateOnly(today)}
                                            onChange={(event) => setCustomFrom(event.target.value)}
                                        />
                                    </label>
                                    <label>
                                        <span>Đến ngày</span>
                                        <input
                                            type="date"
                                            value={customTo}
                                            min={customFrom || undefined}
                                            onChange={(event) => setCustomTo(event.target.value)}
                                        />
                                    </label>
                                </div>

                                {customInvalid && <p className="admin-dash-range-error">{customInvalid}</p>}

                                <button
                                    type="button"
                                    className="admin-dash-range-apply"
                                    disabled={Boolean(customInvalid)}
                                    onClick={() =>
                                        applySelection({ kind: 'custom', from: customFrom, to: customTo })
                                    }
                                >
                                    Áp dụng khoảng này
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardRangePicker;
