import React from 'react';
import type { PayoutOverview } from '../../../../types/adminPayout.types';
import { formatCurrency } from '../../../../utils/formatters';

interface Props {
  overview: PayoutOverview | null;
  loading: boolean;
}

interface OperationMetricProps {
  icon: string;
  value: React.ReactNode;
  label: string;
  note: string;
  tone: 'blue' | 'green' | 'amber' | 'red';
}

const metric = (value: React.ReactNode, loading: boolean) => (loading ? '...' : value);

const OperationMetric: React.FC<OperationMetricProps> = ({ icon, value, label, note, tone }) => (
  <article className={`payout-operation-metric payout-operation-metric--${tone}`}>
    <span className="payout-operation-metric__icon material-symbols-outlined" aria-hidden="true">
      {icon}
    </span>
    <div className="payout-operation-metric__content">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{note}</small>
    </div>
  </article>
);

const PayoutStatsCards: React.FC<Props> = ({ overview, loading }) => {
  const processingStats = overview?.processingStats;
  const financialStats = overview?.financialStats;
  const decisionBreakdown = overview?.decisionBreakdown;

  return (
    <section className="payout-summary-grid" aria-label="Tổng quan thanh toán">
      <article className="payout-cash-card">
        <div className="payout-cash-card__orb" aria-hidden="true" />

        <div className="payout-cash-card__header">
          <div className="payout-cash-card__heading">
            <span className="payout-cash-card__icon material-symbols-outlined" aria-hidden="true">
              account_balance_wallet
            </span>
            <div>
              <span>Quy mô giải ngân</span>
              <h2>Dòng tiền tháng này</h2>
            </div>
          </div>
          <span className="payout-live-badge">
            <span aria-hidden="true" />
            Cập nhật
          </span>
        </div>

        <div className="payout-cash-card__total">
          <span>Tổng giá trị đã chi</span>
          <strong>{metric(formatCurrency(financialStats?.totalPayoutThisMonth ?? 0), loading)}</strong>
        </div>

        <div className="payout-cash-card__metrics">
          <div>
            <span>Chi hôm nay</span>
            <strong>{metric(formatCurrency(financialStats?.totalPayoutToday ?? 0), loading)}</strong>
          </div>
          <div>
            <span>Tỷ lệ thành công</span>
            <strong>{metric(`${(processingStats?.successRate ?? 0).toFixed(1)}%`, loading)}</strong>
          </div>
          <div>
            <span>Đang chờ xử lý</span>
            <strong>{metric((processingStats?.pendingCount ?? 0).toLocaleString('vi-VN'), loading)}</strong>
          </div>
        </div>
      </article>

      <section className="payout-operations-panel" aria-labelledby="payout-operations-title">
        <div className="payout-operations-panel__header">
          <div>
            <span>Quy trình thủ công</span>
            <h2 id="payout-operations-title">Tình trạng xử lý</h2>
          </div>
          <span className="payout-period-chip">Admin / Staff</span>
        </div>

        <div className="payout-operation-grid">
          <OperationMetric
            icon="request_quote"
            value={metric((decisionBreakdown?.totalRequests ?? 0).toLocaleString('vi-VN'), loading)}
            label="Tổng yêu cầu"
            note="Phát sinh trong tháng"
            tone="blue"
          />
          <OperationMetric
            icon="pending_actions"
            value={metric((processingStats?.pendingCount ?? 0).toLocaleString('vi-VN'), loading)}
            label="Cần xử lý"
            note="Chờ tiếp nhận hoặc đang đối soát"
            tone="amber"
          />
          <OperationMetric
            icon="manage_search"
            value={metric((decisionBreakdown?.delayed ?? 0).toLocaleString('vi-VN'), loading)}
            label="Đang tạm giữ"
            note="Chờ bổ sung hoặc đối soát"
            tone="blue"
          />
          <OperationMetric
            icon="cancel"
            value={metric((decisionBreakdown?.rejected ?? 0).toLocaleString('vi-VN'), loading)}
            label="Đã từ chối"
            note="Kết thúc sau khi kiểm tra"
            tone="red"
          />
        </div>
      </section>
    </section>
  );
};

export default PayoutStatsCards;
