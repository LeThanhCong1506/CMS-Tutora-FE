import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { DataTable, FilterTabs, PageContainer, SectionCard, StatCard } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import type { AdminFinancialMetrics } from '../../types/admin.types';
import type { WithdrawalRequestItem } from '../../types/adminPayout.types';
import { formatCurrency, formatCompactNumber, formatDateTime } from '../../utils/formatters';
import { getAdminFinancialMetrics } from '../../services/admin.service';
import {
    getAllPayoutRequests,
    approvePayoutRequest,
    rejectPayoutRequest,
} from '../../services/adminPayout.service';
import ApproveWithdrawalModal from './components/ApproveWithdrawalModal';
import RejectWithdrawalModal from './components/RejectWithdrawalModal';
import TransactionLedger from './components/TransactionLedger';
import '../../styles/pages/admin-financial.css';

type FinancialTab = 'withdrawals' | 'ledger' | 'commission';

const financialTabs = [
    { key: 'withdrawals', label: 'Yêu cầu rút tiền' },
    { key: 'ledger', label: 'Sổ cái giao dịch' },
    { key: 'commission', label: 'Cài đặt hoa hồng' },
];

const AdminFinancialsPage = () => {
    const [metrics, setMetrics] = useState<AdminFinancialMetrics | null>(null);
    const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FinancialTab>('withdrawals');

    const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequestItem | null>(null);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    const fetchFinancialData = useCallback(async () => {
        try {
            setLoading(true);
            // Metrics từ /admin/financials/metrics; danh sách rút tiền chờ duyệt từ /admin/payouts.
            const [metricsData, withdrawalsData] = await Promise.all([
                getAdminFinancialMetrics(),
                getAllPayoutRequests({ status: 'pending', page: 1, pageSize: 50 }),
            ]);

            setMetrics(metricsData);
            setWithdrawalRequests(withdrawalsData.items || []);
        } catch (err) {
            console.error('Error fetching financial data:', err);
            toast.error('Không thể tải dữ liệu tài chính');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchFinancialData();
    }, [fetchFinancialData]);

    const handleApproveClick = (withdrawal: WithdrawalRequestItem) => {
        setSelectedWithdrawal(withdrawal);
        setIsApproveModalOpen(true);
    };

    const handleRejectClick = (withdrawal: WithdrawalRequestItem) => {
        setSelectedWithdrawal(withdrawal);
        setIsRejectModalOpen(true);
    };

    const handleApproveWithdrawal = async (withdrawalId: number, note: string) => {
        await approvePayoutRequest(withdrawalId, note);
        await fetchFinancialData();
    };

    const handleRejectWithdrawal = async (withdrawalId: number, reason: string) => {
        await rejectPayoutRequest(withdrawalId, reason);
        await fetchFinancialData();
    };

    const withdrawalColumns: DataTableColumn<WithdrawalRequestItem>[] = [
        {
            key: 'id',
            title: 'Mã yêu cầu',
            render: (row) => <span className="admin-ui-code-chip">#{row.withdrawalId}</span>,
            hideOnMobile: true,
        },
        {
            key: 'tutor',
            title: 'Gia sư',
            render: (row) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{row.tutorName}</span>
                    <span className="admin-ui-entity-secondary">{row.tutorEmail}</span>
                </div>
            ),
        },
        {
            key: 'bank',
            title: 'Ngân hàng',
            render: (row) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{row.bankName}</span>
                    <span className="admin-ui-entity-secondary">{row.accountNumber}</span>
                </div>
            ),
            hideOnMobile: true,
        },
        {
            key: 'amount',
            title: 'Số tiền',
            render: (row) => <span className="admin-ui-amount">{formatCurrency(row.amount)}</span>,
        },
        {
            key: 'date',
            title: 'Ngày yêu cầu',
            render: (row) => <span className="admin-ui-table-meta">{formatDateTime(row.requestedAt)}</span>,
            hideOnMobile: true,
        },
        {
            key: 'actions',
            title: 'Hành động',
            align: 'right',
            render: (row) => (
                <div className="admin-ui-actions financial-actions">
                    <button className="admin-ui-button admin-ui-button-danger" onClick={() => handleRejectClick(row)}>
                        Từ chối
                    </button>
                    <button className="admin-ui-button admin-ui-button-success" onClick={() => handleApproveClick(row)}>
                        <span className="material-symbols-outlined">check</span>
                        Xử lý
                    </button>
                </div>
            ),
        },
    ];

    // API đã lọc status=pending; giữ filter phòng khi trả thêm.
    const pendingWithdrawals = withdrawalRequests.filter((w) => w.status === 'pending');

    return (
        <>
            <PageContainer
                eyebrow="Tổng quan"
                title="Tổng quan Tài chính"
                subtitle="Theo dõi doanh thu, tiền đang giữ và các yêu cầu rút tiền cần xử lý."
                maxWidth="wide"
                headerAction={
                    <div className="admin-ui-actions">
                        <button className="admin-ui-button admin-ui-button-secondary">
                            <span className="material-symbols-outlined">calendar_today</span>
                            Th10 2023
                        </button>
                        <button className="admin-ui-button admin-ui-button-primary">
                            <span className="material-symbols-outlined">download</span>
                            Xuất báo cáo
                        </button>
                    </div>
                }
            >
                <div className="admin-ui-kpi-grid">
                    <StatCard
                        icon={<span className="material-symbols-outlined">payments</span>}
                        value={loading ? '...' : formatCompactNumber(metrics?.revenue.currentMonthRevenue || 0)}
                        label="Doanh thu nền tảng (tháng này)"
                        badge={
                            metrics?.revenue.monthOverMonthGrowthPercent != null
                                ? `${metrics.revenue.monthOverMonthGrowthPercent >= 0 ? '+' : ''}${metrics.revenue.monthOverMonthGrowthPercent}%`
                                : undefined
                        }
                        badgeVariant="green"
                    />
                    <StatCard
                        icon={<span className="material-symbols-outlined">lock_clock</span>}
                        value={loading ? '...' : formatCompactNumber(metrics?.escrow.totalFrozenBalance || 0)}
                        label="Tiền đang giữ (escrow)"
                    />
                    <StatCard
                        icon={<span className="material-symbols-outlined">undo</span>}
                        value={loading ? '...' : formatCompactNumber(metrics?.escrow.totalRefundedToParents || 0)}
                        label="Tổng hoàn tiền"
                        badgeVariant="red"
                    />
                    <StatCard
                        icon={<span className="material-symbols-outlined">priority_high</span>}
                        value={loading ? '...' : formatCompactNumber(metrics?.withdrawals.totalPendingAmount || 0)}
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
                        activeTab === 'withdrawals'
                            ? `Hiển thị ${pendingWithdrawals.length} yêu cầu rút tiền đang chờ xử lý`
                            : undefined
                    }
                >
                    {activeTab === 'withdrawals' && (
                        <DataTable
                            columns={withdrawalColumns}
                            data={pendingWithdrawals}
                            rowKey="withdrawalId"
                            loading={loading}
                            loadingText="Đang tải yêu cầu rút tiền..."
                            emptyText="Không có yêu cầu rút tiền nào đang chờ xử lý"
                            emptyIcon={
                                <span className="material-symbols-outlined financial-empty-icon">
                                    check_circle
                                </span>
                            }
                            minWidth={840}
                            variant="embedded"
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

            <ApproveWithdrawalModal
                isOpen={isApproveModalOpen}
                onClose={() => {
                    setIsApproveModalOpen(false);
                    setSelectedWithdrawal(null);
                }}
                withdrawal={selectedWithdrawal}
                onApprove={handleApproveWithdrawal}
            />

            <RejectWithdrawalModal
                isOpen={isRejectModalOpen}
                onClose={() => {
                    setIsRejectModalOpen(false);
                    setSelectedWithdrawal(null);
                }}
                withdrawal={selectedWithdrawal}
                onReject={handleRejectWithdrawal}
            />
        </>
    );
};

export default AdminFinancialsPage;
