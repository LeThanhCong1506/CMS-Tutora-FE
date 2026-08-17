import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    parseDashboardRange,
    resolveDashboardRange,
    serializeDashboardRange,
    type DashboardRangeSelection,
} from './dashboardDisplay';

/**
 * Đồng bộ khoảng thời gian của dashboard với `?range=` trên URL.
 *
 * Giữ nguyên quy ước param `range` đã dùng trước đó nên link cũ (`?range=30d`)
 * vẫn mở đúng; các dạng mới (tháng/tuần/tự chọn) chia sẻ được y như preset.
 *
 * `selection` và `range` đều được memo theo chuỗi trên URL — trang dùng `range`
 * làm dependency của effect gọi API, nên identity phải ổn định giữa các lần
 * render, nếu không sẽ fetch lặp vô hạn.
 */
export const useDashboardRange = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const raw = searchParams.get('range');

    const selection = useMemo(() => parseDashboardRange(raw), [raw]);
    const range = useMemo(() => resolveDashboardRange(selection), [selection]);

    const setSelection = useCallback(
        (next: DashboardRangeSelection) => {
            setSearchParams(
                (prev) => {
                    const params = new URLSearchParams(prev);
                    params.set('range', serializeDashboardRange(next));
                    return params;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    return { selection, setSelection, range };
};

export default useDashboardRange;
