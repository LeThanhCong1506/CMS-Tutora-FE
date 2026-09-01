import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { CloseDisputeOutcome } from '../../../types/admin.types';
import { apiErrorMessage } from '../../../utils/apiError';

const MIN_NOTE = 10;

const toLocalDateTimeInput = (date: Date): string => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
};

/**
 * Trạng thái buổi học sau khi đóng phản ánh. Bắt buộc phải chọn vì buổi đang ở "disputed" sẽ kẹt
 * vĩnh viễn nếu không đặt lại — SettlementService từ chối quyết toán mọi buổi không ở
 * pending_confirmation/completed, nên gia sư sẽ không bao giờ nhận được tiền buổi đó.
 */
const OUTCOMES: { value: CloseDisputeOutcome; title: string; desc: string }[] = [
    {
        value: 'completed',
        title: 'Tính là đã học xong',
        desc: 'Gia sư nhận đủ tiền buổi đó.',
    },
    {
        value: 'reschedule',
        title: 'Học lại buổi này',
        desc: 'Buổi gốc chuyển "Đã hủy" (dữ liệu vẫn giữ), tạo buổi học lại mới vào giờ bạn chọn.',
    },
    {
        value: 'keep_scheduled',
        title: 'Bỏ phản ánh, giữ nguyên buổi học',
        desc: 'Buổi về lại "Sắp diễn ra", hai bên vào lớp như bình thường. Không đụng tới tiền.',
    },
];

interface CloseDisputeModalProps {
    isOpen: boolean;
    onClose: () => void;
    disputeId: string | number;
    onConfirm: (outcome: CloseDisputeOutcome, note: string, relearnScheduledStart?: string) => Promise<void>;
    /** False khi chuỗi buổi (bù/phụ/học lại) chứa buổi này đã học lại tối đa số lần cho phép —
     * khoá hẳn lựa chọn "Học lại buổi này", chỉ còn "Tính là đã học xong" (bắt buộc xử lý hoàn
     * tiền qua "Ra quyết định" thay vì đóng ở đây). Mặc định true nếu không truyền. */
    relearnAvailable?: boolean;
}

const CloseDisputeModal = ({ isOpen, onClose, disputeId, onConfirm, relearnAvailable = true }: CloseDisputeModalProps) => {
    const [outcome, setOutcome] = useState<CloseDisputeOutcome>('completed');
    const [note, setNote] = useState('');
    const [relearnAt, setRelearnAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setOutcome('completed');
        setNote('');
        setRelearnAt('');
        setError('');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!isOpen) return null;

    const tooShort = note.trim().length < MIN_NOTE;
    const needsRelearnTime = outcome === 'reschedule';
    const relearnTimeMissing = needsRelearnTime && !relearnAt;

    const handleConfirm = async () => {
        if (tooShort) {
            setError(`Ghi chú phải có ít nhất ${MIN_NOTE} ký tự.`);
            return;
        }
        if (needsRelearnTime) {
            if (!relearnAt) {
                setError('Vui lòng chọn giờ học lại.');
                return;
            }
            if (new Date(relearnAt).getTime() <= Date.now()) {
                setError('Giờ học lại phải ở tương lai.');
                return;
            }
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onConfirm(outcome, note.trim(), needsRelearnTime ? new Date(relearnAt).toISOString() : undefined);
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

                    <div className="um-field">
                        <span className="um-label" id="close-dispute-outcome-label">
                            Xử lý buổi học này <span className="um-req">*</span>
                        </span>
                        <div className="um-options" role="radiogroup" aria-labelledby="close-dispute-outcome-label">
                            {OUTCOMES.map((item) => {
                                const locked = item.value === 'reschedule' && !relearnAvailable;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={outcome === item.value}
                                        className={`um-option ${outcome === item.value ? 'um-option-active' : ''}`}
                                        onClick={() => !locked && setOutcome(item.value)}
                                        disabled={locked}
                                        title={locked ? 'Buổi này đã học lại tối đa số lần cho phép.' : undefined}
                                        style={locked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                                    >
                                        <span className="material-symbols-outlined um-option-mark" aria-hidden="true">
                                            {outcome === item.value ? 'radio_button_checked' : 'radio_button_unchecked'}
                                        </span>
                                        <div>
                                            <div className="um-option-title">{item.title}</div>
                                            <div className="um-option-desc">{item.desc}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {!relearnAvailable && (
                            <p className="um-hint" style={{ color: '#b45309' }}>
                                Buổi này đã học lại tối đa số lần cho phép.
                            </p>
                        )}
                        {needsRelearnTime && (
                            <div className="um-field">
                                <label className="um-label" htmlFor="close-dispute-relearn-at">
                                    Giờ học lại <span className="um-req">*</span>
                                </label>
                                <input
                                    id="close-dispute-relearn-at"
                                    type="datetime-local"
                                    className="um-input"
                                    value={relearnAt}
                                    min={toLocalDateTimeInput(new Date())}
                                    onChange={(event) => setRelearnAt(event.target.value)}
                                    disabled={isSubmitting}
                                />
                                <span className="um-hint">Giờ của buổi học lại mới, phải ở tương lai.</span>
                            </div>
                        )}
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
                        disabled={isSubmitting || tooShort || relearnTimeMissing}
                    >
                        {isSubmitting ? 'Đang xử lý…' : 'Đóng phản ánh'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloseDisputeModal;
