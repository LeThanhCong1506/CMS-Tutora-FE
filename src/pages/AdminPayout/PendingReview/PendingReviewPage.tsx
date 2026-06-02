import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Breadcrumb, Card, Alert } from 'antd';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getPendingReview } from '../../../services/adminPayout.service';
import type { PendingReviewItem } from '../../../types/adminPayout.types';
import WithdrawalRequestTable from '../PayoutOverview/components/WithdrawalRequestTable';

const { Title, Text } = Typography;

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
        fetchPending();
    }, [fetchPending]);

    // Convert PendingReviewItem to WithdrawalRequestItem format for the table
    // or create a specialized table. Since the table is generic enough, let's adapt or reuse.
    // Actually PayoutOverview table shows basic info. Pending review might need trust scores.

    const mappedData = items.map(item => ({
        withdrawalId: item.withdrawalId,
        tutorId: item.tutorId,
        tutorName: item.tutorName,
        tutorEmail: '', // Not in PendingReviewItem
        amount: item.amount,
        bankName: '', // Not in PendingReviewItem
        accountNumber: '', // Not in PendingReviewItem
        requestedAt: item.requestedAt,
        status: 'PendingReview'
    }));

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <Breadcrumb
                    items={[
                        { title: 'Quản trị' },
                        { title: 'Quản lý thanh toán', onClick: () => navigate('/admin-portal/payouts'), className: 'clickable' },
                        { title: 'Chờ xét duyệt' },
                    ]}
                    style={{ marginBottom: '16px' }}
                />
                <Title level={2}>Yêu cầu chờ xét duyệt rủi ro</Title>
                <Text type="secondary">
                    Danh sách các yêu cầu rút tiền bị hệ thống gắn cờ cảnh báo hoặc có điểm rủi ro cao
                </Text>
            </div>

            <Alert
                message="Về quy trình xét duyệt"
                description="Các yêu cầu trong danh sách này tạm thời bị giữ lại do vi phạm quy tắc an toàn hoặc cần đối soát hồ sơ. Vui lòng kiểm tra kỹ lịch sử giao diện và các Fraud Flags trước khi phê duyệt."
                type="info"
                showIcon
                style={{ marginBottom: '24px' }}
            />

            <Card bordered={false}>
                <WithdrawalRequestTable
                    data={mappedData as any}
                    loading={loading}
                    total={total}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    }}
                />
            </Card>
        </div>
    );
};

export default PendingReviewPage;
