/**
 * Danh sách lựa chọn sắp xếp cho 2 hàng đợi kiểm duyệt (hồ sơ gia sư & chứng chỉ).
 *
 * Nhãn cố ý tránh thuật ngữ kỹ thuật ("FIFO", "asc/desc") vì người dùng trang này là admin
 * vận hành, không phải dev — đọc "Chờ lâu nhất trước" là hiểu ngay phải xử lý cái nào trước.
 * Giá trị gửi lên BE vẫn giữ nguyên (xem CertificateParameters.cs).
 *
 * BE còn hỗ trợ tutorname_asc/tutorname_desc nhưng UI không mở ra: hai màn này là hàng đợi
 * xử lý theo lượt, sắp xếp theo tên gia sư không giúp gì cho việc duyệt.
 */
export const VETTING_SORT_DEFAULT = 'createdat_asc';

export const VETTING_SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: VETTING_SORT_DEFAULT, label: 'Chờ lâu nhất trước' },
  { value: 'createdat_desc', label: 'Mới gửi nhất trước' },
];
