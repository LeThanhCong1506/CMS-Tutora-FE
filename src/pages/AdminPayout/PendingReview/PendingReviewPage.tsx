import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getPendingReview } from '../../../services/adminPayout.service';
import type { PendingReviewItem, WithdrawalRequestItem } from '../../../types/adminPayout.types';
import { PageContainer, SectionCard } from '../../../components/shared';
import WithdrawalRequestTable from '../PayoutOverview/components/WithdrawalRequestTable';
import '../../../styles/pages/admin-payout.css';

const PendingReviewPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<PendingReviewItem[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const navigate = useNavigate();

    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPendingReview(currentPage, pageSize);
            setItems(data.items);
            setTotal(data.total);
        } catch (error) {
            console.error('Failed to fetch pending reviews:', error);
            toast.error('Không thể tải danh sách chờ duyệt');
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
            tutorEmail: item.topFraudFlags.length > 0 ? item.topFraudFlags.join(', ') : 'Cần xét duyệt rủi ro',
            amount: item.amount,
            bankName: item.trustScore === null ? 'Chưa có trust score' : `Trust score ${item.trustScore}`,
            accountNumber: '',
            requestedAt: item.requestedAt,
            status: 'pending_review',
        }))
    ), [items]);

    return (
        <PageContainer
            eyebrow="Thanh toán"
            title="Yêu cầu chờ xét duyệt rủi ro"
            subtitle="Danh sách các yêu cầu rút tiền bị hệ thống gắn cờ cảnh báo hoặc có điểm rủi ro cao."
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
            <div className="payout-review-callout">
                <span className="material-symbols-outlined">info</span>
                <div>
                    <h3>Về quy trình xét duyệt</h3>
                    <p>
                        Các yêu cầu trong danh sách này tạm thời bị giữ lại do vi phạm quy tắc an toàn
                        hoặc cần đối soát hồ sơ. Kiểm tra lịch sử giao dịch và fraud flags trước khi phê duyệt.
                    </p>
                </div>
            </div>

            <SectionCard
                title="Hàng đợi rủi ro"
                subtitle="Mỗi dòng mở sang trang chi tiết để admin xem trust score, ví và timeline xử lý."
                footer={`Hiển thị ${mappedData.length} / ${total.toLocaleString('vi-VN')} yêu cầu`}
            >
                <WithdrawalRequestTable
                    data={mappedData}
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

export default PendingReviewPage;
