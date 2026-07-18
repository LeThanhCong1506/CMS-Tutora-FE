import React from 'react';
import { SectionCard, StatusBadge } from '../../../../components/shared';
import type { PreviousWithdrawal } from '../../../../types/adminPayout.types';
import { formatCurrency, formatDateTime } from '../../../../utils/formatters';
import WithdrawalStatusBadge from '../../WithdrawalStatusBadge';

interface Props {
  withdrawals: PreviousWithdrawal[];
  loading: boolean;
}

const PreviousWithdrawalsCard: React.FC<Props> = ({ withdrawals, loading }) => {
  const items = withdrawals ?? [];

  return (
    <SectionCard
      className="payout-previous-card"
      title="Lịch sử rút tiền"
      subtitle="Các yêu cầu gần nhất của người dùng này, hỗ trợ đối chiếu trước khi duyệt."
      headerAction={
        <StatusBadge variant={items.length > 0 ? 'info' : 'neutral'} shape="tag">
          {items.length} yêu cầu
        </StatusBadge>
      }
      padded
    >
      {loading ? (
        <div className="admin-ui-muted-state">Đang tải lịch sử rút tiền...</div>
      ) : items.length === 0 ? (
        <div className="payout-empty-state">
          <span className="material-symbols-outlined">history</span>
          <p>Đây là yêu cầu rút tiền đầu tiên của người dùng</p>
        </div>
      ) : (
        <div className="payout-previous-list">
          {items.map((item) => (
            <div className="payout-previous-item" key={item.withdrawalId}>
              <div className="payout-previous-main">
                <span className="admin-ui-code-chip">#{item.withdrawalId}</span>
                <span className="admin-ui-amount">{formatCurrency(item.amount)}</span>
              </div>
              <div className="payout-previous-meta">
                <span className="admin-ui-table-meta">{formatDateTime(item.requestedAt)}</span>
                <WithdrawalStatusBadge status={item.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
};

export default PreviousWithdrawalsCard;
