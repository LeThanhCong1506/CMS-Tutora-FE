import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import UnderDevelopment from '../../components/UnderDevelopment/UnderDevelopment';
import { DataTable, FilterTabs, PageContainer, SectionCard, StatCard } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import type { FinancialMetrics, WithdrawalRequest } from '../../types/admin.types';
import { formatCurrency, formatCompactNumber, formatDateTime } from '../../utils/formatters';
import {
    mockGetFinancialMetrics,
    mockGetWithdrawalRequests,
    mockApproveWithdrawal,
    mockRejectWithdrawal,
} from './mockData';
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
    const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
    const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<FinancialTab>('withdrawals');

    const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    const fetchFinancialData = useCallback(async () => {
        try {
            setLoading(true);
            const [metricsData, withdrawalsData] = await Promise.all([
                mockGetFinancialMetrics(),
                mockGetWithdrawalRequests(),
            ]);

            setMetrics(metricsData);
            setWithdrawalRequests(withdrawalsData);
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

    const handleApproveClick = (withdrawal: WithdrawalRequest) => {
        setSelectedWithdrawal(withdrawal);
        setIsApproveModalOpen(true);
    };

    const handleRejectClick = (withdrawal: WithdrawalRequest) => {
        setSelectedWithdrawal(withdrawal);
        setIsRejectModalOpen(true);
    };

    const handleApproveWithdrawal = async (withdrawalId: string) => {
        await mockApproveWithdrawal(withdrawalId);
        await fetchFinancialData();
    };

    const handleRejectWithdrawal = async (withdrawalId: string, reason: string) => {
        await mockRejectWithdrawal(withdrawalId, reason);
        await fetchFinancialData();
    };

    const withdrawalColumns: DataTableColumn<WithdrawalRequest>[] = [
        {
            key: 'id',
            title: 'Mã yêu cầu',
            render: (row) => <span className="admin-ui-code-chip">#{row.withdrawalid}</span>,
            hideOnMobile: true,
        },
        {
            key: 'tutor',
            title: 'Gia sư',
            render: (row) => (
                <div className="admin-table-user">
                    <div className="admin-user-thumbnail" style={{ backgroundImage: `url('${row.tutoravatar}')` }} />
                    <div className="admin-ui-entity">
                        <span className="admin-ui-entity-primary">{row.tutorname}</span>
                        <span className="admin-ui-entity-secondary">{row.tutorsubject}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'bank',
            title: 'Ngân hàng',
            render: (row) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{row.bankname}</span>
                    <span className="admin-ui-entity-secondary">{row.bankaccountmasked}</span>
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
            render: (row) => <span className="admin-ui-table-meta">{formatDateTime(row.requestedat)}</span>,
            hideOnMobile: true,
        },
        {
            key: 'actions',
            title: 'Hành động',
            align: 'right',
            render: (row) => (
                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end' }}>
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
                <UnderDevelopment featureName="tài chính" />

                <div className="admin-ui-kpi-grid">
                    <StatCard
                        icon={<span className="material-symbols-outlined">payments</span>}
                        value={loading ? '...' : formatCompactNumber(metrics?.monthlyrevenue || 0)}
                        label="Doanh thu nền tảng (30 ngày)"
                        badge={`+${metrics?.revenuegrowth || 0}%`}
                        badgeVariant="green"
                    />
                    <StatCard
                        icon={<span className="material-symbols-outlined">lock_clock</span>}
                        value={loading ? '...' : formatCompactNumber(metrics?.escrowbalance || 0)}
                        label="Tiền đang giữ"
                    />
                    <StatCard
                        icon={<span className="material-symbols-outlined">undo</span>}
                        value={loading ? '...' : formatCompactNumber(metrics?.totalrefunds || 0)}
                        label="Tổng hoàn tiền (30 ngày)"
                        badgeVariant="red"
                    />
                    <StatCard
                        icon={<span className="material-symbols-outlined">priority_high</span>}
                        value={loading ? '...' : formatCompactNumber(metrics?.pendingwithdrawalamount || 0)}
                        label="Yêu cầu rút tiền"
                        badge={`${metrics?.pendingwithdrawals || 0} chờ xử lý`}
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
                            rowKey="withdrawalid"
                            loading={loading}
                            loadingText="Đang tải yêu cầu rút tiền..."
                            emptyText="Không có yêu cầu rút tiền nào đang chờ xử lý"
                            emptyIcon={
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>
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
                            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
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
