import { useEffect, useState } from 'react';
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
        if (!proofImage) {
            setProofPreviewUrl(null);
            return undefined;
        }
        const objectUrl = URL.createObjectURL(proofImage);
        setProofPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [proofImage]);

    if (!isOpen) return null;

    const parsedAmount = Number(amount);
    const amountInvalid = !amount || Number.isNaN(parsedAmount) || parsedAmount < 1000;
    const reasonTooShort = reason.trim().length < MIN_REASON;
    const canSubmit = !amountInvalid && !reasonTooShort && Boolean(proofImage);

    const handleSubmit = async () => {
        if (amountInvalid) {
            setError('Số tiền phải từ 1.000đ trở lên.');
            return;
        }
        if (reasonTooShort) {
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
            const result = await topUpFund({
                amount: parsedAmount,
                reason: reason.trim(),
                proofImage,
            });
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
        <div
            className="um-overlay"
            onClick={() => !isSubmitting && onClose()}
            onKeyDown={(event) => event.key === 'Escape' && !isSubmitting && onClose()}
        >
            <div
                className="um-modal um-modal-md"
                role="dialog"
                aria-modal="true"
                aria-labelledby="topup-fund-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="um-modal-head">
                    <div className="um-modal-head-main">
                        <h3 id="topup-fund-title" className="um-modal-title">
                            <span className="material-symbols-outlined">savings</span>
                            Nạp quỹ hệ thống
                        </h3>
                    </div>
                    <button
                        type="button"
                        className="um-modal-close"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="Đóng"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="um-modal-body">
                    <div className="um-field">
                        <label className="um-label" htmlFor="topup-amount">
                            Số tiền (đ) <span className="um-req">*</span>
                        </label>
                        <input
                            id="topup-amount"
                            type="number"
                            min={1000}
                            step={1000}
                            className="um-textarea"
                            style={{ minHeight: 'auto' }}
                            placeholder="Ví dụ: 2000000"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                if (error) setError('');
                            }}
                        />
                        {amount && !amountInvalid && (
                            <p className="um-hint">{formatCurrency(parsedAmount)}</p>
                        )}
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="topup-reason">
                            Lý do nạp quỹ <span className="um-req">*</span>
                            <span className="um-counter">
                                {reason.trim().length}/{MIN_REASON}
                            </span>
                        </label>
                        <textarea
                            id="topup-reason"
                            className="um-textarea"
                            rows={3}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ví dụ: Ngân sách bồi thường/thưởng tháng 8/2026 do ban điều hành phê duyệt."
                        />
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="topup-proof">
                            Ảnh chứng minh <span className="um-req">*</span>
                        </label>
                        <input
                            id="topup-proof"
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
                        />
                        <p className="um-hint">
                            JPG, PNG hoặc WEBP, tối đa 5 MB — vd sao kê hoặc ảnh chuẩn bị tiền mặt. Ảnh được lưu ở
                            chế độ riêng tư, chỉ người có quyền mới xem được.
                        </p>
                        {proofPreviewUrl && (
                            <img
                                src={proofPreviewUrl}
                                alt="Xem trước ảnh chứng minh"
                                style={{ marginTop: 8, maxWidth: '100%', maxHeight: 220, borderRadius: 6 }}
                            />
                        )}
                    </div>

                    {error && <p className="um-error">{error}</p>}
                </div>

                <div className="um-modal-foot">
                    <button className="um-btn um-btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Hủy
                    </button>
                    <button
                        className="um-btn um-btn-primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !canSubmit}
                    >
                        <span className="material-symbols-outlined">savings</span>
                        {isSubmitting ? 'Đang xử lý…' : 'Xác nhận nạp quỹ'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TopUpFundModal;
