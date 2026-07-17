import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { formatCurrency } from '../../../../utils/formatters';
import type { ApprovePayoutRequest } from '../../../../types/adminPayout.types';

const toLocalDateTimeInput = (date: Date): string => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
};

interface Props {
    open: boolean;
    onCancel: () => void;
    onConfirm: (request: ApprovePayoutRequest) => void;
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
    accountHolderName,
}: Props) => {
    const [paidAt, setPaidAt] = useState(() => toLocalDateTimeInput(new Date()));
    const [note, setNote] = useState('');
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
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

    useEffect(() => {
        if (!proofImage) {
            setProofPreviewUrl(null);
            return undefined;
        }

        const objectUrl = URL.createObjectURL(proofImage);
        setProofPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [proofImage]);

    const handleClose = () => {
        if (confirmLoading) return;
        onCancel();
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedNote = note.trim();

        if (!paidAt || Number.isNaN(new Date(paidAt).getTime())) {
            setError('Vui lòng nhập thời gian chuyển khoản hợp lệ');
            return;
        }
        if (new Date(paidAt).getTime() > Date.now() + 5 * 60_000) {
            setError('Thời gian chuyển khoản không được nằm trong tương lai');
            return;
        }
        if (trimmedNote.length < 3) {
            setError('Vui lòng nhập ghi chú đối soát ít nhất 3 ký tự');
            return;
        }
        if (!proofImage) {
            setError('Vui lòng tải ảnh biên lai chuyển khoản');
            return;
        }

        setError('');
        onConfirm({
            paidAt: new Date(paidAt).toISOString(),
            note: trimmedNote,
            proofImage,
        });
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
                                Đánh dấu yêu cầu hoàn tất sau khi bạn đã chuyển tiền thủ công cho người dùng.
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
                            và thông báo cho người dùng — hành động này không thể hoàn tác.
                        </p>
                    </div>

                    <div className="payout-modal-summary approve">
                        <div className="payout-modal-summary-row">
                            <span className="payout-modal-label">Người nhận tiền</span>
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

                    <label className="payout-modal-field" htmlFor="approve-withdrawal-paid-at">
                        <span>Thời gian chuyển khoản</span>
                        <input
                            id="approve-withdrawal-paid-at"
                            className="payout-modal-input"
                            type="datetime-local"
                            value={paidAt}
                            onChange={(event) => {
                                setPaidAt(event.target.value);
                                if (error) setError('');
                            }}
                            disabled={confirmLoading}
                            required
                        />
                    </label>

                    <label className="payout-modal-field" htmlFor="approve-withdrawal-note">
                        <span>Ghi chú đối soát</span>
                        <textarea
                            id="approve-withdrawal-note"
                            className="payout-modal-textarea"
                            rows={3}
                            value={note}
                            maxLength={500}
                            onChange={(event) => {
                                setNote(event.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ví dụ: Đã kiểm tra đúng số tiền, chủ tài khoản và nội dung chuyển khoản."
                            disabled={confirmLoading}
                            required
                        />
                    </label>

                    <label className="payout-modal-field" htmlFor="approve-withdrawal-proof">
                        <span>Ảnh biên lai chuyển khoản</span>
                        <input
                            id="approve-withdrawal-proof"
                            className="payout-modal-file-input"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                if (file && file.size > 5 * 1024 * 1024) {
                                    setProofImage(null);
                                    setError('Ảnh biên lai không được vượt quá 5 MB');
                                    event.target.value = '';
                                    return;
                                }
                                setProofImage(file);
                                if (error) setError('');
                            }}
                            disabled={confirmLoading}
                            required
                        />
                        <small>JPG, PNG hoặc WEBP, tối đa 5 MB. Ảnh được lưu ở chế độ riêng tư.</small>
                        {proofPreviewUrl && (
                            <img
                                className="payout-proof-image"
                                src={proofPreviewUrl}
                                alt="Xem trước biên lai chuyển khoản"
                            />
                        )}
                    </label>

                    {error && (
                        <small className="payout-modal-error payout-modal-form-error" role="alert">
                            {error}
                        </small>
                    )}
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
                        disabled={
                            confirmLoading
                            || !paidAt
                            || note.trim().length < 3
                            || !proofImage
                        }
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
