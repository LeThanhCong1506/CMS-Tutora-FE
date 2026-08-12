import { FilterTabs, PageContainer, SectionCard, StatCard } from '../../components/shared';
import { useTabParam } from '../../hooks/useTabParam';
import {
    mockCommissionConfig,
    mockEscrowBookings,
    mockRefundRequests,
} from '../../mocks/financeManagementMockData';
import { mockTreasurySnapshot } from '../../mocks/treasuryMockData';
import { formatCompactNumber } from '../../utils/formatters';
import CommissionConfigTab from './components/CommissionConfigTab';
import EscrowManagementTab from './components/EscrowManagementTab';
import RefundManagementTab from './components/RefundManagementTab';
import FinancialReportsTab from './components/FinancialReportsTab';
import LiquidityReconciliationTab from './components/LiquidityReconciliationTab';
import '../../styles/pages/admin-finance-new.css';

const financeTabs = [
    { key: 'liquidity', label: 'Thanh khoản & đối soát' },
    { key: 'commission', label: 'Cấu hình hoa hồng' },
    { key: 'escrow', label: 'Escrow' },
    { key: 'refunds', label: 'Hoàn tiền' },
    { key: 'reports', label: 'Báo cáo' },
] as const;

type FinanceTab = (typeof financeTabs)[number]['key'];
const FINANCE_TAB_KEYS = financeTabs.map((tab) => tab.key);

const AdminFinanceNewPage = () => {
    const [activeTab, setActiveTab] = useTabParam<FinanceTab>(FINANCE_TAB_KEYS, 'liquidity');

    const escrowTotal = mockEscrowBookings.reduce((sum, b) => sum + b.amount, 0);
    const refundPending = mockRefundRequests.filter((r) => r.status === 'pending' || r.status === 'investigating').length;

    const { obligations, bankBalance, status: liquidityStatus } = mockTreasurySnapshot;
    const totalObligations = obligations.escrowHeld + obligations.tutorWalletBalance + obligations.pendingWithdrawals;
    const liquidityBuffer = bankBalance - totalObligations;

    return (
        <PageContainer
            eyebrow="Mới · Bản đề xuất"
            title="Quản lý tài chính (mới)"
            subtitle="Hoa hồng, escrow, hoàn tiền và báo cáo — phần còn thiếu so với bản hiện tại."
            maxWidth="wide"
        >
            <div className="admin-ui-kpi-grid">
                <StatCard
                    icon={<span className="material-symbols-outlined">account_balance_wallet</span>}
                    value={formatCompactNumber(liquidityBuffer)}
                    label="Đệm thanh khoản"
                    subLabel="Tiền ngân hàng − Tổng nghĩa vụ"
                    badge={liquidityStatus === 'healthy' ? 'Đủ thanh khoản' : liquidityStatus === 'warning' ? 'Cần theo dõi' : 'Thiếu thanh khoản'}
                    badgeVariant={liquidityStatus === 'healthy' ? 'green' : liquidityStatus === 'warning' ? 'orange' : 'red'}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">percent</span>}
                    value={`${mockCommissionConfig.parentFeePercent}% + ${mockCommissionConfig.tutorFeePercent}%`}
                    label="Hoa hồng nền tảng hiện hành"
                    subLabel="Phụ huynh + Gia sư"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">lock_clock</span>}
                    value={`${(escrowTotal / 1_000_000).toFixed(1)}M`}
                    label="Đang giữ trong escrow"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">undo</span>}
                    value={refundPending}
                    label="Yêu cầu hoàn tiền chờ xử lý"
                    badgeVariant="orange"
                />
            </div>

            <SectionCard
                title="Vận hành tài chính"
                subtitle="Các nghiệp vụ chưa có trong bản Tổng quan Tài chính hiện tại."
                headerAction={
                    <FilterTabs
                        tabs={financeTabs}
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as FinanceTab)}
                    />
                }
            >
                {activeTab === 'liquidity' && <LiquidityReconciliationTab />}
                {activeTab === 'commission' && <CommissionConfigTab />}
                {activeTab === 'escrow' && <EscrowManagementTab />}
                {activeTab === 'refunds' && <RefundManagementTab />}
                {activeTab === 'reports' && <FinancialReportsTab />}
            </SectionCard>
        </PageContainer>
    );
};

export default AdminFinanceNewPage;
