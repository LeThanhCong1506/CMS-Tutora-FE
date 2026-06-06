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
}

const ApproveWithdrawalModal = ({
    open,
    onCancel,
    onConfirm,
    confirmLoading,
    amount,
    tutorName
}: Props) => {
    const [note, setNote] = useState('');

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
        onConfirm(note.trim());
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
                            <h2 id="approve-withdrawal-title">Phê duyệt thanh toán</h2>
                            <p id="approve-withdrawal-description">
                                Kiểm tra lần cuối trước khi chuyển tiền qua cổng thanh toán.
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
                            Hành động này sẽ thực hiện chuyển tiền thật thông qua cổng thanh toán PayOS.
                            Vui lòng kiểm tra kỹ số tiền và tài khoản thụ hưởng.
                        </p>
                    </div>

                    <div className="payout-modal-summary approve">
                        <div className="payout-modal-summary-row">
                            <span className="payout-modal-label">Gia sư</span>
                            <strong className="payout-modal-value">{tutorName}</strong>
                        </div>
                        <div className="payout-modal-summary-row">
                            <span className="payout-modal-label">Số tiền quyết toán</span>
                            <strong className="payout-modal-amount-success">{formatCurrency(amount)}</strong>
                        </div>
                    </div>

                    <label className="payout-modal-field" htmlFor="approve-withdrawal-note">
                        <span>Ghi chú nội bộ</span>
                        <textarea
                            id="approve-withdrawal-note"
                            className="payout-modal-textarea"
                            rows={3}
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="Ví dụ: Đã kiểm tra đối soát, thông tin hợp lệ."
                            disabled={confirmLoading}
                        />
                        <small>Không bắt buộc, chỉ hiển thị cho admin trong lịch sử xử lý.</small>
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
                        disabled={confirmLoading}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">
                            {confirmLoading ? 'progress_activity' : 'check_circle'}
                        </span>
                        {confirmLoading ? 'Đang xử lý...' : 'Xác nhận phê duyệt'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default ApproveWithdrawalModal;
