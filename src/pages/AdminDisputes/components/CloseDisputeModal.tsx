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
        desc: 'Buổi học vẫn được tính, gia sư nhận đủ tiền buổi đó như bình thường.',
    },
    {
        value: 'reschedule',
        title: 'Học lại buổi này',
        desc: 'Buổi gốc chuyển "Đã hủy" (giữ nguyên dữ liệu, không xoá) — tạo 1 buổi học lại MỚI ở phòng học riêng, vào giờ bạn chọn dưới đây.',
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
                            {OUTCOMES.map((item) => {
                                const locked = item.value === 'reschedule' && !relearnAvailable;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        className={`um-option ${outcome === item.value ? 'um-option-active' : ''}`}
                                        onClick={() => !locked && setOutcome(item.value)}
                                        disabled={locked}
                                        title={locked ? 'Chuỗi buổi này đã học lại tối đa số lần cho phép — chỉ còn xử lý bằng hoàn tiền qua "Ra quyết định".' : undefined}
                                        style={locked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                                    >
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
                                Chuỗi buổi học này đã học lại tối đa số lần cho phép — không thể chọn &ldquo;Học lại buổi
                                này&rdquo; nữa. Nếu cần xử lý tiếp, hãy dùng phần &ldquo;Ra quyết định&rdquo; (hoàn tiền)
                                thay vì đóng ở đây.
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
                                <span className="um-hint">Phải ở tương lai. Đây là giờ cho buổi học lại mới, không sửa giờ buổi gốc.</span>
                            </div>
                        )}
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
