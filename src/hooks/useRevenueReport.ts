import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RevenueRange } from '../services/revenueReports.service';

/** Khoảng thời gian dựng sẵn. */
export type RangePreset = '3m' | '6m' | '12m' | 'ytd';

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
    { key: '3m', label: '3 tháng' },
    { key: '6m', label: '6 tháng' },
    { key: '12m', label: '12 tháng' },
    { key: 'ytd', label: 'Từ đầu năm' },
];

const isPreset = (v: string | null): v is RangePreset =>
    v === '3m' || v === '6m' || v === '12m' || v === 'ytd';

const buildRange = (preset: RangePreset): RevenueRange => {
    const to = new Date();
    const from = new Date(to);
    switch (preset) {
        case '3m':
            from.setMonth(from.getMonth() - 3);
            break;
        case '6m':
            from.setMonth(from.getMonth() - 6);
            break;
        case 'ytd':
            from.setMonth(0, 1);
            from.setHours(0, 0, 0, 0);
            break;
        default:
            from.setMonth(from.getMonth() - 12);
    }
    return { from, to };
};

export const useRevenueRange = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const raw = searchParams.get('range');
    const preset: RangePreset = isPreset(raw) ? raw : '12m';

    const setPreset = useCallback(
        (next: RangePreset) => {
            const params = new URLSearchParams(searchParams);
            params.set('range', next);
            setSearchParams(params, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    const range = useMemo(() => buildRange(preset), [preset]);

    return { preset, setPreset, range };
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
