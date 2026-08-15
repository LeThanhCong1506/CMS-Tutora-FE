import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { CloseDisputeOutcome } from '../../../types/admin.types';

const MIN_NOTE = 10;

/**
 * Trạng thái buổi học sau khi đóng phản ánh. Bắt buộc phải chọn vì buổi đang ở "disputed" sẽ kẹt
 * vĩnh viễn nếu không đặt lại — SettlementService từ chối quyết toán mọi buổi không ở
 * pending_confirmation/completed, nên gia sư sẽ không bao giờ nhận được tiền buổi đó.
 */
const OUTCOMES: { value: CloseDisputeOutcome; title: string; desc: string }[] = [
    {
        value: 'completed',
        title: 'Tính là đã học xong',
        desc: 'Buổi học vẫn được tính, gia sư nhận đủ tiền buổi đó như bình thường.',
    },
    {
        value: 'reschedule',
        title: 'Học lại buổi này',
        desc: 'Buổi trở về trạng thái chờ học, xoá điểm danh lần trước, chưa quyết toán tiền.',
    },
];

interface CloseDisputeModalProps {
    isOpen: boolean;
    onClose: () => void;
    disputeId: string | number;
    onConfirm: (outcome: CloseDisputeOutcome, note: string) => Promise<void>;
}

const CloseDisputeModal = ({ isOpen, onClose, disputeId, onConfirm }: CloseDisputeModalProps) => {
    const [outcome, setOutcome] = useState<CloseDisputeOutcome>('completed');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setOutcome('completed');
        setNote('');
        setError('');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!isOpen) return null;

    const tooShort = note.trim().length < MIN_NOTE;

    const handleConfirm = async () => {
        if (tooShort) {
            setError(`Ghi chú phải có ít nhất ${MIN_NOTE} ký tự.`);
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onConfirm(outcome, note.trim());
            toast.success('Đã đóng phản ánh do hai bên hoà giải.');
            onClose();
        } catch (err) {
            console.error('Error closing dispute:', err);
            toast.error('Không thể đóng phản ánh. Vui lòng thử lại.');
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
                aria-labelledby="close-dispute-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="um-modal-head">
                    <div className="um-modal-head-main">
                        <h3 id="close-dispute-dialog-title" className="um-modal-title">
                            <span className="material-symbols-outlined">handshake</span>
                            Đóng phản ánh #{disputeId}
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
                        Dùng khi hai bên đã tự dàn xếp với nhau và muốn học tiếp. Không phân xử ai đúng ai
                        sai và không hoàn tiền cho phụ huynh. Nếu cần quyết định hoàn tiền, hãy dùng phần
                        &ldquo;Ra quyết định&rdquo; bên dưới thay vì đóng ở đây.
                    </p>

                    <div className="um-field">
                        <span className="um-label">
                            Buổi học bị phản ánh xử lý thế nào <span className="um-req">*</span>
                        </span>
                        <div className="um-options">
                            {OUTCOMES.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    className={`um-option ${outcome === item.value ? 'um-option-active' : ''}`}
                                    onClick={() => setOutcome(item.value)}
                                >
                                    <div>
                                        <div className="um-option-title">{item.title}</div>
                                        <div className="um-option-desc">{item.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="close-dispute-note">
                            Nội dung hai bên đã thống nhất <span className="um-req">*</span>
                        </label>
                        <textarea
                            id="close-dispute-note"
                            className="um-textarea"
                            rows={4}
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="Ví dụ: Gia sư và phụ huynh đã trao đổi lại, thống nhất tiếp tục học và rút phản ánh."
                            disabled={isSubmitting}
                        />
                        <span className="um-hint">Tối thiểu {MIN_NOTE} ký tự. Nội dung này được gửi cho người tạo phản ánh.</span>
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
                        {isSubmitting ? 'Đang xử lý…' : 'Đóng phản ánh'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloseDisputeModal;
