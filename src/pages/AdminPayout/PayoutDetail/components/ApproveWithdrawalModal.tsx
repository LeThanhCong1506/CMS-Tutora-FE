import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { formatCurrency } from '../../../../utils/formatters';

interface Props {
    open: boolean;
    onCancel: () => void;
    onConfirm: (note: string) => void;
    confirmLoading: boolean;
    amount: number;
    tutorName: string;
    bankName?: string | null;
    accountNumber?: string | null;
    accountHolderName?: string | null;
}

const ApproveWithdrawalModal = ({
    open,
    onCancel,
    onConfirm,
    confirmLoading,
    amount,
    tutorName,
    bankName,
    accountNumber,
    accountHolderName
}: Props) => {
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return undefined;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !confirmLoading) {
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmLoading, onCancel, open]);

    const handleClose = () => {
        if (confirmLoading) return;
        onCancel();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedNote = note.trim();
        if (!trimmedNote) {
            setError('Vui lòng nhập ghi chú/mã tham chiếu giao dịch chuyển khoản');
            return;
        }

        setError('');
        onConfirm(trimmedNote);
    };

    if (!open) return null;

    return (
        <div className="payout-modal-overlay" onClick={handleClose} role="presentation">
            <form
                className="payout-modal-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="approve-withdrawal-title"
                aria-describedby="approve-withdrawal-description"
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <header className="payout-modal-header">
                    <div className="payout-modal-title-group">
                        <span className="payout-modal-icon success material-symbols-outlined" aria-hidden="true">
                            check_circle
                        </span>
                        <div>
                            <h2 id="approve-withdrawal-title">Xác nhận đã chuyển khoản</h2>
                            <p id="approve-withdrawal-description">
                                Đánh dấu yêu cầu hoàn tất sau khi bạn đã chuyển tiền thủ công cho gia sư.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="payout-modal-close"
                        onClick={handleClose}
                        disabled={confirmLoading}
                        aria-label="Đóng modal"
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </header>

                <div className="payout-modal-body">
                    <div className="payout-modal-alert warning" role="note">
                        <span className="material-symbols-outlined" aria-hidden="true">warning</span>
                        <p>
                            Chỉ bấm xác nhận <strong>sau khi</strong> bạn đã chuyển khoản thủ công đúng số tiền
                            vào tài khoản thụ hưởng bên dưới. Hệ thống sẽ chuyển yêu cầu sang trạng thái hoàn tất
                            và thông báo cho gia sư — hành động này không thể hoàn tác.
                        </p>
                    </div>

                    <div className="payout-modal-summary approve">
                        <div className="payout-modal-summary-row">
                            <span className="payout-modal-label">Gia sư</span>
                            <strong className="payout-modal-value">{tutorName}</strong>
                        </div>
                        <div className="payout-modal-summary-row">
                            <span className="payout-modal-label">Số tiền chuyển khoản</span>
                            <strong className="payout-modal-amount-success">{formatCurrency(amount)}</strong>
                        </div>
                        {bankName && (
                            <div className="payout-modal-summary-row">
                                <span className="payout-modal-label">Ngân hàng</span>
                                <strong className="payout-modal-value">{bankName}</strong>
                            </div>
                        )}
                        {accountNumber && (
                            <div className="payout-modal-summary-row">
                                <span className="payout-modal-label">Số tài khoản</span>
                                <strong className="payout-modal-value">{accountNumber}</strong>
                            </div>
                        )}
                        {accountHolderName && (
                            <div className="payout-modal-summary-row">
                                <span className="payout-modal-label">Chủ tài khoản</span>
                                <strong className="payout-modal-value">{accountHolderName}</strong>
                            </div>
                        )}
                    </div>

                    <label className="payout-modal-field" htmlFor="approve-withdrawal-note">
                        <span>Ghi chú / mã giao dịch chuyển khoản</span>
                        <textarea
                            id="approve-withdrawal-note"
                            className="payout-modal-textarea"
                            rows={3}
                            value={note}
                            onChange={(event) => {
                                setNote(event.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ví dụ: Đã CK 14:35 16/07 — mã GD FT26197xxxx."
                            disabled={confirmLoading}
                            required
                        />
                        {error ? (
                            <small className="payout-modal-error" role="alert">{error}</small>
                        ) : (
                            <small>Bắt buộc — ghi lại mã tham chiếu/thời gian chuyển khoản để đối soát sau này.</small>
                        )}
                    </label>
                </div>

                <footer className="payout-modal-footer">
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={handleClose}
                        disabled={confirmLoading}
                    >
                        Đóng
                    </button>
                    <button
                        type="submit"
                        className="admin-ui-button admin-ui-button-success"
                        disabled={confirmLoading || !note.trim()}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">
                            {confirmLoading ? 'progress_activity' : 'check_circle'}
                        </span>
                        {confirmLoading ? 'Đang xử lý...' : 'Xác nhận đã chuyển khoản'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default ApproveWithdrawalModal;
