import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import { useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = ADMIN_PAGE_SIZE;

export interface ClientPagination<T> {
    /** Trang hiện tại, đã kẹp trong khoảng hợp lệ. */
    page: number;
    setPage: (page: number) => void;
    /** Phần tử của trang hiện tại — truyền thẳng vào `data` của DataTable. */
    pageItems: T[];
    /** Tổng số phần tử sau khi lọc — truyền vào `pagination.total`. */
    total: number;
    pageSize: number;
}

/**
 * Phân trang phía client cho các bảng admin đang nhận nguyên mảng từ API.
 *
 * Dùng khi endpoint trả về toàn bộ danh sách (hoặc `PagedList<T>` — kiểu này kế thừa
 * `List<T>` ở BE nên serialize thành mảng thuần và mất hết metadata phân trang, không có
 * `totalCount` để phân trang phía server).
 *
 * Trang được kẹp lại theo tổng số hiện tại thay vì reset về 1 bằng `useEffect`: khi người dùng
 * lọc bớt và trang đang đứng vượt quá số trang mới thì tự lùi về trang cuối, không rơi vào
 * cảnh bảng trống mà vẫn hiện "trang 5".
 */
export function useClientPagination<T>(
    items: T[],
    pageSize: number = DEFAULT_PAGE_SIZE,
): ClientPagination<T> {
    const [rawPage, setPage] = useState(1);

    // Vài service của CMS khai kiểu trả về là mảng nhưng thực tế nhận về object phân trang
    // của BE. Chặn ở đây để một service khai sai kiểu không làm sập cả trang.
    const safeItems = Array.isArray(items) ? items : [];

    const total = safeItems.length;
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, rawPage), lastPage);

    const pageItems = useMemo(
        () => safeItems.slice((page - 1) * pageSize, page * pageSize),
        [safeItems, page, pageSize],
    );

    return { page, setPage, pageItems, total, pageSize };
}
