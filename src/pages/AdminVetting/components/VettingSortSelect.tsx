import { useId } from 'react';
import { VETTING_SORT_OPTIONS } from '../utils/vettingSort';

interface VettingSortSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Danh từ chèn vào nhãn trợ năng, viết thường — vd "hồ sơ", "chứng chỉ". */
  itemNoun: string;
  /** id cố định khi cần trỏ tới từ nơi khác; mặc định tự sinh để 2 trang không đụng id. */
  id?: string;
}

/**
 * Ô sắp xếp dùng chung cho 2 hàng đợi kiểm duyệt (hồ sơ gia sư & chứng chỉ).
 *
 * Không có nhãn hiển thị phía trên: bản thân lựa chọn đang chọn ("Chờ lâu nhất trước") đã tự
 * mô tả, và dòng tóm tắt cuối bảng đã nhắc lại "Đang xếp theo ..." — nên nhãn chỉ để cho trình
 * đọc màn hình qua aria-label. Nhãn các lựa chọn nằm ở utils/vettingSort.ts để dòng tóm tắt
 * cuối bảng dùng lại được.
 */
const VettingSortSelect = ({ value, onChange, itemNoun, id }: VettingSortSelectProps) => {
  const autoId = useId();
  const selectId = id ?? `vetting-sort-${autoId}`;

  return (
    <div className="certificate-sort-control">
      <select
        id={selectId}
        className="admin-ui-search-input vetting-sort-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Sắp xếp danh sách ${itemNoun}`}
      >
        {VETTING_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VettingSortSelect;
