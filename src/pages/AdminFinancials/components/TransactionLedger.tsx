import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { Can } from '../../../contexts/AccessContext';
import type { AdminTransactionItem } from '../../../types/admin.types';
import { getTransactions } from '../../../services/admin.service';
import { formatCurrency, formatDateTime, formatTransactionType } from '../../../utils/formatters';
// TEMP: mock fallback for local UI preview while the backend is offline — see src/mocks/financialsMockFallback.ts
import { mockLedgerTransactions } from '../../../mocks/financialsMockFallback';
import { apiErrorMessage } from '../../../utils/apiError';

const ledgerPageSize = ADMIN_PAGE_SIZE;

// Tutora-Backend/MV.DomainLayer/Constants/TransactionType.cs — the only valid values.
const TRANSACTION_TYPE_OPTIONS = [
    { value: 'Deposit', label: 'Nạp tiền' },
    { value: 'Payment', label: 'Thanh toán' },
    { value: 'EscrowCredit', label: 'Giữ tiền (escrow)' },
    { value: 'EscrowRelease', label: 'Giải phóng cho gia sư' },
    { value: 'EscrowReversal', label: 'Hoàn escrow' },
    { value: 'Withdrawal', label: 'Rút tiền' },
    { value: 'Refund', label: 'Hoàn tiền' },
    { value: 'DepositPayment', label: 'Thanh toán đặt cọc' },
    { value: 'RemainingPayment', label: 'Thanh toán còn lại' },
    { value: 'BankVerification', label: 'Xác thực ngân hàng' },
];

const getTransactionMeta = (type: string | null) => {
    switch (type) {
        case 'Deposit':
        case 'DepositPayment':
        case 'RemainingPayment':
        case 'Payment':
            return { icon: 'add_circle', tone: 'deposit' };
        case 'EscrowCredit':
            return { icon: 'lock', tone: 'escrow' };
        case 'EscrowRelease':
            return { icon: 'lock_open', tone: 'release' };
        case 'EscrowReversal':
        case 'Refund':
            return { icon: 'undo', tone: 'refund' };
        case 'Withdrawal':
            return { icon: 'remove_circle', tone: 'withdrawal' };
        default:
            return { icon: 'sync_alt', tone: 'neutral' };
    }
};

const toCsvValue = (value: string | number | null): string => {
    const str = value === null ? '' : String(value);
    return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
};

const TransactionLedger = () => {
    const [transactions, setTransactions] = useState<AdminTransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [typeFilter, setTypeFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const fetchTransactions = useCallback(async () => {
        try {
            const res = await getTransactions({
                page,
                pageSize: ledgerPageSize,
                type: typeFilter === 'all' ? undefined : typeFilter,
                from: startDate || undefined,
                to: endDate || undefined,
            });

            setTransactions(res.items);
            setTotal(res.totalCount);
        } catch (err) {
            console.error('Error fetching transactions:', err);
            // TEMP: mock fallback for local UI preview — remove once backend is reachable.
            setTransactions(mockLedgerTransactions);
            toast.error(
                `${apiErrorMessage(err, 'Không tải được sổ giao dịch.')} Bảng đang hiển thị là dữ liệu mẫu, không phải số thật.`,
            );
            setTotal(mockLedgerTransactions.length);
        } finally {
            setLoading(false);
        }
    }, [endDate, page, startDate, typeFilter]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchTransactions();
    }, [fetchTransactions]);

    const handleExportCSV = () => {
        try {
            setIsExporting(true);
            const header = ['Mã GD', 'Loại', 'Người dùng', 'Mô tả', 'Số tiền', 'Ngày'];
            const rows = transactions.map((tx) => [
                toCsvValue(tx.transactionId),
                toCsvValue(formatTransactionType(tx.transactionType ?? '')),
                toCsvValue(tx.userFullName),
                toCsvValue(tx.description),
                toCsvValue(tx.amount),
                toCsvValue(tx.createdAt ? formatDateTime(tx.createdAt) : null),
            ]);
            // BOM để Excel đọc đúng tiếng Việt.
            const csvContent = '﻿' + [header, ...rows].map((row) => row.join(',')).join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `transactions_page${page}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Đã xuất dữ liệu trang hiện tại thành công!');
        } catch (err) {
            console.error('Error exporting CSV:', err);
            toast.error(apiErrorMessage(err, 'Không thể xuất CSV'));
        } finally {
            setIsExporting(false);
        }
    };

    const handleResetFilters = () => {
        setLoading(true);
        setTypeFilter('all');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const columns = useMemo<DataTableColumn<AdminTransactionItem>[]>(
        () => [
            {
                key: 'id',
                title: 'Mã GD',
                render: (tx) => <span className="admin-ui-code-chip">{tx.transactionId}</span>,
                hideOnMobile: true,
            },
            {
                key: 'type',
                title: 'Loại',
                render: (tx) => {
                    const { icon, tone } = getTransactionMeta(tx.transactionType);

                    return (
                        <span className={`financial-ledger-type ${tone}`}>
                            <span className="material-symbols-outlined" aria-hidden="true">
                                {icon}
                            </span>
                            {formatTransactionType(tx.transactionType ?? '')}
                        </span>
                    );
                },
            },
            {
                key: 'user',
                title: 'Người dùng',
                render: (tx) => <span className="financial-ledger-user">{tx.userFullName ?? '—'}</span>,
            },
            {
                key: 'description',
                title: 'Mô tả',
                render: (tx) => <span className="financial-ledger-description">{tx.description ?? '—'}</span>,
                minWidth: 220,
            },
            {
                key: 'amount',
                title: 'Số tiền',
                align: 'right',
                render: (tx) => {
                    const { tone } = getTransactionMeta(tx.transactionType);
                    return <span className={`financial-ledger-amount ${tone}`}>{formatCurrency(tx.amount ?? 0)}</span>;
                },
            },
            {
                key: 'date',
                title: 'Ngày',
                render: (tx) => <span className="admin-ui-table-meta">{tx.createdAt ? formatDateTime(tx.createdAt) : '—'}</span>,
                hideOnMobile: true,
            },
        ],
        []
    );

    return (
        <div className="financial-ledger">
            <header className="financial-ledger-header">
                <div>
                    <h3>
                        <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
                        Sổ cái giao dịch
                    </h3>
                    <p>Tổng: {total.toLocaleString('vi-VN')} giao dịch</p>
                </div>

                <Can permission="export.data">
                <button
                    className="admin-ui-button admin-ui-button-primary"
                    onClick={handleExportCSV}
                    disabled={isExporting || transactions.length === 0}
                    title="Chỉ xuất các giao dịch đang hiển thị ở trang này"
                >
                    <span className="material-symbols-outlined" aria-hidden="true">download</span>
                    {isExporting ? 'Đang xuất...' : 'Xuất CSV (trang hiện tại)'}
                </button>
                </Can>
            </header>

            <div className="financial-ledger-filters">
                <label className="financial-filter-field" htmlFor="financial-transaction-type">
                    <span>Loại giao dịch</span>
                    <select
                        id="financial-transaction-type"
                        value={typeFilter}
                        onChange={(event) => {
                            setLoading(true);
                            setTypeFilter(event.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="all">Tất cả</option>
                        {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="financial-filter-field" htmlFor="financial-start-date">
                    <span>Từ ngày</span>
                    <input
                        id="financial-start-date"
                        type="date"
                        value={startDate}
                        onChange={(event) => {
                            setLoading(true);
                            setStartDate(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>

                <label className="financial-filter-field" htmlFor="financial-end-date">
                    <span>Đến ngày</span>
                    <input
                        id="financial-end-date"
                        type="date"
                        value={endDate}
                        onChange={(event) => {
                            setLoading(true);
                            setEndDate(event.target.value);
                            setPage(1);
                        }}
                    />
                </label>

                <button
                    type="button"
                    className="admin-ui-button admin-ui-button-secondary financial-reset-button"
                    onClick={handleResetFilters}
                >
                    Đặt lại
                </button>
            </div>

            <DataTable
                columns={columns}
                data={transactions}
                rowKey="transactionId"
                loading={loading}
                loadingText="Đang tải giao dịch..."
                emptyText="Không có giao dịch nào"
                emptyIcon={<span className="material-symbols-outlined financial-empty-icon">receipt_long</span>}
                pagination={{
                    current: page,
                    pageSize: ledgerPageSize,
                    total,
                    onChange: (nextPage) => {
                        setLoading(true);
                        setPage(nextPage);
                    },
                }}
                minWidth={940}
                variant="embedded"
                density="compact"
                adaptive
            />
        </div>
    );
};

export default TransactionLedger;
