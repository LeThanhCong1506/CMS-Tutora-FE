import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { FlatUserDetail } from '../userTypes';
import { getRoleDisplay } from '../roleDisplay';
import { apiErrorMessage } from '../../../utils/apiError';

const MIN_REASON = 10;

type Severity = 'low' | 'medium' | 'high';

/**
 * Khớp 1-1 với WarningLevel bên BE (1 = Thấp, 2 = Trung bình, 3 = Cao).
 * Thấp/Trung bình chỉ tạm ngưng khi tích lũy đủ 3 lần trong 30 ngày; Cao tạm
 * ngưng ngay nên phải nói rõ hậu quả trên nút chọn.
 */
const SEVERITIES: { value: Severity; title: string; desc: string }[] = [
    { value: 'low', title: 'Thấp', desc: 'Nhắc nhở nhẹ' },
    { value: 'medium', title: 'Trung bình', desc: 'Cảnh cáo chính thức' },
    { value: 'high', title: 'Cao', desc: 'Tạm ngưng tài khoản ngay lập tức' },
];

const COMMON_REASONS = [
    'Đến muộn không báo trước',
    'Hủy buổi học vào phút chót',
    'Không hoàn thành buổi học đầy đủ',
    'Thái độ không phù hợp',
];

interface IssueWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: FlatUserDetail | null;
    onIssue: (userId: string, reason: string, severity: string, relatedBookingId?: string) => Promise<void>;
    /** Optional booking context supplied by callers such as the dispute detail page. */
    defaultRelatedBookingId?: string;
}

const IssueWarningModal = ({
    isOpen,
    onClose,
    user,
    onIssue,
    defaultRelatedBookingId = '',
}: IssueWarningModalProps) => {
    const [reason, setReason] = useState('');
    const [severity, setSeverity] = useState<Severity>('medium');
    const [relatedBookingId, setRelatedBookingId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setReason('');
        setSeverity('medium');
        setRelatedBookingId(defaultRelatedBookingId);
        setError('');
    }, [defaultRelatedBookingId, isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!isOpen || !user) return null;

    const tooShort = reason.trim().length < MIN_REASON;

    const handleIssue = async () => {
        if (tooShort) {
            setError(`Lý do cảnh cáo phải có ít nhất ${MIN_REASON} ký tự.`);
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onIssue(user.userid, reason.trim(), severity, relatedBookingId.trim() || undefined);
            toast.success(`Đã cảnh cáo ${user.fullname}`);
            onClose();
        } catch (err) {
            console.error('Error issuing warning:', err);
            toast.error(apiErrorMessage(err, 'Không thể cảnh cáo. Vui lòng thử lại.'));
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
                aria-labelledby="warning-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="um-modal-head">
                    <div className="um-modal-head-main">
                        <h3 id="warning-dialog-title" className="um-modal-title um-modal-title-warn">
                            <span className="material-symbols-outlined">warning</span>
                            Cảnh cáo người dùng
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
                    <div className="um-identity">
                        <div className="um-identity-avatar" style={{ backgroundImage: `url('${user.avatarurl}')` }} />
                        <div className="um-identity-main">
                            <p className="um-identity-name">{user.fullname}</p>
                            <p className="um-identity-sub">{getRoleDisplay(user.primaryrole).label}</p>
                        </div>
                        <span className={`um-badge ${user.warningcount > 0 ? 'um-badge-warning' : 'um-badge-neutral'}`}>
                            {user.warningcount} cảnh cáo
                        </span>
                    </div>

                    <div className="um-field">
                        <span className="um-label">
                            Mức độ nghiêm trọng <span className="um-req">*</span>
                        </span>
                        <div className="um-options um-severity-options">
                            {SEVERITIES.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    className={`um-option ${severity === item.value ? 'um-option-active' : ''}`}
                                    onClick={() => setSeverity(item.value)}
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
                        <label className="um-label" htmlFor="warn-reason">
                            Lý do cảnh cáo <span className="um-req">*</span>
                            <span className="um-counter">
                                {reason.trim().length}/{MIN_REASON}
                            </span>
                        </label>
                        <textarea
                            id="warn-reason"
                            className={`um-textarea ${error ? 'um-textarea-error' : ''}`}
                            rows={3}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ví dụ: Đến muộn buổi học 30 phút mà không thông báo trước cho học viên."
                        />
                        {error && <p className="um-error">{error}</p>}

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

                    <div className="um-field">
                        <label className="um-label" htmlFor="warn-booking">
                            Mã đặt lớp liên quan (tùy chọn)
                        </label>
                        <input
                            id="warn-booking"
                            className="um-input"
                            type="text"
                            value={relatedBookingId}
                            onChange={(e) => setRelatedBookingId(e.target.value)}
                            placeholder="Ví dụ: BK-5521"
                        />
                    </div>
                </div>

                <div className="um-modal-foot">
                    <button className="um-btn um-btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Hủy
                    </button>
                    <button className="um-btn um-btn-warn" onClick={handleIssue} disabled={isSubmitting || tooShort}>
                        <span className="material-symbols-outlined">warning</span>
                        {isSubmitting ? 'Đang xử lý…' : 'Xác nhận cảnh cáo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IssueWarningModal;
