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
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';

/**
 * "Chờ xử lý" = đã tạo yêu cầu nhưng TIỀN CHƯA CHI XONG. Phải khớp đúng
 * `AdminFinancialService.PendingWithdrawalStatuses` ở backend — thẻ thống kê đếm theo danh
 * sách đó, nên nếu bảng bên dưới lọc hẹp hơn thì thẻ báo "1 chờ xử lý" mà bảng lại trống
 * (đúng lỗi đã gặp: yêu cầu ở trạng thái `approved` bị bảng lọc `pending` bỏ sót).
 */
const PENDING_WITHDRAWAL_STATUSES = ['pending', 'pending_review', 'delayed', 'approved'] as const;

// Tab "Cài đặt hoa hồng" đã bỏ khỏi trang này: nó vốn chỉ là placeholder chưa cài đặt, và
// cấu hình thật (2 mức % phụ huynh/gia sư + lưu) đã có đầy đủ ở trang Cài đặt
// (/admin-portal/settings — xem AdminSettingsPage). Giữ 2 nơi sẽ dễ lệch nhau.
type FinancialTab = 'withdrawals' | 'ledger';
const FINANCIAL_TAB_KEYS: readonly FinancialTab[] = ['withdrawals', 'ledger'];

const financialTabs = [
    { key: 'withdrawals', label: 'Yêu cầu rút tiền' },
    { key: 'ledger', label: 'Sổ cái giao dịch' },
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
            toast.error(
                `${apiErrorMessage(err, 'Không tải được số liệu tài chính.')} Số liệu đang hiển thị là dữ liệu mẫu, không phải số thật.`,
            );
        } finally {
            setMetricsLoading(false);
        }
    }, []);

    const fetchWithdrawals = useCallback(async () => {
        try {
            setWithdrawalLoading(true);
            const res = await getWithdrawalRequests(
                withdrawalPage,
                withdrawalPageSize,
                PENDING_WITHDRAWAL_STATUSES.join(','),
            );
            setWithdrawalRequests(res.items);
            setWithdrawalTotal(res.total);
        } catch (err) {
            console.error('Error fetching withdrawal requests:', err);
            // TEMP: mock fallback for local UI preview — remove once backend is reachable.
            setWithdrawalRequests(mockWithdrawalRequests);
            toast.error(
                `${apiErrorMessage(err, 'Không tải được yêu cầu rút tiền.')} Danh sách đang hiển thị là dữ liệu mẫu, không phải số thật.`,
            );
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
            eyebrow="Báo cáo"
            eyebrowInfo="Theo dõi doanh thu, tiền đang giữ, dòng tiền và các yêu cầu rút tiền cần xử lý."
            title="Tài chính"
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
                <div className="admin-ui-toolbar financial-tabs-toolbar">
                    <FilterTabs
                        tabs={financialTabs}
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as FinancialTab)}
                    />
                </div>
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
            </SectionCard>
        </PageContainer>
    );
};

export default AdminFinancialsPage;
