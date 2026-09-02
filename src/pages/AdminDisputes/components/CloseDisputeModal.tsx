import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { CloseDisputeOutcome } from '../../../types/admin.types';
import { apiErrorMessage } from '../../../utils/apiError';

const MIN_NOTE = 10;

/**
 * Đóng phản ánh do hai bên hoà giải chỉ còn MỘT kết quả: buổi tính là đã học xong.
 *
 * "Học lại buổi này" và "Bỏ phản ánh, giữ nguyên buổi học" đã được gỡ khỏi giao diện. Backend vẫn
 * nhận hai giá trị đó nhưng không còn đường nào gọi tới.
 *
 * Buổi BẮT BUỘC phải rời trạng thái "disputed" ở bước này: SettlementService từ chối quyết toán mọi
 * buổi không ở pending_confirmation/completed, nên bỏ qua thì gia sư không bao giờ nhận được tiền
 * buổi đó.
 */
const OUTCOME: CloseDisputeOutcome = 'completed';

interface CloseDisputeModalProps {
    isOpen: boolean;
    onClose: () => void;
    disputeId: string | number;
    onConfirm: (outcome: CloseDisputeOutcome, note: string, relearnScheduledStart?: string) => Promise<void>;
}

const CloseDisputeModal = ({ isOpen, onClose, disputeId, onConfirm }: CloseDisputeModalProps) => {
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
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
            await onConfirm(OUTCOME, note.trim());
            toast.success('Đã đóng phản ánh do hai bên hoà giải.');
            onClose();
        } catch (err) {
            console.error('Error closing dispute:', err);
            toast.error(apiErrorMessage(err, 'Không thể đóng phản ánh. Vui lòng thử lại.'));
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
                    <div className="um-callout um-callout-warn">
                        <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                        <div>
                            <p className="um-callout-title">Không hoàn tiền, không phân xử đúng sai</p>
                            <p className="um-callout-text">
                                Cần hoàn tiền thì dùng &ldquo;Phương án xử lý&rdquo;.
                            </p>
                        </div>
                    </div>

                    {/* Chỉ còn một kết quả nên hiển thị như thẻ tóm tắt, không phải radio: radio
                        một lựa chọn thì không bấm được gì, chỉ tốn một dòng để đọc. */}
                    <div className="um-field">
                        <span className="um-label">Xử lý buổi học này</span>
                        <div className="um-option um-option-active" aria-hidden="true">
                            <span className="material-symbols-outlined um-option-mark">check_circle</span>
                            <div>
                                <div className="um-option-title">Tính là đã học xong</div>
                                <div className="um-option-desc">Gia sư nhận đủ tiền buổi đó.</div>
                            </div>
                        </div>
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="close-dispute-note">
                            Nội dung thống nhất <span className="um-req">*</span>
                            <span className="um-counter">
                                {note.trim().length}/{MIN_NOTE}
                            </span>
                        </label>
                        <textarea
                            id="close-dispute-note"
                            className="um-textarea"
                            rows={4}
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="Ví dụ: hai bên đã trao đổi lại, thống nhất tiếp tục học."
                            disabled={isSubmitting}
                        />
                        <span className="um-hint">Sẽ gửi cho người tạo phản ánh.</span>
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
