import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilterTabs, PageContainer, SectionCard, StatCard } from '../../components/shared';
import type { FinancialMetrics } from '../../types/admin.types';
import type { WithdrawalRequestItem } from '../../types/adminPayout.types';
import { getFinancialMetrics } from '../../services/admin.service';
import { getWithdrawalRequests } from '../../services/adminPayout.service';
import { formatCompactNumber } from '../../utils/formatters';
import { useTabParam } from '../../hooks/useTabParam';
import WithdrawalRequestTable from '../AdminPayout/PayoutOverview/components/WithdrawalRequestTable';
import TransactionLedger from './components/TransactionLedger';
// TEMP: mock fallback for local UI preview while the backend is offline — see src/mocks/financialsMockFallback.ts
import { mockFinancialMetrics, mockWithdrawalRequests } from '../../mocks/financialsMockFallback';
import '../../styles/pages/admin-financial.css';

type FinancialTab = 'withdrawals' | 'ledger' | 'commission';
const FINANCIAL_TAB_KEYS: readonly FinancialTab[] = ['withdrawals', 'ledger', 'commission'];

const financialTabs = [
    { key: 'withdrawals', label: 'Yêu cầu rút tiền' },
    { key: 'ledger', label: 'Sổ cái giao dịch' },
    { key: 'commission', label: 'Cài đặt hoa hồng' },
];

const AdminFinancialsPage = () => {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
    const [metricsLoading, setMetricsLoading] = useState(true);

    const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestItem[]>([]);
    const [withdrawalTotal, setWithdrawalTotal] = useState(0);
    const [withdrawalPage, setWithdrawalPage] = useState(1);
    const [withdrawalPageSize, setWithdrawalPageSize] = useState(ADMIN_PAGE_SIZE);
    const [withdrawalLoading, setWithdrawalLoading] = useState(true);

    const [activeTab, setActiveTab] = useTabParam<FinancialTab>(FINANCIAL_TAB_KEYS, 'withdrawals');

    const fetchMetrics = useCallback(async () => {
        try {
            setMetricsLoading(true);
            setMetrics(await getFinancialMetrics());
        } catch (err) {
            console.error('Error fetching financial metrics:', err);
            // TEMP: mock fallback for local UI preview — remove once backend is reachable.
            setMetrics(mockFinancialMetrics);
        } finally {
            setMetricsLoading(false);
        }
    }, []);

    const fetchWithdrawals = useCallback(async () => {
        try {
            setWithdrawalLoading(true);
            const res = await getWithdrawalRequests(withdrawalPage, withdrawalPageSize, 'pending');
            setWithdrawalRequests(res.items);
            setWithdrawalTotal(res.total);
        } catch (err) {
            console.error('Error fetching withdrawal requests:', err);
            // TEMP: mock fallback for local UI preview — remove once backend is reachable.
            setWithdrawalRequests(mockWithdrawalRequests);
            setWithdrawalTotal(mockWithdrawalRequests.length);
        } finally {
            setWithdrawalLoading(false);
        }
    }, [withdrawalPage, withdrawalPageSize]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchMetrics();
    }, [fetchMetrics]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchWithdrawals();
    }, [fetchWithdrawals]);

    return (
        <PageContainer
            eyebrow="Tổng quan"
            title="Tổng quan Tài chính"
            subtitle="Theo dõi doanh thu, tiền đang giữ và các yêu cầu rút tiền cần xử lý."
            maxWidth="wide"
        >
            <div className="admin-ui-kpi-grid">
                <StatCard
                    icon={<span className="material-symbols-outlined">payments</span>}
                    value={metricsLoading ? '...' : formatCompactNumber(metrics?.revenue.currentMonthRevenue || 0)}
                    label="Doanh thu nền tảng (tháng này)"
                    badge={
                        metrics?.revenue.monthOverMonthGrowthPercent != null
                            ? `${metrics.revenue.monthOverMonthGrowthPercent >= 0 ? '+' : ''}${metrics.revenue.monthOverMonthGrowthPercent}%`
                            : undefined
                    }
                    badgeVariant={
                        (metrics?.revenue.monthOverMonthGrowthPercent ?? 0) >= 0 ? 'green' : 'red'
                    }
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">lock_clock</span>}
                    value={metricsLoading ? '...' : formatCompactNumber(metrics?.escrow.totalFrozenBalance || 0)}
                    label="Tiền đang giữ (escrow)"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">undo</span>}
                    value={metricsLoading ? '...' : formatCompactNumber(metrics?.escrow.totalRefundedToParents || 0)}
                    label="Tổng hoàn tiền cho phụ huynh"
                    badgeVariant="red"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">priority_high</span>}
                    value={metricsLoading ? '...' : formatCompactNumber(metrics?.withdrawals.totalPendingAmount || 0)}
                    label="Yêu cầu rút tiền"
                    badge={`${metrics?.withdrawals.totalPending || 0} chờ xử lý`}
                    badgeVariant="orange"
                />
            </div>

            <SectionCard
                title="Dòng tiền và thanh toán"
                subtitle="Ưu tiên xử lý các yêu cầu rút tiền đang chờ để giảm backlog vận hành."
                headerAction={
                    <FilterTabs
                        tabs={financialTabs}
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as FinancialTab)}
                    />
                }
                footer={
                    activeTab === 'withdrawals' ? (
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-secondary"
                            onClick={() => navigate('/admin-portal/payouts')}
                        >
                            Xử lý tại trang Quản lý Rút tiền
                        </button>
                    ) : undefined
                }
            >
                {activeTab === 'withdrawals' && (
                    <WithdrawalRequestTable
                        data={withdrawalRequests}
                        loading={withdrawalLoading}
                        total={withdrawalTotal}
                        currentPage={withdrawalPage}
                        pageSize={withdrawalPageSize}
                        onPageChange={(page, size) => {
                            setWithdrawalPage(page);
                            setWithdrawalPageSize(size);
                        }}
                    />
                )}

                {activeTab === 'ledger' && <TransactionLedger />}

                {activeTab === 'commission' && (
                    <div className="admin-ui-muted-state">
                        <span className="material-symbols-outlined financial-muted-icon">
                            settings
                        </span>
                        <p>Cài đặt hoa hồng sẽ được triển khai trong Phase 3.</p>
                    </div>
                )}
            </SectionCard>
        </PageContainer>
    );
};

export default AdminFinancialsPage;
