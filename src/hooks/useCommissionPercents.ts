import { useEffect, useState } from 'react';
import { getCommissionConfig } from '@/services/adminCommission.service';

/** Đơn vị phần trăm: số nguyên (5 = 5%), giống `CommissionConfig` của service. */
export interface CommissionPercents {
    parent: number;
    tutor: number;
    /** Tổng hai chiều — đây mới là mức phí nền tảng Tutora thu trên học phí gốc. */
    total: number;
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
                setPercents({ parent, tutor, total: parent + tutor });
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
