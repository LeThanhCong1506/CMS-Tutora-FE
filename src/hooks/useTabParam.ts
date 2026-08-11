import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UseTabParamOptions {
  /** Tên query param. Mặc định `tab`; đổi khi 1 trang có nhiều nhóm tab độc lập. */
  paramKey?: string;
  /**
   * `true` (mặc định) — thay entry hiện tại, bấm tab không dồn history nên nút Back
   * vẫn quay về trang trước. Đặt `false` nếu muốn Back đi ngược từng tab.
   */
  replace?: boolean;
}

/** Param đi kèm ghi cùng lượt với tab. `null`/`undefined` = xoá key khỏi URL. */
export type TabParamExtras = Record<string, string | number | null | undefined>;

/**
 * Đồng bộ state tab với query param trên URL (`?tab=...`).
 *
 * Giải quyết: reload/F5 hoặc share link không còn văng về tab đầu tiên, và tab
 * đang xem nằm luôn trong URL để copy gửi cho người khác.
 *
 * Giá trị trên URL luôn được validate theo `tabs` — param rác (user gõ tay,
 * link cũ sau khi đổi tên tab) rơi về `fallback` thay vì render tab rỗng.
 * Các query param khác trên URL được giữ nguyên.
 *
 * `extras` dùng khi tab đi kèm state phụ (vd. tab "theo ngày" cần `?date=`).
 * **Phải** truyền qua `extras` thay vì gọi `setSearchParams` riêng một lượt nữa:
 * hai lần navigate liên tiếp trong cùng handler đều đọc cùng một snapshot params,
 * nên lượt sau sẽ ghi đè lượt trước.
 *
 * Usage:
 * ```tsx
 * const TABS = ['overview', 'sessions', 'notes'] as const;
 * type DetailTab = (typeof TABS)[number];
 *
 * const [activeTab, setActiveTab] = useTabParam<DetailTab>(TABS, 'overview');
 * setActiveTab('sessions', { date: '2026-08-11' });
 * ```
 */
export function useTabParam<T extends string>(
  tabs: readonly T[],
  fallback: T,
  options: UseTabParamOptions = {},
): [T, (next: T, extras?: TabParamExtras) => void] {
  const { paramKey = 'tab', replace = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(paramKey);
  const activeTab = raw !== null && (tabs as readonly string[]).includes(raw) ? (raw as T) : fallback;

  const setActiveTab = useCallback(
    (next: T, extras?: TabParamExtras) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set(paramKey, next);
          for (const [key, value] of Object.entries(extras ?? {})) {
            if (value === null || value === undefined || value === '') params.delete(key);
            else params.set(key, String(value));
          }
          return params;
        },
        { replace },
      );
    },
    [paramKey, replace, setSearchParams],
  );

  return [activeTab, setActiveTab];
}

export default useTabParam;
