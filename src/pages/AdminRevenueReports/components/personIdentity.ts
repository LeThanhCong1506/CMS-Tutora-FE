/**
 * Phân biệt người TRÙNG TÊN trong báo cáo doanh thu.
 *
 * Dữ liệu thật trùng tên rất nhiều — 5 tài khoản "LÊ THÀNH CÔNG", 4 tài khoản "LÊ THÀNH NAM",
 * và hàng chục nhóm khác trong bảng `users`. Không phân biệt thì hai dòng khác người trông
 * như một dòng bị lặp, còn trên biểu đồ xếp hạng thì thành mấy vạch giống hệt nhau.
 *
 * Bản trước dùng 4 ký tự đầu của UUID (`LÊ THÀNH NAM · e842`). Nó phân biệt được nhưng không
 * ai đọc được: mẩu id đó không tra ngược ra ai, không gõ vào đâu được, và nhìn như dữ liệu
 * rác. Giờ dùng SỐ ĐIỆN THOẠI do backend chọn (xem `PickContact` phía server) — vẫn ngắn,
 * nhưng là thứ admin đối chiếu và gọi được.
 *
 * Tách khỏi `PersonName.tsx` vì eslint `react-refresh/only-export-components`: file có
 * component thì không được export thêm hàm dùng chung.
 */

export interface PersonRef {
    name: string;
    contact: string | null | undefined;
}

/**
 * Những cái tên thuộc về NHIỀU NGƯỜI KHÁC NHAU trong danh sách.
 *
 * Đếm số liên hệ khác nhau của mỗi tên, KHÔNG đếm số dòng. Bảng "Doanh thu theo booking" liệt
 * kê mỗi booking một dòng, nên một gia sư dạy 6 khoá xuất hiện 6 lần — đếm dòng thì người đó
 * bị coi là trùng tên với chính mình và bảng dán số điện thoại lên cả 6 dòng vô cớ.
 *
 * Người không có liên hệ nào gộp chung vào một ô rỗng: dù họ có là hai người thật đi nữa thì
 * cũng chẳng có gì để in ra, nên đánh dấu hay không cũng cho ra cùng một kết quả hiển thị.
 */
export const findDuplicateNames = (people: PersonRef[]): Set<string> => {
    const contactsByName = new Map<string, Set<string>>();
    people.forEach(({ name, contact }) => {
        const set = contactsByName.get(name) ?? new Set<string>();
        set.add(contact ?? '');
        contactsByName.set(name, set);
    });
    return new Set(
        [...contactsByName].filter(([, contacts]) => contacts.size > 1).map(([name]) => name),
    );
};

/**
 * Nhãn một dòng cho biểu đồ. Biểu đồ không có chỗ cho dòng phụ nên chuỗi phân biệt phải nối
 * thẳng vào tên; nhớ nới `labelWidth` của `RankBarChart` ở nơi dùng, mặc định 150px cắt mất
 * đúng phần vừa thêm.
 */
export const chartPersonLabel = (
    name: string,
    contact: string | null | undefined,
    duplicates: Set<string>,
): string => (duplicates.has(name) && contact ? `${name} · ${contact}` : name);
