import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type { Transaction } from '../../../types/admin.types';
import { formatCurrency, formatDateTime, formatTransactionType } from '../../../utils/formatters';
import { mockGetTransactions, mockExportTransactionsCSV } from '../mockData';

const TransactionLedger = () => {
    // State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);

    // Filters
    const [typeFilter, setTypeFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Exporting
    const [isExporting, setIsExporting] = useState(false);

    // Fetch transactions
    useEffect(() => {
        fetchTransactions();
    }, [page, typeFilter, startDate, endDate]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * limit;
            const { transactions: data, total: totalCount } = await mockGetTransactions(
                limit,
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
    };

    const handleExportCSV = async () => {
        try {
            setIsExporting(true);
            const csvContent = await mockExportTransactionsCSV(
                typeFilter === 'all' ? undefined : typeFilter,
                startDate || undefined,
                endDate || undefined
            );

            // Create download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Đã xuất dữ liệu thành công!');
        } catch (err) {
            console.error('Error exporting CSV:', err);
            toast.error('Không thể xuất CSV');
        } finally {
            setIsExporting(false);
        }
    };

    const handleResetFilters = () => {
        setTypeFilter('all');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const totalPages = Math.ceil(total / limit);

    // Get transaction type icon and color
    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'Deposit':
                return { icon: 'add_circle', color: '#166534' };
            case 'Escrow':
                return { icon: 'lock', color: '#ea580c' };
            case 'Release':
                return { icon: 'lock_open', color: '#15803d' };
            case 'Refund':
                return { icon: 'undo', color: '#2563eb' };
            case 'Withdrawal':
                return { icon: 'remove_circle', color: '#991b1b' };
            case 'Fee':
                return { icon: 'percent', color: 'var(--color-gold)' };
            default:
                return { icon: 'sync_alt', color: '#64748b' };
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: 'var(--color-navy)' }}>
                        📒 Sổ cái giao dịch
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                        Tổng: {total.toLocaleString()} giao dịch
                    </p>
                </div>

                <button
                    className="vetting-btn vetting-btn-primary"
                    onClick={handleExportCSV}
                    disabled={isExporting || transactions.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        download
                    </span>
                    {isExporting ? 'Đang xuất...' : 'Xuất CSV'}
                </button>
            </div>

            {/* Filters */}
            <div
                style={{
                    background: '#f8fafc',
                    padding: '20px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    border: '1px solid #e2e8f0',
                }}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {/* Type Filter */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                            Loại giao dịch
                        </label>
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                background: '#ffffff',
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
                    </div>

                    {/* Start Date */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                            Từ ngày
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setPage(1);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                            }}
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
                            Đến ngày
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setPage(1);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                            }}
                        />
                    </div>

                    {/* Reset Button */}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                            onClick={handleResetFilters}
                            className="vetting-btn vetting-btn-secondary"
                            style={{ width: '100%' }}
                        >
                            Đặt lại
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                    <p>Đang tải giao dịch...</p>
                </div>
            ) : transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                        receipt_long
                    </span>
                    <p>Không có giao dịch nào</p>
                </div>
            ) : (
                <>
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                        Mã GD
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                        Loại
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                        Người dùng
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                        Mô tả
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                        Số tiền
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                        Ngày
                                    </th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                        Trạng thái
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => {
                                    const { icon, color } = getTransactionIcon(tx.type);

                                    return (
                                        <tr key={tx.transactionid} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-navy)' }}>
                                                {tx.transactionid}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color }}>
                                                        {icon}
                                                    </span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color }}>
                                                        {formatTransactionType(tx.type)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                                                {tx.username}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>
                                                {tx.description}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 700, color: color }}>
                                                {formatCurrency(tx.amount)}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b' }}>
                                                {formatDateTime(tx.createdat)}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span
                                                    style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        background: tx.status === 'completed' ? '#dcfce7' : '#fef3c7',
                                                        color: tx.status === 'completed' ? '#166534' : '#92400e',
                                                    }}
                                                >
                                                    {tx.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                            Hiển thị {(page - 1) * limit + 1}-{Math.min(page * limit, total)} trong {total} giao dịch
                        </p>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="vetting-btn vetting-btn-secondary"
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                style={{ opacity: page === 1 ? 0.5 : 1 }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                    chevron_left
                                </span>
                                Trước
                            </button>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px' }}>
                                <span style={{ fontSize: '14px', color: '#64748b' }}>
                                    Trang {page} / {totalPages}
                                </span>
                            </div>

                            <button
                                className="vetting-btn vetting-btn-secondary"
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                                style={{ opacity: page === totalPages ? 0.5 : 1 }}
                            >
                                Tiếp
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                    chevron_right
                                </span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TransactionLedger;
