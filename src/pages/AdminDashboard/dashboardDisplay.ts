export const DASHBOARD_RANGE_KEYS = ['today', '7d', '30d', '3m', '6m', '12m'] as const;

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_KEYS)[number];

/** Preset hiển thị thẳng trên header; phần còn lại nằm trong bảng chọn nâng cao. */
export const DASHBOARD_QUICK_KEYS = ['today', '7d', '30d'] as const;

export const DASHBOARD_RANGE_LABELS: Record<DashboardRangeKey, string> = {
    today: 'Hôm nay',
    '7d': '7 ngày qua',
    '30d': '30 ngày qua',
    '3m': '3 tháng qua',
    '6m': '6 tháng qua',
    '12m': '12 tháng qua',
};

const DASHBOARD_AMOUNT_FORMATTER = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
});

// ─── Date helpers ───

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Date -> "yyyy-MM-dd" theo giờ địa phương (khác `toISOString`, vốn quy về UTC). */
export const toDateOnly = (date: Date): string =>
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** "yyyy-MM-dd" -> Date đầu ngày. Trả `null` nếu chuỗi sai định dạng hoặc ngày không tồn tại. */
export const parseDateOnly = (value: string): Date | null => {
    const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!matched) return null;

    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3]);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Chặn ngày tràn tháng (31/02 bị Date tự đẩy sang tháng sau).
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
};

/**
 * Cộng/trừ tháng và giữ nguyên ngày trong tháng khi có thể.
 *
 * `Date.setMonth` bị tràn khi ngày nguồn không tồn tại ở tháng đích (31/08 lùi 6
 * tháng thành 31/02 → 03/03), làm lệch mốc bắt đầu của các khoảng theo tháng.
 */
const shiftMonths = (date: Date, months: number): Date => {
    const dayOfMonth = date.getDate();
    const shifted = new Date(date);
    shifted.setDate(1);
    shifted.setMonth(shifted.getMonth() + months);

    const lastDayOfTargetMonth = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
    shifted.setDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
    return shifted;
};

/** Thứ Hai của tuần chứa `date`, ở đầu ngày. */
export const startOfWeek = (date: Date): Date => {
    const monday = new Date(date);
    monday.setHours(0, 0, 0, 0);
    const dayOfWeek = monday.getDay(); // 0 = Chủ nhật
    monday.setDate(monday.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));
    return monday;
};

// ─── Range selection ───

/**
 * Khoảng thời gian đang xem trên dashboard.
 *
 * `preset` là các mốc trượt theo hôm nay; `month`/`week`/`custom` là mốc cố định
 * trong quá khứ, dùng khi cần soi lại một kỳ đã qua thay vì luôn tính ngược từ
 * hiện tại.
 */
export type DashboardRangeSelection =
    | { kind: 'preset'; preset: DashboardRangeKey }
    /** `month` là 1..12 (không phải chỉ số của Date). */
    | { kind: 'month'; year: number; month: number }
    /** `start` là thứ Hai của tuần, dạng "yyyy-MM-dd". */
    | { kind: 'week'; start: string }
    | { kind: 'custom'; from: string; to: string };

export const DEFAULT_DASHBOARD_SELECTION: DashboardRangeSelection = { kind: 'preset', preset: '30d' };

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;
const WEEK_PATTERN = /^w(\d{4}-\d{2}-\d{2})$/;
const CUSTOM_PATTERN = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;

/**
 * Đọc giá trị `?range=` thành lựa chọn đã kiểm tra hợp lệ.
 *
 * Quy ước mã hoá — giữ link chia sẻ được và tự mô tả:
 *   `30d`                        preset trượt
 *   `2026-07`                    tháng cụ thể
 *   `w2026-07-13`                tuần bắt đầu từ thứ Hai 13/07/2026
 *   `2026-01-01..2026-03-31`     khoảng tự chọn
 *
 * Giá trị rác (gõ tay, link cũ) rơi về mặc định 30 ngày thay vì render rỗng.
 */
export const parseDashboardRange = (
    raw: string | null | undefined,
    /**
     * Khoảng dùng khi URL không có `range` hoặc giá trị không đọc được.
     *
     * Có tham số này vì báo cáo doanh thu dùng chung bộ chọn nhưng cần mặc định khác:
     * dữ liệu doanh thu thưa hơn dashboard nhiều nên 30 ngày thường ra biểu đồ trống.
     */
    fallback: DashboardRangeSelection = DEFAULT_DASHBOARD_SELECTION,
): DashboardRangeSelection => {
    if (!raw) return fallback;

    if ((DASHBOARD_RANGE_KEYS as readonly string[]).includes(raw)) {
        return { kind: 'preset', preset: raw as DashboardRangeKey };
    }

    const month = MONTH_PATTERN.exec(raw);
    if (month) {
        const year = Number(month[1]);
        const monthNumber = Number(month[2]);
        if (monthNumber >= 1 && monthNumber <= 12) return { kind: 'month', year, month: monthNumber };
        return fallback;
    }

    const week = WEEK_PATTERN.exec(raw);
    if (week) {
        const day = parseDateOnly(week[1]);
        // Chuẩn hoá về thứ Hai để mọi link trỏ tới cùng một tuần đều cho cùng kết quả.
        if (day) return { kind: 'week', start: toDateOnly(startOfWeek(day)) };
        return fallback;
    }

    const custom = CUSTOM_PATTERN.exec(raw);
    if (custom) {
        const from = parseDateOnly(custom[1]);
        const to = parseDateOnly(custom[2]);
        if (from && to && from <= to) return { kind: 'custom', from: custom[1], to: custom[2] };
        return fallback;
    }

    return fallback;
};

/** Nghịch đảo của `parseDashboardRange` — dùng để ghi lại lên URL. */
export const serializeDashboardRange = (selection: DashboardRangeSelection): string => {
    switch (selection.kind) {
        case 'preset':
            return selection.preset;
        case 'month':
            return `${selection.year}-${pad2(selection.month)}`;
        case 'week':
            return `w${selection.start}`;
        case 'custom':
            return `${selection.from}..${selection.to}`;
    }
};

/**
 * Khoảng ngày dùng chung cho các API dashboard.
 *
 * Endpoint biểu đồ tính cả ngày đầu và ngày cuối, vì vậy "7 ngày" phải bắt
 * đầu từ 6 ngày trước và "30 ngày" từ 29 ngày trước. Mốc bắt đầu luôn là
 * đầu ngày để KPI và các nhãn ngày trên biểu đồ mô tả cùng một khoảng.
 */
export const computeDashboardRange = (key: DashboardRangeKey, now: Date = new Date()): { from: Date; to: Date } => {
    const to = new Date(now);
    let from = new Date(now);
    from.setHours(0, 0, 0, 0);

    if (key === '7d') {
        from.setDate(from.getDate() - 6);
    } else if (key === '30d') {
        from.setDate(from.getDate() - 29);
    } else if (key === '3m') {
        from = shiftMonths(from, -3);
    } else if (key === '6m') {
        from = shiftMonths(from, -6);
    } else if (key === '12m') {
        from = shiftMonths(from, -12);
    }

    return { from, to };
};

/**
 * Đổi lựa chọn thành khoảng ngày gửi lên API.
 *
 * Mốc cố định (tháng/tuần/tự chọn) lấy trọn ngày cuối kỳ và **không** cắt tại
 * thời điểm hiện tại: backend so sánh với kỳ liền trước theo đúng độ dài khoảng,
 * nên giữ trọn tháng 7 mới đối chiếu được với trọn tháng 6.
 */
export const resolveDashboardRange = (
    selection: DashboardRangeSelection,
    now: Date = new Date()
): { from: Date; to: Date } => {
    switch (selection.kind) {
        case 'preset':
            return computeDashboardRange(selection.preset, now);

        case 'month': {
            const from = new Date(selection.year, selection.month - 1, 1, 0, 0, 0, 0);
            // Ngày 0 của tháng kế tiếp = ngày cuối của tháng đang chọn.
            const to = new Date(selection.year, selection.month, 0, 23, 59, 59, 999);
            return { from, to };
        }

        case 'week': {
            const parsed = parseDateOnly(selection.start);
            if (!parsed) return computeDashboardRange('30d', now);

            const from = startOfWeek(parsed);
            const to = new Date(from);
            to.setDate(to.getDate() + 6);
            to.setHours(23, 59, 59, 999);
            return { from, to };
        }

        case 'custom': {
            const from = parseDateOnly(selection.from);
            const to = parseDateOnly(selection.to);
            if (!from || !to || from > to) return computeDashboardRange('30d', now);

            to.setHours(23, 59, 59, 999);
            return { from, to };
        }
    }
};

// ─── Range labels ───

const formatDayMonth = (date: Date) => `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}`;

const formatFullDate = (date: Date) => `${formatDayMonth(date)}/${date.getFullYear()}`;

/** Nhãn ngắn cho nút chọn khoảng, vd. "Tháng 7/2026", "Tuần 13/07 – 19/07/2026". */
export const describeDashboardRange = (selection: DashboardRangeSelection): string => {
    switch (selection.kind) {
        case 'preset':
            return DASHBOARD_RANGE_LABELS[selection.preset];

        case 'month':
            return `Tháng ${selection.month}/${selection.year}`;

        case 'week': {
            const { from, to } = resolveDashboardRange(selection);
            return `Tuần ${formatDayMonth(from)} – ${formatFullDate(to)}`;
        }

        case 'custom': {
            const { from, to } = resolveDashboardRange(selection);
            return `${formatFullDate(from)} – ${formatFullDate(to)}`;
        }
    }
};

// ─── Money ───

/** Số tiền chính xác cho dashboard, không rút gọn thành K/M/B. */
export const formatDashboardAmount = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';

    return DASHBOARD_AMOUNT_FORMATTER.format(amount);
};

/** 2_887_500 -> "2,887,500 ₫"; 0 -> "0 ₫". */
export const formatDashboardCurrency = (amount: number | null | undefined): string => {
    const formatted = formatDashboardAmount(amount);
    return formatted === '—' ? formatted : `${formatted} ₫`;
};

export interface PendingActionValues {
    tutorApprovals: number | null | undefined;
    pendingCertificates: number | null | undefined;
    withdrawalReviews: number | null | undefined;
    openDisputes: number | null | undefined;
    unresolvedAlerts: number | null | undefined;
    overdueCount: number | null | undefined;
}

/** Nhóm đúng toàn bộ các thành phần tạo nên con số "công việc đang chờ". */
export const summarizePendingActions = (actions: PendingActionValues) => {
    const count = (value: number | null | undefined) => (value != null && Number.isFinite(value) ? value : 0);
    const verification = count(actions.tutorApprovals) + count(actions.pendingCertificates);
    const withdrawals = count(actions.withdrawalReviews) + count(actions.overdueCount);
    const disputes = count(actions.openDisputes);
    const alerts = count(actions.unresolvedAlerts);

    return {
        verification,
        withdrawals,
        disputes,
        alerts,
        total: verification + withdrawals + disputes + alerts,
    };
};
