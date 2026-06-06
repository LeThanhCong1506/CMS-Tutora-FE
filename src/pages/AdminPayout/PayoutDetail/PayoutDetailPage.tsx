import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    getPayoutRequestDetail,
    approvePayoutRequest,
    rejectPayoutRequest,
} from '../../../services/adminPayout.service';
import type { AdminWithdrawalDetail } from '../../../types/adminPayout.types';
import { formatApprovalDecision, formatCurrency, formatDateTime } from '../../../utils/formatters';
import { PageContainer, SectionCard, StatusBadge } from '../../../components/shared';
import WithdrawalStatusBadge from '../WithdrawalStatusBadge';
import FraudFlagsCard from './components/FraudFlagsCard';
import TrustScoreCard from './components/TrustScoreCard';
import PayoutTimeline from './components/PayoutTimeline';
import ApproveWithdrawalModal from './components/ApproveWithdrawalModal';
import RejectWithdrawalModal from './components/RejectWithdrawalModal';
import '../../../styles/pages/admin-payout.css';

type ApiError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

const getErrorMessage = (error: unknown, fallback: string) => {
    const apiError = error as ApiError;
    return apiError?.response?.data?.message || fallback;
};

const decisionVariant = (decision: string | null): 'success' | 'warning' | 'error' | 'neutral' => {
    switch (decision) {
        case 'AUTO_APPROVE':
            return 'success';
        case 'AUTO_REJECT':
            return 'error';
        case 'DELAYED':
        case 'MANUAL_REVIEW':
            return 'warning';
        default:
            return 'neutral';
    }
};

const DetailItem = ({
    label,
    children,
    wide = false,
}: {
    label: string;
    children: React.ReactNode;
    wide?: boolean;
}) => (
    <div className={`payout-info-item ${wide ? 'wide' : ''}`}>
        <span className="payout-info-label">{label}</span>
        <div className="payout-info-value">{children}</div>
    </div>
);

const PayoutDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<AdminWithdrawalDetail | null>(null);
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const requestId = Number.parseInt(id || '', 10);

    const fetchDetail = useCallback(async () => {
        if (!Number.isFinite(requestId)) return;
        setLoading(true);
        try {
            const data = await getPayoutRequestDetail(requestId);
            setDetail(data);
        } catch (error) {
            console.error('Failed to fetch payout detail:', error);
            toast.error('Không thể tải chi tiết yêu cầu');
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchDetail();
    }, [fetchDetail]);

    const handleApprove = async (note: string) => {
        if (!Number.isFinite(requestId)) return;
        setActionLoading(true);
        try {
            const result = await approvePayoutRequest(requestId, note);
            if (result.success) {
                toast.success(result.message || 'Đã phê duyệt và chuyển tiền thành công');
                void fetchDetail();
                setApproveModalOpen(false);
            } else {
                toast.error(result.message || 'Phê duyệt thất bại');
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Có lỗi xảy ra khi phê duyệt'));
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (reason: string) => {
        if (!Number.isFinite(requestId)) return;
        setActionLoading(true);
        try {
            const result = await rejectPayoutRequest(requestId, reason);
            if (result.success) {
                toast.success('Đã từ chối yêu cầu rút tiền');
                void fetchDetail();
                setRejectModalOpen(false);
            } else {
                toast.error(result.message || 'Từ chối thất bại');
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Có lỗi xảy ra khi từ chối'));
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !detail) {
        return (
            <PageContainer
                eyebrow="Thanh toán"
                title={`Yêu cầu rút tiền #${id || '---'}`}
                subtitle="Đang tải dữ liệu quyết toán."
                maxWidth="wide"
            >
                <SectionCard padded>
                    <div className="admin-ui-muted-state">Đang tải chi tiết yêu cầu...</div>
                </SectionCard>
            </PageContainer>
        );
    }

    if (!detail) {
        return (
            <PageContainer
                eyebrow="Thanh toán"
                title="Không tìm thấy yêu cầu"
                subtitle="Yêu cầu rút tiền không tồn tại hoặc bạn không có quyền truy cập."
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
                <SectionCard padded>
                    <div className="admin-ui-muted-state">Không có dữ liệu để hiển thị.</div>
                </SectionCard>
            </PageContainer>
        );
    }

    const { requestInfo, tutorInfo, scoreBreakdown, fraudFlags, walletInfo, timeline } = detail;
    const isPending = ['pending', 'pending_review', 'delayed'].includes(requestInfo.status);

    return (
        <PageContainer
            eyebrow="Thanh toán"
            title={`Yêu cầu rút tiền #${id}`}
            subtitle="Kiểm tra thông tin quyết toán, trust score, ví và timeline trước khi xử lý."
            maxWidth="wide"
            headerAction={
                <div className="admin-ui-actions">
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={() => navigate('/admin-portal/payouts')}
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                        Tổng quan
                    </button>
                    {isPending ? (
                        <>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-danger"
                                onClick={() => setRejectModalOpen(true)}
                                disabled={actionLoading}
                            >
                                <span className="material-symbols-outlined">cancel</span>
                                Từ chối
                            </button>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-success"
                                onClick={() => setApproveModalOpen(true)}
                                disabled={actionLoading}
                            >
                                <span className="material-symbols-outlined">check_circle</span>
                                Phê duyệt & chuyển tiền
                            </button>
                        </>
                    ) : (
                        <WithdrawalStatusBadge status={requestInfo.status} />
                    )}
                </div>
            }
        >
            <div className="payout-detail-layout">
                <div className="payout-detail-main">
                    <SectionCard
                        title="Thông tin quyết toán"
                        subtitle="Thông tin yêu cầu, quyết định xử lý và tài khoản nhận tiền."
                        headerAction={<WithdrawalStatusBadge status={requestInfo.status} />}
                        padded
                    >
                        <div className="payout-info-grid">
                            <DetailItem label="Số tiền yêu cầu">
                                <span className="admin-ui-amount payout-amount-strong">
                                    {formatCurrency(requestInfo.amount)}
                                </span>
                            </DetailItem>
                            <DetailItem label="Ngày tạo">
                                {formatDateTime(requestInfo.createdAt)}
                            </DetailItem>
                            <DetailItem label="Ngày xử lý">
                                {requestInfo.processedAt ? formatDateTime(requestInfo.processedAt) : '---'}
                            </DetailItem>
                            <DetailItem label="Hình thức duyệt">
                                <StatusBadge variant={decisionVariant(requestInfo.decision)} shape="tag">
                                    {formatApprovalDecision(requestInfo.decision)}
                                </StatusBadge>
                            </DetailItem>
                            <DetailItem label="Mã giao dịch PayOS" wide>
                                {requestInfo.payosTransactionId ? (
                                    <span className="admin-ui-code-chip">{requestInfo.payosTransactionId}</span>
                                ) : (
                                    <span className="admin-ui-table-meta">---</span>
                                )}
                            </DetailItem>
                        </div>

                        <div className="payout-bank-panel">
                            <div className="payout-subsection-title">
                                <span className="material-symbols-outlined">account_balance</span>
                                Thông tin tài khoản nhận
                            </div>
                            <div className="payout-info-grid compact">
                                <DetailItem label="Ngân hàng">{requestInfo.bankName || 'N/A'}</DetailItem>
                                <DetailItem label="Số tài khoản">
                                    <strong>{requestInfo.accountNumber || 'N/A'}</strong>
                                </DetailItem>
                                <DetailItem label="Chủ tài khoản" wide>
                                    {requestInfo.accountHolderName || 'N/A'}
                                </DetailItem>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Thông tin gia sư & ví"
                        subtitle="Đối chiếu hồ sơ gia sư với số dư ví trước khi ra quyết định."
                        padded
                    >
                        <div className="payout-split-grid">
                            <div className="payout-info-grid compact">
                                <DetailItem label="Họ tên">
                                    <strong>{tutorInfo.name}</strong>
                                </DetailItem>
                                <DetailItem label="Email">{tutorInfo.email || 'N/A'}</DetailItem>
                                <DetailItem label="Số điện thoại">{tutorInfo.phone || 'N/A'}</DetailItem>
                                <DetailItem label="Ngày tham gia">
                                    {formatDateTime(tutorInfo.joinedAt)}
                                </DetailItem>
                            </div>
                            <div className="payout-wallet-panel">
                                <div className="payout-subsection-title">
                                    <span className="material-symbols-outlined">account_balance_wallet</span>
                                    Số dư ví hiện tại
                                </div>
                                <DetailItem label="Số dư khả dụng">
                                    <span className="admin-ui-amount payout-success-amount">
                                        {formatCurrency(walletInfo.availableBalance)}
                                    </span>
                                </DetailItem>
                                <DetailItem label="Tổng thu nhập">
                                    {formatCurrency(tutorInfo.totalEarnings)}
                                </DetailItem>
                                <DetailItem label="Buổi học hoàn thành">
                                    {tutorInfo.completedLessons.toLocaleString('vi-VN')}
                                </DetailItem>
                            </div>
                        </div>
                    </SectionCard>

                    <PayoutTimeline events={timeline} loading={loading} />
                </div>

                <aside className="payout-detail-side">
                    <TrustScoreCard scoreData={scoreBreakdown} loading={loading} />
                    <FraudFlagsCard flags={fraudFlags} loading={loading} />
                </aside>
            </div>

            {approveModalOpen && (
                <ApproveWithdrawalModal
                    open={approveModalOpen}
                    onCancel={() => setApproveModalOpen(false)}
                    onConfirm={handleApprove}
                    confirmLoading={actionLoading}
                    amount={requestInfo.amount}
                    tutorName={tutorInfo.name}
                />
            )}

            {rejectModalOpen && (
                <RejectWithdrawalModal
                    open={rejectModalOpen}
                    onCancel={() => setRejectModalOpen(false)}
                    onConfirm={handleReject}
                    confirmLoading={actionLoading}
                    tutorName={tutorInfo.name}
                />
            )}
        </PageContainer>
    );
};

export default PayoutDetailPage;
