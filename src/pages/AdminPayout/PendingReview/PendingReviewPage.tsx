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
            subtitle="Danh sách các yêu cầu rút tiền đang chờ admin/staff kiểm tra và chuyển khoản thủ công."
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
                        Mọi yêu cầu rút tiền đều chờ xử lý thủ công: kiểm tra thông tin tài khoản và lịch sử
                        giao dịch, chuyển khoản cho người dùng, rồi bấm xác nhận đã chuyển trong trang chi tiết.
                    </p>
                </div>
            </div>

            <SectionCard
                title="Hàng đợi xử lý"
                subtitle="Mỗi dòng mở sang trang chi tiết để admin/staff đối chiếu ví, lịch sử và xác nhận chuyển khoản."
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
