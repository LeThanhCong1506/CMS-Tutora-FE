/**
 * Hai màu định danh cho HAI VẾ của phí sàn: phí gia sư và phí phụ huynh.
 *
 * Sinh ra 03/09/2026 cho thẻ "Doanh thu tạm tính" (chú thích màu ở tiêu đề + dòng "3 mức phí
 * trong kỳ"), rồi dùng tiếp cho nhãn vạch đổi phí của biểu đồ "Dòng tiền theo thời gian".
 * Cùng một mức phí "5% + 5%" hiện ở HAI chỗ trên cùng một trang, cách nhau vài trăm px: tô
 * khác màu ở hai chỗ thì người đọc phải tự kiểm xem có phải cùng một thứ không, mà đó đúng là
 * câu hỏi cả cụm màu này sinh ra để trả lời.
 *
 * Đây là bản JS của `--rev-fee-tutor` / `--rev-fee-parent` trong
 * `styles/pages/admin-revenue-reports.css`, và PHẢI trùng khít với nó — ECharts nhận màu bằng
 * giá trị nên không đọc được biến CSS. Phần CSS giữ lời giải thích đầy đủ vì sao là tím + xanh
 * mòng két chứ không phải cặp nào khác (đo ΔE với ba màu ngữ nghĩa cùng thẻ, và tương phản
 * WCAG trên nền trắng). Đọc nó TRƯỚC khi đổi bất kỳ vế nào, và đổi thì đổi cả hai file.
 */
export const FEE_SIDE_COLOR = {
    tutor: '#6d28d9',
    parent: '#0e7490',
} as const;
