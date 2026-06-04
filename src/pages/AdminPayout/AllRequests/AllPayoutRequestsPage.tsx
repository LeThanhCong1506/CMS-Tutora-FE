import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAllPayoutRequests } from '../../../services/adminPayout.service';
import type { WithdrawalRequestItem } from '../../../types/adminPayout.types';
import { PageContainer, SectionCard } from '../../../components/shared';
import WithdrawalRequestTable from '../PayoutOverview/components/WithdrawalRequestTable';
import '../../../styles/pages/admin-payout.css';

type PayoutRequestFilters = {
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
    from?: string;
    to?: string;
};

const toIsoDateBoundary = (date: string, boundary: 'start' | 'end') => {
    if (!date) return undefined;
    const suffix = boundary === 'start' ? 'T00:00:00' : 'T23:59:59';
    return new Date(`${date}${suffix}`).toISOString();
};

const AllPayoutRequestsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<WithdrawalRequestItem[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string | undefined>(undefined);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const navigate = useNavigate();

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const params: PayoutRequestFilters = {
                page: currentPage,
                pageSize,
                ...(status && { status }),
                ...(search && { search }),
                ...(fromDate && { from: toIsoDateBoundary(fromDate, 'start') }),
                ...(toDate && { to: toIsoDateBoundary(toDate, 'end') }),
            };
            const response = await getAllPayoutRequests(params);

            setData(response.items);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch payout requests:', error);
            toast.error('Không thể tải danh sách yêu cầu');
        } finally {
            setLoading(false);
        }
    }, [currentPage, fromDate, pageSize, search, status, toDate]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchRequests();
    }, [fetchRequests]);

    const commitSearch = () => {
        setSearch(searchInput.trim());
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setSearchInput('');
        setSearch('');
        setStatus(undefined);
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    return (
        <PageContainer
            eyebrow="Thanh toán"
            title="Lịch sử rút tiền"
            subtitle="Tra cứu toàn bộ các giao dịch rút tiền trong hệ thống."
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
                title="Bộ lọc"
                subtitle="Lọc theo từ khóa, trạng thái và khoảng thời gian yêu cầu."
            >
                <div className="admin-ui-toolbar payout-history-toolbar">
                    <div className="payout-history-filter-grid">
                        <label className="payout-filter-field">
                            <span>Tìm kiếm</span>
                            <div className="payout-search-control">
                                <span className="material-symbols-outlined">search</span>
                                <input
                                    type="search"
                                    value={searchInput}
                                    placeholder="Mã yêu cầu, tên gia sư, email..."
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            commitSearch();
                                        }
                                    }}
                                />
                            </div>
                        </label>
                        <label className="payout-filter-field">
                            <span>Trạng thái</span>
                            <select
                                value={status ?? 'all'}
                                onChange={(event) => {
                                    setStatus(event.target.value === 'all' ? undefined : event.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="pending">Chờ xử lý</option>
                                <option value="pending_review">Chờ xét duyệt</option>
                                <option value="approved">Đã phê duyệt</option>
                                <option value="completed">Hoàn thành</option>
                                <option value="rejected">Đã từ chối</option>
                                <option value="cancelled">Đã hủy</option>
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
                    <div className="admin-ui-actions">
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-primary"
                            onClick={commitSearch}
                        >
                            Áp dụng
                        </button>
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-secondary"
                            onClick={resetFilters}
                        >
                            Xóa lọc
                        </button>
                    </div>
                </div>
            </SectionCard>

            <SectionCard
                title="Danh sách yêu cầu"
                subtitle="Mở từng yêu cầu để xem chi tiết rủi ro, ví và tài khoản nhận tiền."
                footer={`Hiển thị ${data.length} / ${total.toLocaleString('vi-VN')} yêu cầu`}
            >
                <WithdrawalRequestTable
                    data={data}
                    loading={loading}
                    total={total}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    }}
                />
            </SectionCard>
        </PageContainer>
    );
};

export default AllPayoutRequestsPage;
