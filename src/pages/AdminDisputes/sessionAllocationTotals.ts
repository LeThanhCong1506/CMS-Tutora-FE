import type { CourseCancelPreviewDto, SessionAllocation } from '../../services/admin.service';

/**
 * Tổng tiền của bảng "Hủy khóa học & hoàn tiền", tính từ ô tick của Admin/Staff.
 *
 * Tách khỏi component vì có HAI nơi phải hiển thị cùng con số: bảng, và hộp xác nhận trước khi
 * chốt. Trước đây hộp xác nhận đọc số tự động của backend (`remainingSessionsCount`,
 * `parentRefundAmount`) nên nó nói "7 buổi" trong khi Admin/Staff đã tick 8 — hai màn hình cãi nhau
 * ngay tại bước không hoàn tác được.
 */
export interface AllocationTotals {
    /** Tiền chuyển từ escrow vào ví gia sư. */
    tutor: number;
    /** Tiền hoàn về ví phụ huynh. */
    parent: number;
    tutorCount: number;
    parentCount: number;
    /** Buổi còn phải chọn — nút xác nhận bị khoá khi > 0. */
    unassigned: number;
    /** Phí dịch vụ của buổi đã thu tiền + phí sàn của buổi tick cho gia sư. */
    revenue: number;
}

export const computeAllocationTotals = (
    preview: CourseCancelPreviewDto,
    allocations: Record<number, SessionAllocation>,
): AllocationTotals => {
    let tutor = 0;
    let parent = 0;
    let tutorCount = 0;
    let parentCount = 0;
    let unassigned = 0;

    for (const row of preview.sessions) {
        // Buổi đã chốt không tick được nhưng VẪN thuộc về gia sư — bỏ ra khỏi tổng thì con số
        // hiển thị thấp hơn số backend thật sự sẽ chi.
        if (row.isAlreadySettled) {
            tutor += row.tutorAmount;
            tutorCount += 1;
            continue;
        }
        if (!row.isAllocatable) continue;

        const choice = allocations[row.classSessionId] ?? 'none';
        if (choice === 'tutor') {
            tutor += row.tutorAmount;
            tutorCount += 1;
        } else if (choice === 'parent') {
            parent += row.parentAmount;
            parentCount += 1;
        } else {
            unassigned += 1;
        }
    }

    // Doanh thu = phí dịch vụ nền tảng GIỮ LẠI được + phí sàn của các buổi tick cho gia sư.
    //
    // Phí dịch vụ chỉ ở lại khi nó không bị hoàn. Khóa đã qua đợt thanh toán thứ hai thì hoàn theo
    // giá gốc nên phí ở lại với mọi buổi. Nhưng khóa MỚI ĐÓNG CỌC thì hoàn nguyên cả phí, nên buổi
    // nào tick cho phụ huynh là nền tảng trả lại luôn phần phí của buổi đó — không được tính vào
    // doanh thu. Buổi tick cho gia sư thì phí dịch vụ luôn ở lại, vì phụ huynh không được hoàn.
    const feeKeptCount = tutorCount + (preview.refundIncludesServiceFee ? 0 : parentCount);

    const revenue =
        preview.parentServiceFeePerSession * feeKeptCount +
        preview.tutorPlatformFeePerSession * tutorCount;

    return { tutor, parent, tutorCount, parentCount, unassigned, revenue };
};
