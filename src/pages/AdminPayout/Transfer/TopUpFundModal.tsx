import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'react-toastify';
import { topUpFund } from '../../../services/adminPayout.service';
import { formatCurrency } from '../../../utils/formatters';

const MIN_REASON = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface TopUpFundModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TopUpFundModal = ({ isOpen, onClose, onSuccess }: TopUpFundModalProps) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setAmount('');
        setReason('');
        setProofImage(null);
        setError('');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isSubmitting) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSubmitting, onClose, isOpen]);

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
        if (isSubmitting) return;
        onClose();
    };

    if (!isOpen) return null;

    const parsedAmount = Number(amount);
    const amountInvalid = !amount || Number.isNaN(parsedAmount) || parsedAmount < 1000;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedReason = reason.trim();

        if (amountInvalid) {
            setError('Số tiền phải từ 1.000đ trở lên.');
            return;
        }
        if (trimmedReason.length < MIN_REASON) {
            setError(`Lý do phải có ít nhất ${MIN_REASON} ký tự.`);
            return;
        }
        if (!proofImage) {
            setError('Vui lòng tải ảnh chứng minh khoản nạp.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            const result = await topUpFund({ amount: parsedAmount, reason: trimmedReason, proofImage });
            toast.success(`Đã nạp ${formatCurrency(result.amount)} vào quỹ hệ thống.`);
            onSuccess();
            onClose();
        } catch (err) {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(message || 'Không thể nạp quỹ. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="payout-modal-overlay" onClick={handleClose} role="presentation">
            <form
                className="payout-modal-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="topup-fund-title"
                aria-describedby="topup-fund-description"
                onClick={(event) => event.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <header className="payout-modal-header">
                    <div className="payout-modal-title-group">
                        <span className="payout-modal-icon success material-symbols-outlined" aria-hidden="true">
                            savings
                        </span>
                        <div>
                            <h2 id="topup-fund-title">Nạp quỹ hệ thống</h2>
                            <p id="topup-fund-description">
                                Xác nhận tiền thật đã sẵn sàng để dùng cho chuyển tiền chủ động.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="payout-modal-close"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        aria-label="Đóng modal"
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </header>

                <div className="payout-modal-body">
                    <div className="payout-modal-alert warning" role="note">
                        <span className="material-symbols-outlined" aria-hidden="true">info</span>
                        <p>
                            Số tiền được cộng thẳng vào quỹ ngay khi bạn xác nhận — không có bước duyệt thứ hai.
                            Chỉ nạp khi bạn đã thực sự có/chuẩn bị sẵn khoản tiền này.
                        </p>
                    </div>

                    <label className="payout-modal-field" htmlFor="topup-amount">
                        <span>Số tiền (đ)</span>
                        <input
                            id="topup-amount"
                            className="payout-modal-input"
                            type="number"
                            min={1000}
                            step={1000}
                            placeholder="Ví dụ: 2000000"
                            value={amount}
                            onChange={(event) => {
                                setAmount(event.target.value);
                                if (error) setError('');
                            }}
                            disabled={isSubmitting}
                            required
                        />
                        {amount && !amountInvalid && <small>{formatCurrency(parsedAmount)}</small>}
                    </label>

                    <label className="payout-modal-field" htmlFor="topup-reason">
                        <span>Lý do nạp quỹ</span>
                        <textarea
                            id="topup-reason"
                            className="payout-modal-textarea"
                            rows={3}
                            maxLength={500}
                            value={reason}
                            onChange={(event) => {
                                setReason(event.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ví dụ: Ngân sách bồi thường/thưởng tháng 8/2026 do ban điều hành phê duyệt."
                            disabled={isSubmitting}
                            required
                        />
                        <small>Tối thiểu {MIN_REASON} ký tự.</small>
                    </label>

                    <label className="payout-modal-field" htmlFor="topup-proof">
                        <span>Ảnh chứng minh</span>
                        <input
                            id="topup-proof"
                            className="payout-modal-file-input"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                if (file && file.size > MAX_IMAGE_BYTES) {
                                    setProofImage(null);
                                    setError('Ảnh không được vượt quá 5 MB.');
                                    event.target.value = '';
                                    return;
                                }
                                setProofImage(file);
                                if (error) setError('');
                            }}
                            disabled={isSubmitting}
                            required
                        />
                        <small>JPG, PNG hoặc WEBP, tối đa 5 MB — vd sao kê hoặc ảnh tiền mặt. Chỉ người có quyền mới xem được.</small>
                        {proofPreviewUrl && (
                            <img
                                className="payout-proof-image"
                                src={proofPreviewUrl}
                                alt="Xem trước ảnh chứng minh"
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
                        disabled={isSubmitting}
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="admin-ui-button admin-ui-button-success"
                        disabled={isSubmitting || amountInvalid || reason.trim().length < MIN_REASON || !proofImage}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">
                            {isSubmitting ? 'progress_activity' : 'savings'}
                        </span>
                        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận nạp quỹ'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default TopUpFundModal;
