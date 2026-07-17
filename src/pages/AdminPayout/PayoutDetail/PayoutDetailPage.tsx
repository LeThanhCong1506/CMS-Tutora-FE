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
import PayoutTimeline from './components/PayoutTimeline';
import PreviousWithdrawalsCard from './components/PreviousWithdrawalsCard';
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
    case 'ADMIN_APPROVED':
    case 'STAFF_APPROVED':
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

const SummaryFact = ({
  icon,
  label,
  children,
  className,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`payout-detail-fact ${className || ''}`}>
    <span className="payout-detail-fact__icon material-symbols-outlined" aria-hidden="true">
      {icon}
    </span>
    <div className="payout-detail-fact__copy">
      <span>{label}</span>
      <div>{children}</div>
    </div>
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

  const { requestInfo, tutorInfo, previousWithdrawals, walletInfo, timeline } = detail;
  const isPending = ['pending', 'pending_review', 'delayed'].includes(requestInfo.status);

  return (
    <PageContainer
      className="payout-detail-page"
      eyebrow="Thanh toán"
      title={`Yêu cầu rút tiền #${id}`}
      subtitle="Đối chiếu thông tin quyết toán, ví và lịch sử rút tiền, chuyển khoản thủ công rồi xác nhận."
      maxWidth="wide"
      headerAction={
        <div className="admin-ui-actions payout-detail-header-actions">
          <button
            type="button"
            className="admin-ui-button admin-ui-button-secondary"
            onClick={() => navigate('/admin-portal/payouts')}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Tổng quan
          </button>
          <WithdrawalStatusBadge status={requestInfo.status} />
        </div>
      }
    >
      <section className="payout-detail-summary" aria-label="Tóm tắt yêu cầu rút tiền">
        <div className="payout-detail-summary__amount">
          <div className="payout-detail-summary__topline">
            <span className="payout-detail-summary__id">#{requestInfo.withdrawalId}</span>
            <WithdrawalStatusBadge status={requestInfo.status} />
          </div>
          <span className="payout-detail-summary__label">Số tiền yêu cầu</span>
          <strong>{formatCurrency(requestInfo.amount)}</strong>
          <small>{requestInfo.accountHolderName || 'Chưa cập nhật chủ tài khoản'}</small>
        </div>

        <div className="payout-detail-summary__facts">
          <SummaryFact icon="person" label="Gia sư">
            <strong>{tutorInfo.name}</strong>
            <small>{tutorInfo.email || tutorInfo.phone || 'Chưa có thông tin liên hệ'}</small>
          </SummaryFact>
          <SummaryFact icon="account_balance" label="Tài khoản nhận">
            <strong>{requestInfo.bankName || 'Chưa cập nhật'}</strong>
            <small>{requestInfo.accountNumber || 'Chưa có số tài khoản'}</small>
          </SummaryFact>
          <SummaryFact icon="calendar_month" label="Thời điểm yêu cầu" className="payout-detail-fact--wide-mobile">
            <strong>{formatDateTime(requestInfo.createdAt)}</strong>
            <small>Thời gian hệ thống ghi nhận</small>
          </SummaryFact>
          <SummaryFact icon="verified_user" label="Hình thức duyệt" className="payout-detail-fact--wide-mobile">
            <StatusBadge variant={decisionVariant(requestInfo.decision)} shape="tag">
              {formatApprovalDecision(requestInfo.decision)}
            </StatusBadge>
          </SummaryFact>
        </div>
      </section>

      <section
        className={`payout-decision-bar ${isPending ? 'payout-decision-bar--pending' : 'payout-decision-bar--resolved'}`}
        aria-label="Trạng thái xử lý yêu cầu"
      >
        <div className="payout-decision-bar__copy">
          <span className="payout-decision-bar__icon material-symbols-outlined" aria-hidden="true">
            {isPending ? 'rule' : 'task_alt'}
          </span>
          <div>
            <strong>{isPending ? 'Yêu cầu cần quyết định' : 'Yêu cầu đã được xử lý'}</strong>
            <span>
              {isPending
                ? 'Đối chiếu tài khoản, chuyển khoản thủ công và chỉ xác nhận sau khi giao dịch thành công.'
                : requestInfo.completionNote || 'Trạng thái cuối cùng đã được cập nhật trên hệ thống.'}
            </span>
          </div>
        </div>

        {isPending ? (
          <div className="payout-decision-bar__actions">
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
              Xác nhận đã chuyển khoản
            </button>
          </div>
        ) : (
          <span className="payout-decision-bar__meta">
            <span className="material-symbols-outlined" aria-hidden="true">
              schedule
            </span>
            {requestInfo.processedAt ? formatDateTime(requestInfo.processedAt) : 'Đã hoàn tất xử lý'}
          </span>
        )}
      </section>

      <div className="payout-detail-layout">
        <div className="payout-detail-main">
          <SectionCard
            className="payout-detail-card"
            title="Thông tin xử lý"
            subtitle="Mốc thời gian, quyết định xử lý và tài khoản nhận tiền."
            headerAction={<WithdrawalStatusBadge status={requestInfo.status} />}
            padded
          >
            <div className="payout-info-grid">
              <DetailItem label="Ngày tạo">{formatDateTime(requestInfo.createdAt)}</DetailItem>
              <DetailItem label="Ngày xử lý">
                {requestInfo.processedAt ? formatDateTime(requestInfo.processedAt) : '---'}
              </DetailItem>
              <DetailItem label="Hình thức duyệt">
                <StatusBadge variant={decisionVariant(requestInfo.decision)} shape="tag">
                  {formatApprovalDecision(requestInfo.decision)}
                </StatusBadge>
              </DetailItem>
              <DetailItem label="Người xử lý">{requestInfo.processedBy || '---'}</DetailItem>
              <DetailItem label="Ghi chú xử lý / mã giao dịch" wide>
                {requestInfo.completionNote ? (
                  <span className="admin-ui-code-chip">{requestInfo.completionNote}</span>
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
            className="payout-detail-card"
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
                <DetailItem label="Ngày tham gia">{formatDateTime(tutorInfo.joinedAt)}</DetailItem>
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
                <DetailItem label="Tổng thu nhập">{formatCurrency(tutorInfo.totalEarnings)}</DetailItem>
                <DetailItem label="Buổi học hoàn thành">
                  {(tutorInfo.completedClassSessions ?? 0).toLocaleString('vi-VN')}
                </DetailItem>
                <DetailItem label="Tuổi tài khoản">
                  {(tutorInfo.accountAgeDays ?? 0).toLocaleString('vi-VN')} ngày
                </DetailItem>
              </div>
            </div>
          </SectionCard>

          <PayoutTimeline events={timeline} loading={loading} />
        </div>

        <aside className="payout-detail-side">
          <PreviousWithdrawalsCard withdrawals={previousWithdrawals} loading={loading} />
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
          bankName={requestInfo.bankName}
          accountNumber={requestInfo.accountNumber}
          accountHolderName={requestInfo.accountHolderName}
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
