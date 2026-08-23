import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { FlatUserDetail } from '../userTypes';
import { getRoleDisplay } from '../roleDisplay';
import { apiErrorMessage } from '../../../utils/apiError';

const MIN_REASON = 15;
const DURATION_PRESETS = [3, 7, 14, 30, 60, 90];

interface SuspendUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: FlatUserDetail | null;
    onSuspend: (userId: string, reason: string, durationDays: number) => Promise<void>;
}

const SuspendUserModal = ({ isOpen, onClose, user, onSuspend }: SuspendUserModalProps) => {
    const [reason, setReason] = useState('');
    const [durationDays, setDurationDays] = useState(7);
    const [durationDaysText, setDurationDaysText] = useState('7');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setReason('');
        setDurationDays(7);
        setDurationDaysText('7');
        setError('');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!isOpen || !user) return null;

    const tooShort = reason.trim().length < MIN_REASON;
    const durationInvalid = durationDays < 1 || durationDays > 365;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const handleSuspend = async () => {
        if (tooShort) {
            setError(`Lý do tạm ngưng phải có ít nhất ${MIN_REASON} ký tự.`);
            return;
        }
        if (durationInvalid) {
            setError('Thời gian tạm ngưng phải từ 1 đến 365 ngày.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onSuspend(user.userid, reason.trim(), durationDays);
            toast.success(`Đã tạm ngưng hồ sơ ${user.fullname} trong ${durationDays} ngày`);
            onClose();
        } catch (err) {
            console.error('Error suspending user:', err);
            toast.error(apiErrorMessage(err, 'Không thể tạm ngưng hồ sơ. Vui lòng thử lại.'));
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
                aria-labelledby="suspend-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="um-modal-head">
                    <div className="um-modal-head-main">
                        <h3 id="suspend-dialog-title" className="um-modal-title um-modal-title-danger">
                            <span className="material-symbols-outlined">pause_circle</span>
                            Tạm ngưng hồ sơ gia sư
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
                            <p className="um-identity-sub">
                                {getRoleDisplay(user.primaryrole).label} • {user.email}
                            </p>
                        </div>
                        {user.suspensioncount > 0 && (
                            <span className="um-badge um-badge-danger">{user.suspensioncount} lần</span>
                        )}
                    </div>

                    <div className="um-field">
                        <span className="um-label">
                            Thời gian tạm ngưng <span className="um-req">*</span>
                        </span>
                        <div className="um-chips">
                            {DURATION_PRESETS.map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    className={`um-chip ${durationDays === days ? 'um-chip-active' : ''}`}
                                    onClick={() => {
                                        setDurationDays(days);
                                        setDurationDaysText(String(days));
                                        setError('');
                                    }}
                                >
                                    {days} ngày
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="um-grid-2">
                        <div className="um-field">
                            <label className="um-label" htmlFor="susp-days">
                                Số ngày tuỳ chỉnh
                            </label>
                            <input
                                id="susp-days"
                                className={`um-input ${durationInvalid ? 'um-input-error' : ''}`}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={durationDaysText}
                                onChange={(e) => {
                                    // Bỏ ký tự không phải số và số 0 thừa ở đầu (để "1" không hiển thành "01").
                                    const digitsOnly = e.target.value.replace(/\D/g, '');
                                    const normalized = digitsOnly.replace(/^0+(?=\d)/, '');
                                    setDurationDaysText(normalized);
                                    setDurationDays(normalized === '' ? 0 : parseInt(normalized, 10));
                                    setError('');
                                }}
                            />
                            <p className="um-hint">Từ 1 đến 365 ngày.</p>
                        </div>

                        <div className="um-field">
                            <span className="um-label">Dự kiến kết thúc</span>
                            <input
                                className="um-input"
                                value={durationInvalid ? '—' : endDate.toLocaleDateString('vi-VN')}
                                disabled
                            />
                            <p className="um-hint">Hồ sơ tự mở lại sau ngày này.</p>
                        </div>
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="susp-reason">
                            Lý do tạm ngưng <span className="um-req">*</span>
                            <span className="um-counter">
                                {reason.trim().length}/{MIN_REASON}
                            </span>
                        </label>
                        <textarea
                            id="susp-reason"
                            className={`um-textarea ${error && tooShort ? 'um-textarea-error' : ''}`}
                            rows={3}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ví dụ: Nhiều khiếu nại từ học viên về chất lượng buổi học và thái độ giảng dạy trong tháng qua."
                        />
                        {error && <p className="um-error">{error}</p>}
                    </div>

                    <div className="um-callout um-callout-warn" style={{ marginBottom: 0 }}>
                        <span className="material-symbols-outlined">info</span>
                        <div>
                            <p className="um-callout-title">Lưu ý</p>
                            <p className="um-callout-text">
                                Tạm ngưng trên 30 ngày sẽ khoá tài khoản; dưới 30 ngày chỉ ẩn hồ sơ khỏi marketplace.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="um-modal-foot">
                    <button className="um-btn um-btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Hủy
                    </button>
                    <button
                        className="um-btn um-btn-danger"
                        onClick={handleSuspend}
                        disabled={isSubmitting || tooShort || durationInvalid}
                    >
                        <span className="material-symbols-outlined">pause_circle</span>
                        {isSubmitting ? 'Đang xử lý…' : `Tạm ngưng ${durationDays} ngày`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuspendUserModal;
