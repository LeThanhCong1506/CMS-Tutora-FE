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
  const todayStats = overview?.todayStats;
  const processingStats = overview?.processingStats;
  const financialStats = overview?.financialStats;

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
            <span>Tổng quan vận hành</span>
            <h2 id="payout-operations-title">Khối lượng xử lý</h2>
          </div>
          <span className="payout-period-chip">Tháng này</span>
        </div>

        <div className="payout-operation-grid">
          <OperationMetric
            icon="request_quote"
            value={metric((todayStats?.totalRequests ?? 0).toLocaleString('vi-VN'), loading)}
            label="Tổng yêu cầu"
            note="Phát sinh trong tháng"
            tone="blue"
          />
          <OperationMetric
            icon="verified"
            value={metric((todayStats?.autoApproved ?? 0).toLocaleString('vi-VN'), loading)}
            label="Tự động duyệt"
            note="Đã qua kiểm tra hệ thống"
            tone="green"
          />
          <OperationMetric
            icon="pause_circle"
            value={metric((todayStats?.delayed ?? 0).toLocaleString('vi-VN'), loading)}
            label="Đang tạm giữ"
            note="Cần theo dõi thời hạn"
            tone="amber"
          />
          <OperationMetric
            icon="policy"
            value={metric((todayStats?.manualReview ?? 0).toLocaleString('vi-VN'), loading)}
            label="Xét duyệt thủ công"
            note="Cần quyết định từ admin"
            tone="red"
          />
        </div>
      </section>
    </section>
  );
};

export default PayoutStatsCards;
