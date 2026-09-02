import React from 'react';

/**
 * Ô tên người trong bảng báo cáo: tên đậm, và khi tên bị TRÙNG với người khác thì thêm một
 * dòng phụ mờ mang chuỗi phân biệt (số điện thoại). Luật xác định "trùng" nằm ở
 * `findDuplicateNames` trong `personIdentity.ts`.
 *
 * Dòng phụ chỉ hiện cho tên thật sự trùng: tên duy nhất giữ nguyên, không ai phải đọc thêm
 * một dãy số không cần thiết. Cùng kiểu trình bày tên + dòng phụ mờ với bảng người dùng ở
 * `/admin-portal/users`.
 */
export const PersonName: React.FC<{
    name: string;
    contact: string | null | undefined;
    /** Kết quả `findDuplicateNames` của chính danh sách đang hiển thị. */
    duplicates: Set<string>;
    /** Dòng phụ sẵn có của cột — đánh giá, loại khách… Chuỗi phân biệt nối vào sau nó. */
    sub?: React.ReactNode;
}> = ({ name, contact, duplicates, sub }) => {
    const mark = duplicates.has(name) ? contact : null;
    return (
        <>
            <strong>{name}</strong>
            {(sub || mark) && (
                <span className="rev-cell-sub">
                    {sub}
                    {sub && mark ? ' · ' : null}
                    {mark}
                </span>
            )}
        </>
    );
};
