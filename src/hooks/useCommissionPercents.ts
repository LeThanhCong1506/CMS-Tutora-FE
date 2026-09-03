import { useEffect, useState } from 'react';
import { getCommissionConfig } from '@/services/adminCommission.service';

/** Đơn vị phần trăm: số nguyên (5 = 5%), giống `CommissionConfig` của service. */
export interface CommissionPercents {
    parent: number;
    tutor: number;
    /** Tổng hai chiều — đây mới là mức phí nền tảng Tutora thu trên học phí gốc. */
    total: number;
    /* Hai trường đã bỏ 03/09/2026, cùng lượt với dòng "mức phí đang áp dụng" trên thẻ Phân bổ
       — thứ duy nhất từng đọc chúng:

         `previous` (mức ngay trước lần đổi gần nhất) sai từ ý niệm: "mức cũ" KHÔNG phải một
         con số duy nhất, lịch cũ nằm rải ở mọi mức từng áp. Đo thật trên dev — câu sinh ra từ
         nó ghi "10% + 10% → 20% + 20%" trong khi 94% học phí gốc của kỳ vẫn ở 5% + 5%.

         `changedAt` (mốc hiệu lực của mức hiện tại) thì đúng, chỉ là thừa: nó chính là
         `history[0].changedAt`, và `history` vẫn còn ở dưới cho biểu đồ vẽ vạch mốc.

       Thành phần thật của một kỳ nay do `RevenueSummary.rateMix` kể. */
    /**
     * Toàn bộ lần đổi mức đã ghi sổ, MỚI NHẤT TRƯỚC (giữ nguyên thứ tự backend trả). Mỗi phần
     * tử mang mức BẮT ĐẦU có hiệu lực từ `changedAt`.
     *
     * Biểu đồ xu hướng lọc theo khoảng đang xem để vẽ vạch mốc, nên nó cần cả danh sách chứ
     * không chỉ lần đổi gần nhất: một kỳ 90 ngày có thể chứa nhiều hơn một lần đổi, và vẽ
     * thiếu vạch thì đoạn giữa hai lần đổi trông như không giải thích được.
     *
     * Backend trả tối đa 20 bản ghi (`HistoryPageSize`). Kỳ báo cáo dài mà có hơn 20 lần đổi
     * thì mất vạch cũ nhất — chấp nhận: 20 lần đổi phí sàn là kịch bản chưa từng xảy ra, và
     * đánh đổi lại là không phải phân trang một danh sách chỉ để vẽ chú thích.
     */
    history: { parent: number; tutor: number; changedAt: string }[];
}

/**
 * Tỉ lệ phí sàn đang áp dụng, đọc từ `/admin/commission/config`.
 *
 * Hai mức phí này KHÔNG cố định: backend đọc chúng từ bảng `Systemconfig`
 * (`CommissionConfigService.GetFeePercentsAsync`), và admin sửa được ngay trong CMS ở trang
 * Cài đặt; 5%/5% chỉ là giá trị dự phòng khi chưa có bản ghi cấu hình.
 *
 * Vì vậy báo cáo doanh thu không được viết cứng "5%" hay "10%" vào chú thích: đổi cấu hình
 * xong thì con số vẫn đúng nhưng câu giải thích bên cạnh sẽ nói sai. Endpoint báo cáo không
 * trả về hai tỉ lệ này nên phải hỏi riêng.
 *
 * ─── Vì sao hook trả cả MỐC ĐỔI, không chỉ mức hiện tại (03/09/2026) ────────────
 *
 * Mức phí chốt cứng vào từng booking lúc khách bấm đặt (`BookingFeeCalculator` chạy một lần,
 * kết quả lưu vào `Parentfee` / `Tutorfee`), nên đổi cấu hình KHÔNG hồi tố. Hệ quả: sau mỗi
 * lần đổi, một kỳ báo cáo chứa lịch ở hai mức khác nhau và tỉ lệ thực tế của kỳ nằm giữa hai
 * mức — đo trên dev 03/09/2026 là 5,2% trong khi cấu hình đã là 10%.
 *
 * Nếu chỗ hiển thị chỉ biết mức hiện tại thì nó không có cách nào nói ra vì sao hai con số
 * lệch nhau, và người đọc kết luận báo cáo tính sai. `AdminGetAsync` đã trả sẵn `history`
 * (giảm dần theo `changedAt`, phần tử đầu mang chính mức đang áp dụng) — trước đây hook nhận
 * rồi vứt đi.
 *
 * Trả `null` khi chưa tải xong hoặc gọi lỗi — nơi dùng phải ẩn hẳn phần chữ tỉ lệ thay vì
 * đoán một con số, vì đoán sai còn tệ hơn không nói gì.
 */
export const useCommissionPercents = (): CommissionPercents | null => {
    const [percents, setPercents] = useState<CommissionPercents | null>(null);

    useEffect(() => {
        let cancelled = false;

        getCommissionConfig()
            .then((config) => {
                if (cancelled) return;
                const parent = Number(config.parentFeePercent);
                const tutor = Number(config.tutorFeePercent);
                if (!Number.isFinite(parent) || !Number.isFinite(tutor)) return;

                // Backend đã `OrderByDescending(h => h.Changedat)` — không sắp lại.
                const history = Array.isArray(config.history) ? config.history : [];

                setPercents({
                    parent,
                    tutor,
                    total: parent + tutor,
                    // Bỏ bản ghi thiếu/hỏng ngay tại đây thay vì bắt mỗi nơi dùng tự phòng thủ:
                    // một mốc không có `changedAt` thì không gắn được lên trục thời gian.
                    history: history
                        .filter((h) => typeof h.changedAt === 'string'
                            && Number.isFinite(Number(h.parentFeePercent))
                            && Number.isFinite(Number(h.tutorFeePercent)))
                        .map((h) => ({
                            parent: Number(h.parentFeePercent),
                            tutor: Number(h.tutorFeePercent),
                            changedAt: h.changedAt,
                        })),
                });
            })
            .catch(() => {
                // Không có tỉ lệ thì phần chú thích tự ẩn — số tiền trên trang vẫn đúng.
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return percents;
};
