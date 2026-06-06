import { useState } from 'react';
import { toast } from 'react-toastify';
import type { FormEvent } from 'react';
import type { WithdrawalRequest } from '../../../types/admin.types';
import { formatCurrency } from '../../../utils/formatters';

const commonRejectReasons = [
    'Thông tin ngân hàng không khớp',
    'Số dư không đủ',
    'Tài khoản đang bị đình chỉ',
    'Cần xác minh danh tính bổ sung',
];

interface RejectWithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    withdrawal: WithdrawalRequest | null;
    onReject: (withdrawalId: string, reason: string) => Promise<void>;
}

const RejectWithdrawalModal = ({ isOpen, onClose, withdrawal, onReject }: RejectWithdrawalModalProps) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => {
        if (isSubmitting) return;
        setReason('');
        setError('');
        onClose();
    };

    const handleReject = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!withdrawal) return;

        const trimmedReason = reason.trim();
        if (trimmedReason.length < 10) {
            setError('Lý do từ chối phải có ít nhất 10 ký tự');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onReject(withdrawal.withdrawalid, trimmedReason);
            toast.success(`Đã từ chối yêu cầu rút tiền ${withdrawal.withdrawalid}`);
            setReason('');
            onClose();
        } catch (err) {
            console.error('Error rejecting withdrawal:', err);
            toast.error('Không thể từ chối yêu cầu. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !withdrawal) return null;

    return (
        <div className="financial-modal-overlay" onClick={handleClose} role="presentation">
            <form
                className="financial-modal-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="financial-reject-title"
                aria-describedby="financial-reject-description"
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleReject}
            >
                <header className="financial-modal-header">
                    <div className="financial-modal-title-group">
                        <span className="financial-modal-icon danger material-symbols-outlined" aria-hidden="true">
                            cancel
                        </span>
                        <div>
                            <h2 id="financial-reject-title">Từ chối yêu cầu rút tiền</h2>
                            <p id="financial-reject-description">
                                Tutor sẽ nhận được lý do này trong thông báo xử lý yêu cầu.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="financial-modal-close"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        aria-label="Đóng modal"
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </header>

                <div className="financial-modal-body">
                    <div className="financial-withdrawal-card danger">
                        <div className="financial-withdrawal-tutor">
                            <img
                                className="financial-avatar"
                                src={withdrawal.tutoravatar}
                                alt=""
                                loading="lazy"
                            />
                            <div className="financial-entity">
                                <strong>{withdrawal.tutorname}</strong>
                                <span>{withdrawal.tutorsubject}</span>
                            </div>
                        </div>

                        <div className="financial-detail-grid compact">
                            <div className="financial-detail-item highlight-danger">
                                <span>Số tiền</span>
                                <strong>{formatCurrency(withdrawal.amount)}</strong>
                            </div>
                            <div className="financial-detail-item">
                                <span>Mã yêu cầu</span>
                                <strong className="financial-code">{withdrawal.withdrawalid}</strong>
                            </div>
                            <div className="financial-detail-item">
                                <span>Ngân hàng</span>
                                <strong>{withdrawal.bankname}</strong>
                            </div>
                            <div className="financial-detail-item">
                                <span>Ngày yêu cầu</span>
                                <strong>{new Date(withdrawal.requestedat).toLocaleDateString('vi-VN')}</strong>
                            </div>
                        </div>
                    </div>

                    <label className="financial-form-field" htmlFor="financial-reject-reason">
                        <span>Lý do từ chối</span>
                        <textarea
                            id="financial-reject-reason"
                            className={`financial-textarea ${error ? 'has-error' : ''}`}
                            rows={5}
                            value={reason}
                            onChange={(event) => {
                                setReason(event.target.value);
                                setError('');
                            }}
                            placeholder="Ví dụ: Thông tin ngân hàng không khớp với hồ sơ đã đăng ký. Vui lòng cập nhật thông tin chính xác và gửi lại yêu cầu."
                            disabled={isSubmitting}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? 'financial-reject-error' : undefined}
                        />
                        {error ? (
                            <small id="financial-reject-error" className="financial-form-error">
                                {error}
                            </small>
                        ) : (
                            <small>Tối thiểu 10 ký tự để tutor có đủ ngữ cảnh xử lý.</small>
                        )}
                    </label>

                    <div className="financial-quick-reasons">
                        <span>Lý do phổ biến</span>
                        <div>
                            {commonRejectReasons.map((commonReason) => (
                                <button
                                    key={commonReason}
                                    type="button"
                                    className="financial-reason-chip"
                                    onClick={() => {
                                        setReason(commonReason);
                                        setError('');
                                    }}
                                    disabled={isSubmitting}
                                >
                                    {commonReason}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <footer className="financial-modal-footer">
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="admin-ui-button admin-ui-button-danger"
                        disabled={isSubmitting || reason.trim().length < 10}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">
                            {isSubmitting ? 'progress_activity' : 'cancel'}
                        </span>
                        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default RejectWithdrawalModal;
