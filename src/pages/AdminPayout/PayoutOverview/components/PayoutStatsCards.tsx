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
        infoTooltip="Số yêu cầu rút tiền còn trong hàng đợi: đang chờ xét duyệt, đang tạm giữ hoặc đã có nhân viên nhận xử lý. Bấm vào thẻ để lọc danh sách bên dưới."
        onClick={onSelectStatus ? () => onSelectStatus('pending_review') : undefined}
      />
      <StatCard
        icon={icon('payments')}
        value={value(formatCurrency(financialStats?.totalPayoutToday ?? 0))}
        label="Đã chi hôm nay"
        infoTooltip="Tổng số tiền của các yêu cầu đã chuyển khoản xong trong ngày hôm nay."
      />
      <StatCard
        icon={icon('calendar_month')}
        value={value(formatCurrency(financialStats?.totalPayoutThisMonth ?? 0))}
        label="Đã chi tháng này"
        infoTooltip="Tổng số tiền đã chuyển khoản xong, tính từ đầu tháng đến hiện tại."
      />
      <StatCard
        icon={icon('cancel')}
        value={value((decisionBreakdown?.rejected ?? 0).toLocaleString('vi-VN'))}
        label="Đã từ chối tháng này"
        infoTooltip="Số yêu cầu bị từ chối trong tháng này; tiền đã được hoàn lại vào ví người dùng. Bấm vào thẻ để lọc danh sách bên dưới."
        onClick={onSelectStatus ? () => onSelectStatus('rejected') : undefined}
      />
    </div>
  );
};

export default PayoutStatsCards;
