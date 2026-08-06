import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { AdminFeedbackItem } from '../../services/adminFeedback.service';

const MIN_REASON = 20;

const COMMON_REASONS = [
    'Nội dung xúc phạm, công kích cá nhân',
    'Ngôn từ thô tục, vi phạm chính sách cộng đồng',
    'Thông tin sai sự thật về gia sư',
    'Đánh giá spam hoặc không liên quan buổi học',
];

interface HideFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    feedback: AdminFeedbackItem | null;
    onHide: (feedbackId: number, reason: string) => Promise<void>;
}

/**
 * Nhập lý do trước khi ẩn một đánh giá. Lý do được gửi thẳng cho người viết qua thông báo
 * nên bắt buộc và phải đủ dài để họ hiểu vì sao.
 */
const HideFeedbackModal = ({ isOpen, onClose, feedback, onHide }: HideFeedbackModalProps) => {
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

    if (!isOpen || !feedback) return null;

    const tooShort = reason.trim().length < MIN_REASON;

    const handleHide = async () => {
        if (tooShort) {
            setError(`Lý do ẩn phải có ít nhất ${MIN_REASON} ký tự.`);
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onHide(feedback.feedbackId, reason.trim());
            onClose();
        } catch (err) {
            console.error('Error hiding feedback:', err);
            toast.error('Không thể ẩn đánh giá. Vui lòng thử lại.');
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
                aria-labelledby="hide-feedback-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="um-modal-head">
                    <div className="um-modal-head-main">
                        <h3 id="hide-feedback-title" className="um-modal-title um-modal-title-danger">
                            <span className="material-symbols-outlined">visibility_off</span>
                            Ẩn đánh giá
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
                    <div className="feedback-preview">
                        <div className="feedback-preview__head">
                            <span className="feedback-stars">
                                {'★'.repeat(feedback.rating)}
                                <span className="feedback-stars__dim">
                                    {'★'.repeat(Math.max(0, 5 - feedback.rating))}
                                </span>
                            </span>
                            <span className="feedback-preview__meta">
                                {feedback.parentName || 'Người học'} → {feedback.tutorName || 'Gia sư'}
                            </span>
                        </div>
                        <p className="feedback-preview__comment">
                            {feedback.comment || '(không có nhận xét)'}
                        </p>
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="hide-feedback-reason">
                            Lý do ẩn <span className="um-req">*</span>
                            <span className="um-counter">
                                {reason.trim().length}/{MIN_REASON}
                            </span>
                        </label>
                        <textarea
                            id="hide-feedback-reason"
                            className={`um-textarea ${error ? 'um-textarea-error' : ''}`}
                            rows={4}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ví dụ: Nhận xét chứa ngôn từ xúc phạm cá nhân gia sư, vi phạm chính sách cộng đồng của Tutora."
                        />
                        {error ? (
                            <p className="um-error">{error}</p>
                        ) : (
                            <p className="um-hint">
                                Lý do này được gửi tới người viết đánh giá. Gia sư cũng nhận được thông báo
                                và điểm trung bình sẽ được tính lại.
                            </p>
                        )}

                        <div className="um-chips">
                            {COMMON_REASONS.map((commonReason) => (
                                <button
                                    key={commonReason}
                                    type="button"
                                    className="um-chip"
                                    onClick={() => {
                                        setReason(commonReason);
                                        setError('');
                                    }}
                                >
                                    {commonReason}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="um-modal-foot">
                    <button className="um-btn um-btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Hủy
                    </button>
                    <button
                        className="um-btn um-btn-danger"
                        onClick={handleHide}
                        disabled={isSubmitting || tooShort}
                    >
                        <span className="material-symbols-outlined">visibility_off</span>
                        {isSubmitting ? 'Đang xử lý…' : 'Xác nhận ẩn'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HideFeedbackModal;
