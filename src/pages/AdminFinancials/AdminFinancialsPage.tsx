import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import UnderDevelopment from '../../components/UnderDevelopment/UnderDevelopment';
import { StatCard, FilterTabs, DataTable } from '../../components/shared';
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
import '../../styles/pages/admin-dashboard.css';
import '../../styles/pages/admin-financial.css';

const AdminFinancialsPage = () => {
    // State
    const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
    const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'withdrawals' | 'ledger' | 'commission'>('withdrawals');

    // Modal state
    const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        fetchFinancialData();
    }, []);

    const fetchFinancialData = async () => {
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
    };

    // Handlers
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
        // Refresh data
        await fetchFinancialData();
    };

    const handleRejectWithdrawal = async (withdrawalId: string, reason: string) => {
        await mockRejectWithdrawal(withdrawalId, reason);
        // Refresh data
        await fetchFinancialData();
    };

    // Withdrawal table columns
    const withdrawalColumns: DataTableColumn<WithdrawalRequest>[] = [
        {
            key: 'id',
            title: 'Mã yêu cầu',
            render: (row) => (
                <span className="admin-status-badge bg-slate-50 text-slate-800 font-mono">
                    #{row.withdrawalid}
                </span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'tutor',
            title: 'Thông tin gia sư',
            render: (row) => (
                <div className="admin-table-user">
                    <div className="admin-user-thumbnail" style={{ backgroundImage: `url('${row.tutoravatar}')` }} />
                    <div className="admin-user-details">
                        <p className="admin-user-name-text">{row.tutorname}</p>
                        <p className="admin-user-subtitle">{row.tutorsubject}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'bank',
            title: 'Thông tin ngân hàng',
            render: (row) => (
                <div className="bank-details">
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-navy)' }}>account_balance</span>
                    <div className="bank-info">
                        <span className="bank-name">{row.bankname}</span>
                        <span className="bank-account">{row.bankaccountmasked}</span>
                    </div>
                </div>
            ),
            hideOnMobile: true,
        },
        {
            key: 'amount',
            title: 'Số tiền',
            render: (row) => <span className="amount-text">{formatCurrency(row.amount)}</span>,
        },
        {
            key: 'date',
            title: 'Ngày yêu cầu',
            render: (row) => (
                <span className="text-slate-600 font-medium text-sm">{formatDateTime(row.requestedat)}</span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'actions',
            title: 'Hành động',
            align: 'right',
            render: (row) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="btn-reject" onClick={() => handleRejectClick(row)}>Từ chối</button>
                    <button className="btn-process" onClick={() => handleApproveClick(row)}>
                        <span className="material-symbols-outlined">check</span>
                        Xử lý thanh toán
                    </button>
                </div>
            ),
        },
    ];

    const pendingWithdrawals = withdrawalRequests.filter((w) => w.status === 'pending');

    return (
        <>
            {/* PAGE CONTENT */}
            <div className="admin-content">
                <div className="admin-content-inner">

                    {/* Page Header */}
                    <div className="admin-greeting" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <p style={{ color: 'var(--color-navy-60)', margin: '0 0 4px', fontSize: '14px', fontWeight: 500 }}>Tổng quan</p>
                            <h1 className="admin-greeting-title" style={{ fontSize: '32px' }}>Tổng quan Tài chính</h1>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button className="admin-action-btn admin-action-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_today</span>
                                <span>Th10 2023</span>
                            </button>
                            <button className="admin-action-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--color-navy)', color: 'white' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span>
                                <span>Xuất báo cáo</span>
                            </button>
                        </div>
                    </div>

                    {/* Under Development Modal */}
                    <UnderDevelopment featureName="tài chính" />

                    {/* KPI CARDS */}
                    <section className="admin-stats-grid">
                        <StatCard
                            icon={<span className="material-symbols-outlined">payments</span>}
                            value={loading ? '...' : formatCompactNumber(metrics?.monthlyrevenue || 0)}
                            label="Doanh thu nền tảng (30 ngày)"
                            badge={`+${metrics?.revenuegrowth || 0}%`}
                            badgeVariant="green"
                            className="admin-stat-card"
                        />
                        <StatCard
                            icon={<span className="material-symbols-outlined">lock_clock</span>}
                            value={loading ? '...' : formatCompactNumber(metrics?.escrowbalance || 0)}
                            label="Tiền đang giữ"
                            className="admin-stat-card"
                        />
                        <StatCard
                            icon={<span className="material-symbols-outlined">undo</span>}
                            value={loading ? '...' : formatCompactNumber(metrics?.totalrefunds || 0)}
                            label="Tổng hoàn tiền (30 ngày)"
                            badgeVariant="red"
                            className="admin-stat-card"
                        />
                        <StatCard
                            icon={<span className="material-symbols-outlined">priority_high</span>}
                            value={loading ? '...' : formatCompactNumber(metrics?.pendingwithdrawalamount || 0)}
                            label="Yêu cầu rút tiền"
                            badge={`${metrics?.pendingwithdrawals || 0} chờ xử lý`}
                            badgeVariant="orange"
                            className="admin-stat-card"
                        />
                    </section>

                    {/* MAIN TABLE SECTION */}
                    <section className="admin-financial-table-section">
                        {/* Tabs */}
                        <FilterTabs
                            tabs={[
                                { key: 'withdrawals', label: 'Yêu cầu rút tiền' },
                                { key: 'ledger', label: 'Sổ cái giao dịch' },
                                { key: 'commission', label: 'Cài đặt hoa hồng' },
                            ]}
                            activeKey={activeTab}
                            onChange={(key) => setActiveTab(key as typeof activeTab)}
                        />

                        {/* Tab Content */}
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
                                minWidth={800}
                            />
                        )}

                        {activeTab === 'ledger' && <TransactionLedger />}

                        {activeTab === 'commission' && (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                                    settings
                                </span>
                                <p>Cài đặt hoa hồng sẽ được triển khai trong Phase 3</p>
                            </div>
                        )}
                    </section>

                </div>
            </div>


            {/* Modals */}
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
