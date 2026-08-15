import React from 'react';
import { StatCard } from '../../../../components/shared';
import type { PayoutOverview } from '../../../../types/adminPayout.types';
import { formatCurrency } from '../../../../utils/formatters';

interface Props {
  overview: PayoutOverview | null;
  loading: boolean;
  /** Bấm vào thẻ thì lọc luôn danh sách bên dưới — giống trang Phản ánh buổi học. */
  onSelectStatus?: (status: string) => void;
}

const icon = (name: string) => <span className="material-symbols-outlined">{name}</span>;

/**
 * Dùng StatCard chung của CMS thay vì bộ card riêng của trang payout.
 *
 * Bỏ ba số cũ vì chúng không giúp gì cho người đang xử lý hàng đợi:
 * - "Tỷ lệ thành công": payout giờ là chuyển khoản tay, staff chỉ bấm duyệt sau khi đã chuyển
 *   xong nên tỷ lệ này luôn xấp xỉ 100%.
 * - "Đang tạm giữ" (decisionBreakdown.delayed): đếm theo `decision = DELAYED`, mà không luồng nào
 *   còn ghi giá trị đó nữa (BE chỉ ghi MANUAL_REVIEW lúc tạo, ADMIN/STAFF_APPROVED lúc duyệt) —
 *   nghĩa là luôn bằng 0.
 * - "Tổng yêu cầu tháng": số thống kê, không phải việc cần làm; đã có tổng ở chân bảng.
 */
const PayoutStatsCards: React.FC<Props> = ({ overview, loading, onSelectStatus }) => {
  const value = (input: React.ReactNode) => (loading ? '...' : input);
  const { processingStats, financialStats, decisionBreakdown } = overview ?? {};

  return (
    <div className="admin-ui-kpi-grid payout-kpi-grid">
      <StatCard
        icon={icon('pending_actions')}
        value={value((processingStats?.pendingCount ?? 0).toLocaleString('vi-VN'))}
        label="Yêu cầu cần xử lý"
        subLabel="Chờ xét duyệt, đang tạm giữ hoặc đã có người nhận"
        onClick={onSelectStatus ? () => onSelectStatus('pending_review') : undefined}
      />
      <StatCard
        icon={icon('payments')}
        value={value(formatCurrency(financialStats?.totalPayoutToday ?? 0))}
        label="Đã chi hôm nay"
        subLabel="Tổng tiền các yêu cầu đã chuyển khoản xong"
      />
      <StatCard
        icon={icon('calendar_month')}
        value={value(formatCurrency(financialStats?.totalPayoutThisMonth ?? 0))}
        label="Đã chi tháng này"
        subLabel="Tính từ đầu tháng đến hiện tại"
      />
      <StatCard
        icon={icon('cancel')}
        value={value((decisionBreakdown?.rejected ?? 0).toLocaleString('vi-VN'))}
        label="Đã từ chối tháng này"
        subLabel="Tiền đã được hoàn lại vào ví người dùng"
        onClick={onSelectStatus ? () => onSelectStatus('rejected') : undefined}
      />
    </div>
  );
};

export default PayoutStatsCards;
