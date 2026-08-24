import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../utils/apiError';

const MIN_REASON = 10;

interface CancelGhostBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: number;
    onConfirm: (reason: string) => Promise<void>;
}

/**
 * Staff hủy booking sau khi xác minh NGOÀI hệ thống (qua tổng đài) rằng phụ huynh đã "nghỉ ngang".
 * Không gắn với luồng dispute nào — gia sư không cần thao tác gì trên hệ thống, chỉ gọi tổng đài.
 */
const CancelGhostBookingModal = ({
    isOpen,
    onClose,
    bookingId,
    onConfirm,
}: CancelGhostBookingModalProps) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setReason('');
        setError('');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!isOpen) return null;

    const tooShort = reason.trim().length < MIN_REASON;

    const handleConfirm = async () => {
        if (tooShort) {
            setError(`Lý do phải có ít nhất ${MIN_REASON} ký tự.`);
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onConfirm(reason.trim());
            toast.success('Đã hủy booking và giải ngân toàn bộ số tiền còn lại cho gia sư.');
            onClose();
        } catch (err) {
            console.error('Error cancelling ghost booking:', err);
            toast.error(apiErrorMessage(err, 'Không thể hủy booking. Vui lòng kiểm tra lại trạng thái booking rồi thử lại.'));
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
                aria-labelledby="cancel-ghost-booking-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="um-modal-head">
                    <div className="um-modal-head-main">
                        <h3 id="cancel-ghost-booking-dialog-title" className="um-modal-title">
                            <span className="material-symbols-outlined">person_off</span>
                            Hủy booking #{bookingId}
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
                    <p className="um-hint">
                        Chỉ dùng khi đã xác minh QUA TỔNG ĐÀI rằng phụ huynh không còn phản hồi/tham gia
                        buổi học (&ldquo;nghỉ ngang&rdquo;). Hành động này sẽ hủy booking:{' '}
                        <strong>gia sư giữ nguyên tiền các buổi đã dạy</strong>, các buổi{' '}
                        <strong>CHƯA dạy sẽ được hoàn lại cho phụ huynh</strong> (giá gốc, không gồm 5%
                        phí dịch vụ) — không thể hoàn tác.
                    </p>

                    <div className="um-field">
                        <label className="um-label" htmlFor="cancel-ghost-booking-reason">
                            Lý do hủy <span className="um-req">*</span>
                        </label>
                        <textarea
                            id="cancel-ghost-booking-reason"
                            className="um-textarea"
                            rows={4}
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Ví dụ: Đã gọi tổng đài xác minh phụ huynh không còn liên lạc được từ 2 tuần nay, gia sư đã chờ đúng lịch nhưng không có ai vào lớp."
                            disabled={isSubmitting}
                        />
                        <span className="um-hint">Tối thiểu {MIN_REASON} ký tự. Lý do này được lưu vào lịch sử booking.</span>
                    </div>

                    {error && <p className="um-error">{error}</p>}
                </div>

                <div className="um-modal-foot">
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Huỷ bỏ
                    </button>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-primary"
                        onClick={handleConfirm}
                        disabled={isSubmitting || tooShort}
                    >
                        {isSubmitting ? 'Đang xử lý…' : 'Xác nhận hủy booking'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CancelGhostBookingModal;
