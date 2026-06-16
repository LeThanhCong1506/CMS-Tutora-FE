import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import type { Transaction } from '../../../types/admin.types';
import { formatCurrency, formatDateTime, formatTransactionType } from '../../../utils/formatters';
import { mockGetTransactions, mockExportTransactionsCSV } from '../mockData';

const ledgerPageSize = 50;

const getTransactionMeta = (type: string) => {
    switch (type) {
        case 'Deposit':
            return { icon: 'add_circle', tone: 'deposit' };
        case 'Escrow':
            return { icon: 'lock', tone: 'escrow' };
        case 'Release':
            return { icon: 'lock_open', tone: 'release' };
        case 'Refund':
            return { icon: 'undo', tone: 'refund' };
        case 'Withdrawal':
            return { icon: 'remove_circle', tone: 'withdrawal' };
        case 'Fee':
            return { icon: 'percent', tone: 'fee' };
        default:
            return { icon: 'sync_alt', tone: 'neutral' };
    }
};

const TransactionLedger = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [typeFilter, setTypeFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const fetchTransactions = useCallback(async () => {
        try {
            const offset = (page - 1) * ledgerPageSize;
            const { transactions: data, total: totalCount } = await mockGetTransactions(
                ledgerPageSize,
                offset,
                typeFilter === 'all' ? undefined : typeFilter,
                startDate || undefined,
                endDate || undefined
            );

            setTransactions(data);
            setTotal(totalCount);
        } catch (err) {
            console.error('Error fetching transactions:', err);
            toast.error('Không thể tải giao dịch');
        } finally {
            setLoading(false);
        }
    }, [endDate, page, startDate, typeFilter]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchTransactions();
    }, [fetchTransactions]);

    const handleExportCSV = async () => {
        try {
            setIsExporting(true);
            const csvContent = await mockExportTransactionsCSV(
                typeFilter === 'all' ? undefined : typeFilter,
                startDate || undefined,
                endDate || undefined
            );

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('Đã xuất dữ liệu thành công!');
        } catch (err) {
            console.error('Error exporting CSV:', err);
            toast.error('Không thể xuất CSV');
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

    const columns = useMemo<DataTableColumn<Transaction>[]>(
        () => [
            {
                key: 'id',
                title: 'Mã GD',
                render: (tx) => <span className="admin-ui-code-chip">{tx.transactionid}</span>,
                hideOnMobile: true,
            },
            {
                key: 'type',
                title: 'Loại',
                render: (tx) => {
                    const { icon, tone } = getTransactionMeta(tx.type);

                    return (
                        <span className={`financial-ledger-type ${tone}`}>
                            <span className="material-symbols-outlined" aria-hidden="true">
                                {icon}
                            </span>
                            {formatTransactionType(tx.type)}
                        </span>
                    );
                },
            },
            {
                key: 'user',
                title: 'Người dùng',
                render: (tx) => <span className="financial-ledger-user">{tx.username}</span>,
            },
            {
                key: 'description',
                title: 'Mô tả',
                render: (tx) => <span className="financial-ledger-description">{tx.description}</span>,
                minWidth: 220,
            },
            {
                key: 'amount',
                title: 'Số tiền',
                align: 'right',
                render: (tx) => {
                    const { tone } = getTransactionMeta(tx.type);
                    return <span className={`financial-ledger-amount ${tone}`}>{formatCurrency(tx.amount)}</span>;
                },
            },
            {
                key: 'date',
                title: 'Ngày',
                render: (tx) => <span className="admin-ui-table-meta">{formatDateTime(tx.createdat)}</span>,
                hideOnMobile: true,
            },
            {
                key: 'status',
                title: 'Trạng thái',
                align: 'center',
                render: (tx) => (
                    <span className={`financial-status-pill ${tx.status === 'completed' ? 'completed' : 'pending'}`}>
                        {tx.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                    </span>
                ),
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

                <button
                    className="admin-ui-button admin-ui-button-primary"
                    onClick={handleExportCSV}
                    disabled={isExporting || transactions.length === 0}
                >
                    <span className="material-symbols-outlined" aria-hidden="true">download</span>
                    {isExporting ? 'Đang xuất...' : 'Xuất CSV'}
                </button>
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
                        <option value="Deposit">Nạp tiền</option>
                        <option value="Escrow">Giữ tiền</option>
                        <option value="Release">Giải phóng</option>
                        <option value="Refund">Hoàn tiền</option>
                        <option value="Withdrawal">Rút tiền</option>
                        <option value="Fee">Phí</option>
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
                rowKey="transactionid"
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
            />
        </div>
    );
};

export default TransactionLedger;
