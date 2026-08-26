import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getPendingReview } from '../../../services/adminPayout.service';
import type { PendingReviewItem, WithdrawalRequestItem } from '../../../types/adminPayout.types';
import { PageContainer, SectionCard } from '../../../components/shared';
import WithdrawalRequestTable from '../PayoutOverview/components/WithdrawalRequestTable';
import '../../../styles/pages/admin-payout.css';
import { apiErrorMessage } from '../../../utils/apiError';

const PendingReviewPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<PendingReviewItem[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(ADMIN_PAGE_SIZE);
    const navigate = useNavigate();

    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPendingReview(currentPage, pageSize);
            setItems(data.items);
            setTotal(data.total);
        } catch (error) {
            console.error('Failed to fetch pending reviews:', error);
            toast.error(apiErrorMessage(error, 'Không thể tải danh sách chờ duyệt'));
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchPending();
    }, [fetchPending]);

    const mappedData = useMemo<WithdrawalRequestItem[]>(() => (
        items.map((item) => ({
            withdrawalId: item.withdrawalId,
            tutorId: item.tutorId,
            tutorName: item.tutorName,
            tutorEmail: item.tutorEmail,
            amount: item.amount,
            bankName: item.bankName,
            accountNumber: item.accountNumber,
            requestedAt: item.requestedAt,
            status: item.status,
        }))
    ), [items]);

    return (
        <PageContainer
            eyebrow="Thanh toán"
            title="Yêu cầu chờ xét duyệt"
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
                title="Hàng đợi xử lý"
                footer={`Hiển thị ${mappedData.length} / ${total.toLocaleString('vi-VN')} yêu cầu`}
            >
                <WithdrawalRequestTable
                    data={mappedData}
                    loading={loading}
                    total={total}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    detailBasePath="/admin-portal/payout/review"
                    onPageChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    }}
                />
            </SectionCard>
        </PageContainer>
    );
};

export default PendingReviewPage;
