import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getFraudLogs } from '../../../services/adminPayout.service';
import type { FraudLogItem } from '../../../types/adminPayout.types';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { formatDateTime } from '../../../utils/formatters';
import '../../../styles/pages/admin-payout.css';

type FraudLogFilters = {
    page: number;
    pageSize: number;
    tutorId?: string;
    ruleName?: string;
    passed?: boolean;
    from?: string;
    to?: string;
};

const toIsoDateBoundary = (date: string, boundary: 'start' | 'end') => {
    if (!date) return undefined;
    const suffix = boundary === 'start' ? 'T00:00:00' : 'T23:59:59';
    return new Date(`${date}${suffix}`).toISOString();
};

const FraudLogsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<FraudLogItem[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(20);
    const [tutorId, setTutorId] = useState('');
    const [ruleName, setRuleName] = useState('');
    const [passed, setPassed] = useState<boolean | undefined>(undefined);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const navigate = useNavigate();

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: FraudLogFilters = {
                page: currentPage,
                pageSize,
                ...(tutorId.trim() && { tutorId: tutorId.trim() }),
                ...(ruleName && { ruleName }),
                ...(passed !== undefined && { passed }),
                ...(fromDate && { from: toIsoDateBoundary(fromDate, 'start') }),
                ...(toDate && { to: toIsoDateBoundary(toDate, 'end') }),
            };
            const response = await getFraudLogs(params);
            setLogs(response.items);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch fraud logs:', error);
            toast.error('Không thể tải nhật ký an toàn');
        } finally {
            setLoading(false);
        }
    }, [currentPage, fromDate, pageSize, passed, ruleName, toDate, tutorId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchLogs();
    }, [fetchLogs]);

    const resetFilters = () => {
        setTutorId('');
        setRuleName('');
        setPassed(undefined);
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    const columns: DataTableColumn<FraudLogItem>[] = [
        {
            key: 'checkedAt',
            title: 'Thời gian',
            render: (record) => (
                <span className="admin-ui-table-meta">{formatDateTime(record.checkedAt)}</span>
            ),
            minWidth: 160,
        },
        {
            key: 'tutor',
            title: 'Gia sư',
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{record.tutorName || 'Chưa có tên'}</span>
                    <span className="admin-ui-entity-secondary">ID: {record.tutorId}</span>
                </div>
            ),
            minWidth: 220,
        },
        {
            key: 'ruleName',
            title: 'Quy tắc an toàn',
            render: (record) => <span className="admin-ui-code-chip">{record.ruleName}</span>,
            minWidth: 180,
        },
        {
            key: 'passed',
            title: 'Kết quả',
            render: (record) => (
                <StatusBadge variant={record.passed ? 'success' : 'error'} shape="tag">
                    {record.passed ? 'Hợp lệ' : 'Cảnh báo'}
                </StatusBadge>
            ),
            minWidth: 120,
        },
        {
            key: 'message',
            title: 'Thông điệp hệ thống',
            render: (record) => (
                <span className={record.message?.toLowerCase().includes('rủi ro') ? 'payout-risk-message' : 'admin-ui-table-meta'}>
                    {record.message || '---'}
                </span>
            ),
            minWidth: 260,
        },
        {
            key: 'withdrawalRequestId',
            title: 'Yêu cầu liên quan',
            render: (record) => (
                record.withdrawalRequestId ? (
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary payout-action-button"
                        onClick={() => navigate(`/admin-portal/payouts/${record.withdrawalRequestId}`)}
                    >
                        #{record.withdrawalRequestId}
                    </button>
                ) : (
                    <span className="admin-ui-table-meta">---</span>
                )
            ),
            align: 'right',
            minWidth: 150,
        },
    ];

    return (
        <PageContainer
            eyebrow="Thanh toán"
            title="Nhật ký an toàn & chống rủi ro"
            subtitle="Ghi lại toàn bộ lịch sử kiểm soát rủi ro từ hệ thống chống gian lận."
            maxWidth="wide"
            headerAction={
                <button
                    type="button"
                    className="admin-ui-button admin-ui-button-secondary"
                    onClick={() => navigate('/admin-portal/payouts')}
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                    Tổng quan
                </button>
            }
        >
            <SectionCard
                title="Bộ lọc nhật ký"
                subtitle="Lọc theo gia sư, quy tắc, kết quả và khoảng thời gian kiểm tra."
            >
                <div className="admin-ui-toolbar payout-history-toolbar">
                    <div className="payout-history-filter-grid payout-fraud-filter-grid">
                        <label className="payout-filter-field">
                            <span>Tutor ID</span>
                            <input
                                type="search"
                                value={tutorId}
                                placeholder="Nhập Tutor ID..."
                                onChange={(event) => {
                                    setTutorId(event.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </label>
                        <label className="payout-filter-field">
                            <span>Quy tắc</span>
                            <select
                                value={ruleName}
                                onChange={(event) => {
                                    setRuleName(event.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="">Tất cả quy tắc</option>
                                <option value="WITHDRAW_SPEED">Tốc độ rút tiền</option>
                                <option value="BANK_ACCOUNT_MATCH">Chủ tài khoản ngân hàng</option>
                                <option value="IP_CONSISTENCY">Địa chỉ IP</option>
                                <option value="EMAIL_VERIFIED">Email xác thực</option>
                            </select>
                        </label>
                        <label className="payout-filter-field">
                            <span>Kết quả</span>
                            <select
                                value={passed === undefined ? 'all' : String(passed)}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setPassed(value === 'all' ? undefined : value === 'true');
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="all">Tất cả</option>
                                <option value="true">Hợp lệ</option>
                                <option value="false">Cảnh báo</option>
                            </select>
                        </label>
                        <label className="payout-filter-field">
                            <span>Từ ngày</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(event) => {
                                    setFromDate(event.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </label>
                        <label className="payout-filter-field">
                            <span>Đến ngày</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(event) => {
                                    setToDate(event.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </label>
                    </div>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={resetFilters}
                    >
                        Xóa lọc
                    </button>
                </div>
            </SectionCard>

            <SectionCard
                title="Nhật ký kiểm soát"
                subtitle="Các rule được ghi lại theo thời gian để phục vụ đối soát và audit."
                footer={`Hiển thị ${logs.length} / ${total.toLocaleString('vi-VN')} nhật ký`}
            >
                <DataTable<FraudLogItem>
                    columns={columns}
                    data={logs}
                    rowKey="logId"
                    loading={loading}
                    loadingText="Đang tải nhật ký an toàn..."
                    emptyText="Không có nhật ký phù hợp"
                    emptyIcon={
                        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                            security
                        </span>
                    }
                    pagination={{
                        current: currentPage,
                        pageSize,
                        total,
                        onChange: setCurrentPage,
                    }}
                    minWidth={1120}
                    variant="embedded"
                />
            </SectionCard>
        </PageContainer>
    );
};

export default FraudLogsPage;
