import React from 'react';

/**
 * Thanh công cụ của bảng chi tiết, dùng chung cho MỌI tab báo cáo doanh thu.
 *
 * Trước 01/09/2026 chỉ tab "Doanh thu" có bộ lọc, và nó viết thẳng markup vào chỗ dùng. Bốn
 * tab còn lại không có gì: muốn tìm một gia sư hay một khách hàng thì phải lật từng trang.
 * Tách ra đây để năm cái bảng có cùng một hình dạng — cùng thứ tự chip → ô tìm → sắp xếp,
 * cùng chiều cao 32px, cùng bo góc — thay vì mỗi tab tự dựng một kiểu.
 *
 * Ba thành phần đều là điều khiển "câm": chúng chỉ báo giá trị mới ra ngoài, không tự giữ
 * state và không tự lọc. Việc lọc nằm ở hàm `select*` của từng tab, vì mỗi bảng có cột và
 * ngữ nghĩa khác nhau.
 */

/** Thứ tự trong thanh công cụ là cố định: chip lọc → ô tìm → bộ sắp xếp. */
export const TableToolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="rev-table-toolbar">{children}</div>
);

export interface ChipItem<K extends string> {
    key: K;
    label: string;
    /**
     * Số dòng thuộc nhóm, đếm trên TOÀN BỘ dữ liệu chứ không phải trên kết quả đã lọc — chip
     * phải nói "nhóm này có bao nhiêu". Đếm sau khi lọc thì mọi chip không được chọn đều hiện
     * 0 và không ai bấm sang được nữa.
     */
    count: number;
}

interface FilterChipsProps<K extends string> {
    /**
     * Phần tử ĐẦU TIÊN là nhóm "Tất cả"; các phần tử sau phải là một PHÂN HOẠCH của nó —
     * mỗi dòng thuộc đúng một nhóm. Luật ẩn bên dưới dựa vào điều đó.
     */
    items: ChipItem<K>[];
    value: K;
    onChange: (key: K) => void;
    ariaLabel: string;
}

/**
 * Chip lọc theo nhóm, kèm số dòng mỗi nhóm.
 *
 * Hai luật ẩn, đều để cụm chip không bao giờ là một nút bấm vào chẳng đổi gì:
 *
 *   - Nhóm không có dòng nào thì ẩn chip. Một chip "Đã huỷ 0" chỉ tổ mời người ta bấm vào
 *     một bảng rỗng.
 *   - Còn dưới HAI nhóm con thì ẩn cả cụm. Vì các nhóm con là phân hoạch, nhóm con duy nhất
 *     còn lại chứa đúng mọi dòng của "Tất cả" — hai chip in ra cùng một con số, bấm cái nào
 *     bảng cũng y hệt. Ca này rất hay gặp: mọi gia sư đều đã dạy, mọi khách đều là phụ
 *     huynh, mọi môn đều có doanh thu.
 *
 * Nhóm ĐANG ĐƯỢC CHỌN thì không bao giờ ẩn, kể cả khi nó rơi về 0. Người dùng chọn "Học
 * sinh" rồi đổi khoảng thời gian sang một kỳ không có học sinh nào: ẩn chip đó đi thì bộ lọc
 * vẫn còn hiệu lực mà không còn chỗ nào bấm để bỏ, admin chỉ thấy một cái bảng trống không
 * giải thích được. Để nó ở lại với số 0 thì lý do bảng trống nằm ngay trước mắt.
 */
export function FilterChips<K extends string>({
    items,
    value,
    onChange,
    ariaLabel,
}: FilterChipsProps<K>) {
    const groups = items.slice(1).filter((item) => item.count > 0 || item.key === value);
    if (groups.length < 2 && value === items[0].key) return null;
    const visible = [items[0], ...groups];

    return (
        <div className="rev-segmented" role="tablist" aria-label={ariaLabel}>
            {visible.map((item) => (
                <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={value === item.key}
                    className={value === item.key ? 'is-active' : ''}
                    onClick={() => onChange(item.key)}
                >
                    {item.label}
                    <span className="rev-chip-count">{item.count}</span>
                </button>
            ))}
        </div>
    );
}

export const SearchInput: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    /** Ô tìm không có nhãn nhìn thấy được, nên nhãn cho trình đọc màn hình là bắt buộc. */
    ariaLabel: string;
}> = ({ value, onChange, placeholder, ariaLabel }) => (
    <label className="rev-search">
        <span className="material-symbols-outlined" aria-hidden="true">search</span>
        <input
            type="search"
            value={value}
            placeholder={placeholder}
            aria-label={ariaLabel}
            onChange={(e) => onChange(e.target.value)}
        />
    </label>
);

interface SortSelectProps<K extends string> {
    items: { key: K; label: string }[];
    value: K;
    onChange: (key: K) => void;
    label?: string;
}

export function SortSelect<K extends string>({
    items,
    value,
    onChange,
    label = 'Sắp xếp',
}: SortSelectProps<K>) {
    return (
        <label className="rev-select">
            <span className="rev-select-label">{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value as K)}>
                {items.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                ))}
            </select>
        </label>
    );
}
