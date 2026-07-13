import { useState } from 'react';
import { toast } from 'react-toastify';
import type { WithdrawalRequestItem } from '../../../types/adminPayout.types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';

interface ApproveWithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    withdrawal: WithdrawalRequestItem | null;
    onApprove: (withdrawalId: number, note: string) => Promise<void>;
}

const ApproveWithdrawalModal = ({ isOpen, onClose, withdrawal, onApprove }: ApproveWithdrawalModalProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Backend yêu cầu ghi chú duyệt (ApproveWithdrawalRequest.Note, tối thiểu 3 ký tự).
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    const handleClose = () => {
        if (isSubmitting) return;
        setNote('');
        setError('');
        onClose();
    };

    const handleApprove = async () => {
        if (!withdrawal) return;

        const trimmedNote = note.trim();
        if (trimmedNote.length < 3) {
            setError('Ghi chú phê duyệt phải có ít nhất 3 ký tự');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onApprove(withdrawal.withdrawalId, trimmedNote);
            toast.success(`Đã phê duyệt rút tiền ${formatCurrency(withdrawal.amount)} cho ${withdrawal.tutorName}`);
            setNote('');
            onClose();
        } catch (err) {
            console.error('Error approving withdrawal:', err);
            toast.error('Không thể phê duyệt yêu cầu. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !withdrawal) return null;

    return (
        <div className="financial-modal-overlay" onClick={handleClose} role="presentation">
            <section
                className="financial-modal-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="financial-approve-title"
                aria-describedby="financial-approve-description"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="financial-modal-header">
                    <div className="financial-modal-title-group">
                        <span className="financial-modal-icon success material-symbols-outlined" aria-hidden="true">
                            check_circle
                        </span>
                        <div>
                            <h2 id="financial-approve-title">Xác nhận phê duyệt rút tiền</h2>
                            <p id="financial-approve-description">
                                Kiểm tra thông tin tutor, ngân hàng và số tiền trước khi xử lý.
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
                    <div className="financial-withdrawal-card">
                        <div className="financial-withdrawal-tutor">
                            <div className="financial-entity">
                                <strong>{withdrawal.tutorName}</strong>
                                <span>{withdrawal.tutorEmail}</span>
                            </div>
                        </div>

                        <div className="financial-detail-grid">
                            <div className="financial-detail-item highlight">
                                <span>Số tiền rút</span>
                                <strong>{formatCurrency(withdrawal.amount)}</strong>
                            </div>
                            <div className="financial-detail-item">
                                <span>Mã yêu cầu</span>
                                <strong className="financial-code">{withdrawal.withdrawalId}</strong>
                            </div>
                            <div className="financial-detail-item">
                                <span>Ngân hàng</span>
                                <strong>{withdrawal.bankName}</strong>
                            </div>
                            <div className="financial-detail-item">
                                <span>Số tài khoản</span>
                                <strong className="financial-code">{withdrawal.accountNumber}</strong>
                            </div>
                            <div className="financial-detail-item wide">
                                <span>Ngày yêu cầu</span>
                                <strong>{formatDateTime(withdrawal.requestedAt)}</strong>
                            </div>
                        </div>
                    </div>

                    <label className="financial-form-field" htmlFor="financial-approve-note">
                        <span>Ghi chú phê duyệt</span>
                        <textarea
                            id="financial-approve-note"
                            className={`financial-textarea ${error ? 'has-error' : ''}`}
                            rows={3}
                            value={note}
                            onChange={(event) => {
                                setNote(event.target.value);
                                setError('');
                            }}
                            placeholder="Ví dụ: Đã đối chiếu thông tin ngân hàng, duyệt chi."
                            disabled={isSubmitting}
                            aria-invalid={Boolean(error)}
                        />
                        {error ? (
                            <small className="financial-form-error">{error}</small>
                        ) : (
                            <small>Tối thiểu 3 ký tự. Ghi chú được lưu vào lịch sử xử lý.</small>
                        )}
                    </label>

                    <div className="financial-modal-alert success" role="note">
                        <span className="material-symbols-outlined" aria-hidden="true">verified</span>
                        <p>
                            Sau khi phê duyệt, yêu cầu sẽ được đánh dấu đã xử lý. Hãy đảm bảo thông tin ngân hàng
                            khớp với hồ sơ trước khi xác nhận.
                        </p>
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
                        type="button"
                        className="admin-ui-button admin-ui-button-success"
                        onClick={handleApprove}
                        disabled={isSubmitting || note.trim().length < 3}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">
                            {isSubmitting ? 'progress_activity' : 'check_circle'}
                        </span>
                        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận phê duyệt'}
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default ApproveWithdrawalModal;
