import React from 'react';
import { StatCard } from '../../../../components/shared';
import type { PayoutOverview } from '../../../../types/adminPayout.types';
import { formatCurrency } from '../../../../utils/formatters';

interface Props {
    overview: PayoutOverview | null;
    loading: boolean;
}

const metric = (value: React.ReactNode, loading: boolean) => (loading ? '...' : value);

const Icon = ({ name }: { name: string }) => (
    <span className="material-symbols-outlined">{name}</span>
);

const PayoutStatsCards: React.FC<Props> = ({ overview, loading }) => {
    const todayStats = overview?.todayStats;
    const processingStats = overview?.processingStats;
    const financialStats = overview?.financialStats;

    return (
        <div className="admin-ui-kpi-grid payout-stats-grid">
            <StatCard
                icon={<Icon name="request_quote" />}
                value={metric(todayStats?.totalRequests ?? 0, loading)}
                label="Yêu cầu tháng này"
                badge="Volume"
                badgeVariant="blue"
            />
            <StatCard
                icon={<Icon name="verified" />}
                value={metric(todayStats?.autoApproved ?? 0, loading)}
                label="Tự động duyệt"
                badge="Auto"
                badgeVariant="green"
            />
            <StatCard
                icon={<Icon name="pause_circle" />}
                value={metric(todayStats?.delayed ?? 0, loading)}
                label="Đang tạm giữ"
                badge="Hold"
                badgeVariant="orange"
            />
            <StatCard
                icon={<Icon name="policy" />}
                value={metric(todayStats?.manualReview ?? 0, loading)}
                label="Chờ xét duyệt thủ công"
                badge="Review"
                badgeVariant="red"
            />
            <StatCard
                icon={<Icon name="pending_actions" />}
                value={metric(processingStats?.pendingCount ?? 0, loading)}
                label="Chờ xử lý"
                subLabel="Các yêu cầu chưa có quyết định cuối"
                badgeVariant="orange"
            />
            <StatCard
                icon={<Icon name="check_circle" />}
                value={metric(`${(processingStats?.successRate ?? 0).toFixed(1)}%`, loading)}
                label="Tỷ lệ thành công"
                badge="Quality"
                badgeVariant="green"
            />
            <StatCard
                icon={<Icon name="payments" />}
                value={metric(formatCurrency(financialStats?.totalPayoutToday ?? 0), loading)}
                label="Tổng chi hôm nay"
                badge="Today"
                badgeVariant="blue"
            />
            <StatCard
                icon={<Icon name="account_balance_wallet" />}
                value={metric(formatCurrency(financialStats?.totalPayoutThisMonth ?? 0), loading)}
                label="Tổng chi tháng này"
                badge="Month"
                badgeVariant="dark"
            />
        </div>
    );
};

export default PayoutStatsCards;
