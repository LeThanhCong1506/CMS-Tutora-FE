import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    parseDashboardRange,
    resolveDashboardRange,
    serializeDashboardRange,
    type DashboardRangeSelection,
} from '@/pages/AdminDashboard/dashboardDisplay';
import type { RevenueRange } from '../services/revenueReports.service';

/**
 * Mặc định của báo cáo doanh thu: 12 tháng.
 *
 * Khác dashboard (30 ngày) một cách có chủ đích — doanh thu phát sinh thưa hơn nhiều so với
 * lượt truy cập, nên 30 ngày thường cho biểu đồ theo tháng chỉ có một cột.
 */
const REVENUE_DEFAULT_SELECTION: DashboardRangeSelection = { kind: 'preset', preset: '12m' };

/**
 * Khoảng thời gian của cụm báo cáo doanh thu, đồng bộ với `?range=` trên URL.
 *
 * Dùng chung đúng model và đúng bộ chọn với dashboard, nên cách mã hoá trên URL cũng giống
 * hệt: `12m`, `2026-07`, `w2026-07-13`, `2026-01-01..2026-03-31`. Nhờ vậy link chia sẻ giữa
 * hai trang đọc được lẫn nhau, và người dùng chỉ phải học một bộ điều khiển.
 *
 * `selection` và `range` đều memo theo chuỗi trên URL: `range` là dependency của effect gọi
 * API, identity không ổn định sẽ gây fetch lặp vô hạn.
 */
export const useRevenueRange = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const raw = searchParams.get('range');

    const selection = useMemo(
        () => parseDashboardRange(raw, REVENUE_DEFAULT_SELECTION),
        [raw],
    );
    const range: RevenueRange = useMemo(() => resolveDashboardRange(selection), [selection]);

    const setSelection = useCallback(
        (next: DashboardRangeSelection) => {
            setSearchParams(
                (prev) => {
                    const params = new URLSearchParams(prev);
                    params.set('range', serializeDashboardRange(next));
                    return params;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );

    return { selection, setSelection, range };
};

interface ReportState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    reload: () => void;
}

/** Gộp 3 giá trị vào một state để effect chỉ gọi setState một lần, bất đồng bộ. */
interface FetchState<T> {
    data: T | null;
    error: string | null;
    /** Khoá của request đã hoàn tất — khác key hiện tại nghĩa là đang tải. */
    settledFor: string | null;
}

const errorMessage = (err: unknown) =>
    err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Không tải được số liệu';

/**
 * Gọi một endpoint báo cáo và quản lý loading/lỗi.
 */
export const useRevenueReport = <T,>(
    fetcher: (range: RevenueRange) => Promise<T>,
    range: RevenueRange,
): ReportState<T> => {
    const [nonce, setNonce] = useState(0);
    const [state, setState] = useState<FetchState<T>>({
        data: null,
        error: null,
        settledFor: null,
    });

    const reload = useCallback(() => setNonce((n) => n + 1), []);

    // Khoá định danh request hiện tại; đổi range hoặc bấm thử lại sẽ sinh khoá mới.
    const requestKey = `${range.from?.toISOString() ?? ''}|${range.to?.toISOString() ?? ''}|${nonce}`;

    useEffect(() => {
        let cancelled = false;

        fetcher(range)
            .then((res) => {
                if (!cancelled) {
                    setState({ data: res, error: null, settledFor: requestKey });
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    setState({ data: null, error: errorMessage(err), settledFor: requestKey });
                }
            });

        return () => {
            cancelled = true;
        };
        // fetcher là hàm module-level ổn định; requestKey đã bao gồm range + nonce
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestKey]);

    return {
        data: state.settledFor === requestKey ? state.data : null,
        loading: state.settledFor !== requestKey,
        error: state.settledFor === requestKey ? state.error : null,
        reload,
    };
};
