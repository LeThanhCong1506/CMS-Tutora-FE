import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getPayoutOverview, getWithdrawalRequests } from '../../../services/adminPayout.service';
import type { PayoutOverview, WithdrawalRequestItem } from '../../../types/adminPayout.types';
import { FilterTabs, PageContainer, SectionCard } from '../../../components/shared';
import PayoutStatsCards from './components/PayoutStatsCards';
import WithdrawalRequestTable from './components/WithdrawalRequestTable';
import '../../../styles/pages/admin-payout.css';

const payoutTabs = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Chờ xử lý' },
    { key: 'pending_review', label: 'Chờ xét duyệt' },
    { key: 'delayed', label: 'Đang tạm giữ' },
    { key: 'approved', label: 'Đã phê duyệt' },
    { key: 'rejected', label: 'Đã từ chối' },
    { key: 'cancelled', label: 'Đã hủy' },
];

const PayoutOverviewPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<PayoutOverview | null>(null);
    const [requests, setRequests] = useState<WithdrawalRequestItem[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [activeTab, setActiveTab] = useState('all');
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [overviewRes, reqResponse] = await Promise.all([
                getPayoutOverview(),
                getWithdrawalRequests(currentPage, pageSize, activeTab === 'all' ? undefined : activeTab),
            ]);
            setOverview(overviewRes);
            setRequests(reqResponse.items);
            setTotal(reqResponse.total);
        } catch (error) {
            console.error('Failed to fetch payout data:', error);
            toast.error('Không thể tải dữ liệu thanh toán');
        } finally {
            setLoading(false);
        }
    }, [activeTab, currentPage, pageSize]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchData();
    }, [fetchData]);

    const handleTabChange = (key: string) => {
        setActiveTab(key);
        setCurrentPage(1);
    };

    return (
        <PageContainer
            eyebrow="Thanh toán"
            title="Quản lý thanh toán"
            subtitle="Xét duyệt và xử lý các yêu cầu rút tiền từ gia sư."
            maxWidth="wide"
            headerAction={
                <div className="admin-ui-actions">
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={() => navigate('/admin-portal/payouts/history')}
                    >
                        <span className="material-symbols-outlined">history</span>
                        Lịch sử
                    </button>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-danger"
                        onClick={() => navigate('/admin-portal/payout/fraud-logs')}
                    >
                        <span className="material-symbols-outlined">security</span>
                        Fraud Logs
                    </button>
                </div>
            }
        >
            <PayoutStatsCards overview={overview} loading={loading} />

            <SectionCard
                title="Yêu cầu rút tiền"
                subtitle="Theo dõi trạng thái xử lý, rà soát rủi ro và mở chi tiết để phê duyệt hoặc từ chối."
                footer={`Hiển thị ${requests.length} / ${total.toLocaleString('vi-VN')} yêu cầu`}
            >
                <div className="admin-ui-toolbar payout-filter-toolbar">
                    <FilterTabs
                        tabs={payoutTabs}
                        activeKey={activeTab}
                        onChange={handleTabChange}
                    />
                    <span className="admin-ui-code-chip">Tổng {total.toLocaleString('vi-VN')}</span>
                </div>
                <WithdrawalRequestTable
                    data={requests}
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

export default PayoutOverviewPage;
