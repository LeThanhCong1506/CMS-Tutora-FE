import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getTransferHistory, getFundBalance } from '../../../services/adminPayout.service';
import type { AdminWalletTransferResult, SystemFund } from '../../../types/adminPayout.types';
import { DataTable, PageContainer, SectionCard } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { Can } from '../../../contexts/AccessContext';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import TransferMoneyModal from './TransferMoneyModal';
import TopUpFundModal from './TopUpFundModal';

const PAGE_SIZE = 20;

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

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            const result = await getTransferHistory(currentPage, PAGE_SIZE);
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

    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        void fetchFund();
    }, [fetchFund]);

    const handleTransferSuccess = () => {
        setCurrentPage(1);
        void fetchHistory();
        void fetchFund();
    };

    const handleTopUpSuccess = () => {
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

    return (
        <PageContainer
            eyebrow="Tài chính"
            title="Chuyển tiền chủ động"
            subtitle="Cộng thẳng tiền vào ví một gia sư, phụ huynh hoặc học sinh — không gắn với yêu cầu rút tiền nào. Tiền vào ví ngay khi xác nhận, không có bước duyệt thứ hai."
            maxWidth="wide"
            headerAction={
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
            <SectionCard
                title="Quỹ hệ thống"
                subtitle="Nguồn duy nhất mà chuyển tiền chủ động được phép trừ vào — hết quỹ thì bị chặn."
                padded
            >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <strong style={{ fontSize: 28 }} className="admin-ui-amount">
                        {fund ? formatCurrency(fund.balance) : '—'}
                    </strong>
                    {fund && (
                        <span className="admin-ui-table-meta">
                            cập nhật lúc {formatDateTime(fund.updatedAt)}
                        </span>
                    )}
                </div>
            </SectionCard>

            <SectionCard
                title="Lịch sử chuyển tiền"
                subtitle="Mới nhất trước."
                footer={`Hiển thị ${transfers.length} / ${totalCount.toLocaleString('vi-VN')} lượt chuyển`}
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
                        pageSize: PAGE_SIZE,
                        total: totalCount,
                        onChange: setCurrentPage,
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

            <TopUpFundModal
                isOpen={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
                onSuccess={handleTopUpSuccess}
            />
        </PageContainer>
    );
};

export default TransferHistoryPage;
