import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

interface Props {
    open: boolean;
    onCancel: () => void;
    onConfirm: (reason: string) => void;
    confirmLoading: boolean;
    tutorName: string;
}

const RejectWithdrawalModal = ({
    open,
    onCancel,
    onConfirm,
    confirmLoading,
    tutorName
}: Props) => {
    const [reason, setReason] = useState('');
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

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            setError('Vui lòng nhập lý do từ chối');
            return;
        }

        setError('');
        onConfirm(trimmedReason);
    };

    if (!open) return null;

    return (
        <div className="payout-modal-overlay" onClick={handleClose} role="presentation">
            <form
                className="payout-modal-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reject-withdrawal-title"
                aria-describedby="reject-withdrawal-description"
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <header className="payout-modal-header">
                    <div className="payout-modal-title-group">
                        <span className="payout-modal-icon danger material-symbols-outlined" aria-hidden="true">
                            cancel
                        </span>
                        <div>
                            <h2 id="reject-withdrawal-title">Từ chối yêu cầu rút tiền</h2>
                            <p id="reject-withdrawal-description">
                                Nhập lý do rõ ràng để tutor biết cần điều chỉnh thông tin nào.
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
                    <div className="payout-modal-alert error" role="note">
                        <span className="material-symbols-outlined" aria-hidden="true">error</span>
                        <p>
                            Yêu cầu của <strong>{tutorName}</strong> sẽ bị hủy và số tiền sẽ được hoàn lại vào ví
                            của gia sư. Thông báo lỗi sẽ được gửi tới tutor.
                        </p>
                    </div>

                    <label className="payout-modal-field" htmlFor="reject-withdrawal-reason">
                        <span>Lý do từ chối gửi tới tutor</span>
                        <textarea
                            id="reject-withdrawal-reason"
                            className={`payout-modal-textarea ${error ? 'has-error' : ''}`}
                            rows={4}
                            value={reason}
                            onChange={(event) => {
                                setReason(event.target.value);
                                setError('');
                            }}
                            placeholder="Ví dụ: Thông tin tài khoản ngân hàng không chính xác. Tên chủ tài khoản không khớp với hồ sơ gia sư."
                            disabled={confirmLoading}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? 'reject-withdrawal-error' : undefined}
                        />
                        {error ? (
                            <small id="reject-withdrawal-error" className="payout-modal-error">
                                {error}
                            </small>
                        ) : (
                            <small>Thông tin này sẽ xuất hiện trong thông báo gửi tới tutor.</small>
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
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="admin-ui-button admin-ui-button-danger"
                        disabled={confirmLoading}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">
                            {confirmLoading ? 'progress_activity' : 'cancel'}
                        </span>
                        {confirmLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default RejectWithdrawalModal;
