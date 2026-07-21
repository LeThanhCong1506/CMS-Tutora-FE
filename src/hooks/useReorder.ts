import { useCallback } from 'react';
import { toast } from 'react-toastify';
import type { ReorderItem } from '../services/adminLookup.service';
import { apiErrorMessage } from '../utils/apiError';

interface Options<T extends { id: number }> {
  items: T[];
  setItems: (items: T[]) => void;
  save: (payload: ReorderItem[]) => Promise<void>;
  /** Gán thứ tự mới vào bản ghi — grade-level dùng levelOrder thay displayOrder. */
  applyOrder: (item: T, order: number) => T;
}

/**
 * Kéo-thả đổi thứ tự: cập nhật lạc quan để thấy ngay, lưu 1 request,
 * lỗi thì trả lại thứ tự cũ.
 */
export function useReorder<T extends { id: number }>({
  items,
  setItems,
  save,
  applyOrder,
}: Options<T>) {
  return useCallback(
    async (orderedIds: number[]) => {
      const previous = items;
      const byId = new Map(items.map((item) => [item.id, item]));
      const reordered = orderedIds
        .map((id, index) => {
          const item = byId.get(id);
          return item ? applyOrder(item, index + 1) : null;
        })
        .filter((item): item is T => item !== null);

      setItems(reordered);
      try {
        await save(reordered.map((item, index) => ({ id: item.id, displayOrder: index + 1 })));
      } catch (err) {
        setItems(previous);
        toast.error(apiErrorMessage(err, 'Lưu thứ tự thất bại.'));
      }
    },
    [items, setItems, save, applyOrder],
  );
}
