import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getTransferHistory, getFundBalance, getFundTopupHistory } from '../../../services/adminPayout.service';
import type { AdminWalletTransferResult, SystemFund, SystemFundTopupResult } from '../../../types/adminPayout.types';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { Can } from '../../../contexts/AccessContext';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import PayoutSummaryPanel, { PayoutSummaryFact } from '../PayoutSummaryPanel';
import ProofImageModal from '../ProofImageModal';
import TransferMoneyModal from './TransferMoneyModal';
import TopUpFundModal from './TopUpFundModal';
import '../../../styles/pages/admin-payout.css';

const ROLE_LABEL: Record<string, string> = {
    tutor: 'Gia sư',
    parent: 'Phụ huynh',
    student: 'Học sinh',
    Tutor: 'Gia sư',
    Parent: 'Phụ huynh',
    Student: 'Học sinh',
};

const TransferHistoryPage: React.FC = () => {
    const [transfers, setTransfers] = useState<AdminWalletTransferResult[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [showTransferModal, setShowTransferModal] = useState(false);

    const [fund, setFund] = useState<SystemFund | null>(null);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [proofPreview, setProofPreview] = useState<SystemFundTopupResult | null>(null);

    const [topups, setTopups] = useState<SystemFundTopupResult[]>([]);
    const [topupTotalCount, setTopupTotalCount] = useState(0);
    const [topupLoading, setTopupLoading] = useState(true);
    const [topupPage, setTopupPage] = useState(1);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getTransferHistory(currentPage, ADMIN_PAGE_SIZE);
            setTransfers(result.items);
            setTotalCount(result.totalCount);
        } catch {
            toast.error('Không thể tải lịch sử chuyển tiền.');
        } finally {
            setLoading(false);
        }
    }, [currentPage]);

    const fetchFund = useCallback(async () => {
        try {
            setFund(await getFundBalance());
        } catch {
            toast.error('Không thể tải số dư quỹ hệ thống.');
        }
    }, []);

    const fetchTopups = useCallback(async () => {
        try {
            setTopupLoading(true);
            const result = await getFundTopupHistory(topupPage, ADMIN_PAGE_SIZE);
            setTopups(result.items);
            setTopupTotalCount(result.totalCount);
        } catch {
            toast.error('Không thể tải lịch sử nạp quỹ.');
        } finally {
            setTopupLoading(false);
        }
    }, [topupPage]);

    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        void fetchFund();
    }, [fetchFund]);

    useEffect(() => {
        void fetchTopups();
    }, [fetchTopups]);

    const handleTransferSuccess = () => {
        setCurrentPage(1);
        void fetchHistory();
        void fetchFund();
    };

    const handleTopUpSuccess = () => {
        setTopupPage(1);
        void fetchTopups();
        void fetchFund();
    };

    const columns = useMemo<DataTableColumn<AdminWalletTransferResult>[]>(() => [
        {
            key: 'recipient',
            title: 'Người nhận',
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{record.recipientName || record.recipientUserId}</span>
                    {record.recipientRole && (
                        <span className="admin-ui-entity-secondary">
                            {ROLE_LABEL[record.recipientRole] || record.recipientRole}
                        </span>
                    )}
                </div>
            ),
            minWidth: 180,
        },
        {
            key: 'amount',
            title: 'Số tiền',
            render: (record) => <strong className="admin-ui-amount">{formatCurrency(record.amount)}</strong>,
            minWidth: 130,
        },
        {
            key: 'reason',
            title: 'Lý do',
            render: (record) => <span className="admin-ui-table-meta">{record.reason}</span>,
            minWidth: 280,
        },
        {
            key: 'createdBy',
            title: 'Người thực hiện',
            render: (record) => (
                <span className="admin-ui-entity-secondary">{record.createdByName || record.createdBy}</span>
            ),
            hideOnMobile: true,
            minWidth: 160,
        },
        {
            key: 'createdAt',
            title: 'Thời gian',
            render: (record) => <span className="admin-ui-table-meta">{formatDateTime(record.createdAt)}</span>,
            hideOnMobile: true,
            minWidth: 160,
        },
    ], []);

    const topupColumns = useMemo<DataTableColumn<SystemFundTopupResult>[]>(() => [
        {
            key: 'amount',
            title: 'Số tiền',
            render: (record) => <strong className="admin-ui-amount">{formatCurrency(record.amount)}</strong>,
            minWidth: 130,
        },
        {
            key: 'reason',
            title: 'Lý do',
            render: (record) => <span className="admin-ui-table-meta">{record.reason}</span>,
            minWidth: 280,
        },
        {
            key: 'createdBy',
            title: 'Người nạp',
            render: (record) => (
                <span className="admin-ui-entity-secondary">{record.createdByName || record.createdBy}</span>
            ),
            hideOnMobile: true,
            minWidth: 160,
        },
        {
            key: 'createdAt',
            title: 'Thời gian',
            render: (record) => <span className="admin-ui-table-meta">{formatDateTime(record.createdAt)}</span>,
            hideOnMobile: true,
            minWidth: 160,
        },
        {
            key: 'proof',
            title: 'Chứng minh',
            align: 'right',
            render: (record) =>
                record.proofImageUrl ? (
                    <button
                        type="button"
                        className="payout-row-action"
                        onClick={() => setProofPreview(record)}
                        aria-label={`Xem ảnh chứng minh khoản nạp #${record.topupId}`}
                    >
                        <span className="payout-row-action__label">Xem ảnh</span>
                        <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
                    </button>
                ) : (
                    <span className="admin-ui-table-meta">—</span>
                ),
            minWidth: 120,
        },
    ], []);

    return (
        <PageContainer
            className="payout-transfers-page"
            eyebrow="Tài chính"
            title="Chuyển tiền chủ động"
            maxWidth="wide"
            headerAction={
                <div className="admin-ui-actions">
                    <Can permission="payout.fund_topup">
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-secondary"
                            onClick={() => setShowTopUpModal(true)}
                        >
                            <span className="material-symbols-outlined">savings</span>
                            Nạp quỹ
                        </button>
                    </Can>
                    <Can permission="payout.transfer">
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-primary"
                            onClick={() => setShowTransferModal(true)}
                        >
                            <span className="material-symbols-outlined">send_money</span>
                            Chuyển tiền mới
                        </button>
                    </Can>
                </div>
            }
        >
            <PayoutSummaryPanel
                ariaLabel="Quỹ hệ thống"
                label="Số dư quỹ hệ thống"
                amount={fund ? formatCurrency(fund.balance) : '...'}
                hint="Nguồn duy nhất cho chuyển tiền chủ động"
            >
                <PayoutSummaryFact icon="send_money" label="Lượt chuyển">
                    <strong>{totalCount.toLocaleString('vi-VN')}</strong>
                </PayoutSummaryFact>
                <PayoutSummaryFact icon="savings" label="Lượt nạp quỹ">
                    <strong>{topupTotalCount.toLocaleString('vi-VN')}</strong>
                </PayoutSummaryFact>
                <PayoutSummaryFact icon="schedule" label="Cập nhật lúc">
                    <strong>{fund ? formatDateTime(fund.updatedAt) : '—'}</strong>
                </PayoutSummaryFact>
            </PayoutSummaryPanel>

            <SectionCard
                className="payout-requests-card"
                title="Lịch sử chuyển tiền"
                headerAction={
                    <StatusBadge variant={totalCount > 0 ? 'info' : 'neutral'} shape="tag">
                        {totalCount.toLocaleString('vi-VN')} lượt chuyển
                    </StatusBadge>
                }
            >
                <DataTable<AdminWalletTransferResult>
                    columns={columns}
                    data={transfers}
                    rowKey="transferId"
                    loading={loading}
                    loadingText="Đang tải lịch sử chuyển tiền..."
                    emptyText="Chưa có lượt chuyển tiền chủ động nào"
                    emptyIcon={
                        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                            send_money
                        </span>
                    }
                    tableLabel="Lịch sử chuyển tiền chủ động"
                    pagination={{
                        current: currentPage,
                        pageSize: ADMIN_PAGE_SIZE,
                        total: totalCount,
                        onChange: setCurrentPage,
                    }}
                    minWidth={1000}
                    variant="embedded"
                    density="compact"
                    adaptive
                />
            </SectionCard>

            <SectionCard
                className="payout-requests-card"
                title="Lịch sử nạp quỹ"
                headerAction={
                    <StatusBadge variant={topupTotalCount > 0 ? 'info' : 'neutral'} shape="tag">
                        {topupTotalCount.toLocaleString('vi-VN')} lượt nạp
                    </StatusBadge>
                }
            >
                <DataTable<SystemFundTopupResult>
                    columns={topupColumns}
                    data={topups}
                    rowKey="topupId"
                    loading={topupLoading}
                    loadingText="Đang tải lịch sử nạp quỹ..."
                    emptyText="Chưa có lượt nạp quỹ nào"
                    emptyIcon={
                        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                            savings
                        </span>
                    }
                    tableLabel="Lịch sử nạp quỹ hệ thống"
                    pagination={{
                        current: topupPage,
                        pageSize: ADMIN_PAGE_SIZE,
                        total: topupTotalCount,
                        onChange: setTopupPage,
                    }}
                    minWidth={1000}
                    variant="embedded"
                    density="compact"
                    adaptive
                />
            </SectionCard>

            <TransferMoneyModal
                isOpen={showTransferModal}
                onClose={() => setShowTransferModal(false)}
                onSuccess={handleTransferSuccess}
            />

            <ProofImageModal
                imageUrl={proofPreview?.proofImageUrl ?? null}
                title={`Ảnh chứng minh khoản nạp #${proofPreview?.topupId ?? ''}`}
                alt={`Ảnh chứng minh khoản nạp quỹ #${proofPreview?.topupId ?? ''}`}
                onClose={() => setProofPreview(null)}
            />

            <TopUpFundModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
                onSuccess={handleTopUpSuccess}
            />
        </PageContainer>
    );
};

export default TransferHistoryPage;
