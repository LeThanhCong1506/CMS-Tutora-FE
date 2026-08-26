import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { FlatUserDetail } from '../userTypes';
import { getRoleDisplay } from '../roleDisplay';
import { apiErrorMessage } from '../../../utils/apiError';
import { getSuspensionImpact, type SuspensionRefundImpact } from '../../../services/admin.service';

const MIN_REASON = 15;

/** 0 = vô thời hạn: không tự mở lại, admin phải bấm Mở khóa. */
const INDEFINITE = 0;
const DURATION_PRESETS = [3, 7, 14, 30, INDEFINITE];
const MIN_DAYS = 1;
const MAX_DAYS = 365;

const presetLabel = (days: number) => (days === INDEFINITE ? 'Vô thời hạn' : `${days} ngày`);

const formatVnd = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

interface SuspendUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: FlatUserDetail | null;
    /** `durationDays === 0` means indefinite — the page maps that to a permanent suspension. */
    onSuspend: (userId: string, reason: string, durationDays: number) => Promise<void>;
}

/**
 * The single "Tạm ngưng" action.
 *
 * It used to be two buttons — a fixed-term suspension and an open-ended block — sitting side by
 * side with no visible difference, which left operators guessing. They are the same decision with
 * a different end date, so they are one form now, and the duration chip carries the distinction.
 */
const SuspendUserModal = ({ isOpen, onClose, user, onSuspend }: SuspendUserModalProps) => {
    const [reason, setReason] = useState('');
    const [durationDays, setDurationDays] = useState(7);
    const [customDays, setCustomDays] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [impact, setImpact] = useState<SuspensionRefundImpact | null>(null);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setReason('');
        setDurationDays(7);
        setCustomDays('');
        setError('');
        setImpact(null);
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const isIndefinite = !customDays && durationDays === INDEFINITE;
    const durationInvalid = !isIndefinite && (durationDays < MIN_DAYS || durationDays > MAX_DAYS);

    // Suspending cancels the account's upcoming sessions and refunds the payers, so price that before
    // the operator commits — and re-price on every duration change, since a longer suspension
    // reaches further into the calendar.
    const userId = user?.userid;
    useEffect(() => {
        if (!isOpen || !userId || durationInvalid) return;

        let cancelled = false;
        const timer = setTimeout(() => {
            getSuspensionImpact(userId, durationDays)
                .then((result) => {
                    if (!cancelled) setImpact(result);
                })
                .catch((err) => {
                    // A missing preview must not block the suspension itself.
                    console.error('Error loading suspension impact:', err);
                    if (!cancelled) setImpact(null);
                });
        }, 300); // typing a custom number should not fire one request per digit

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [isOpen, userId, durationDays, durationInvalid]);

    if (!isOpen || !user) return null;

    const tooShort = reason.trim().length < MIN_REASON;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const handleSuspend = async () => {
        if (durationInvalid) {
            setError(`Số ngày phải từ ${MIN_DAYS} đến ${MAX_DAYS}.`);
            return;
        }
        if (tooShort) {
            setError(`Lý do cần ít nhất ${MIN_REASON} ký tự.`);
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onSuspend(user.userid, reason.trim(), durationDays);
            toast.success(
                isIndefinite
                    ? `Đã tạm ngưng ${user.fullname} vô thời hạn`
                    : `Đã tạm ngưng ${user.fullname} ${durationDays} ngày`,
            );
            onClose();
        } catch (err) {
            console.error('Error suspending user:', err);
            toast.error(apiErrorMessage(err, 'Không thể tạm ngưng tài khoản.'));
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
                            Tạm ngưng tài khoản
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
                        {user.suspensioncount > 0 && (
                            <span className="um-badge um-badge-danger">{user.suspensioncount} lần</span>
                        )}
                    </div>

                    <div className="um-field">
                        <span className="um-label">
                            Thời hạn <span className="um-req">*</span>
                        </span>
                        <div className="um-chips">
                            {DURATION_PRESETS.map((days) => (
                                <button
                                    key={days}
                                    type="button"
                                    className={`um-chip ${durationDays === days && !customDays ? 'um-chip-active' : ''}`}
                                    onClick={() => {
                                        setDurationDays(days);
                                        setCustomDays('');
                                        setError('');
                                    }}
                                >
                                    {presetLabel(days)}
                                </button>
                            ))}
                            <span className="um-chip-input">
                                <input
                                    className={durationInvalid ? 'um-input-error' : ''}
                                    type="text"
                                    inputMode="numeric"
                                    aria-label="Số ngày tùy chỉnh"
                                    placeholder="Khác"
                                    value={customDays}
                                    onChange={(e) => {
                                        // Digits only, and no leading zero so "7" cannot read as "07".
                                        const digits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
                                        setCustomDays(digits);
                                        setDurationDays(digits === '' ? 7 : parseInt(digits, 10));
                                        setError('');
                                    }}
                                />
                                <span>ngày</span>
                            </span>
                        </div>
                        <p className={durationInvalid ? 'um-error' : 'um-hint'}>
                            {durationInvalid
                                ? `Từ ${MIN_DAYS} đến ${MAX_DAYS} ngày.`
                                : isIndefinite
                                  ? 'Không tự mở lại — cần bấm Mở khóa.'
                                  : `Tự mở lại ngày ${endDate.toLocaleDateString('vi-VN')}.`}
                        </p>
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="susp-reason">
                            Lý do <span className="um-req">*</span>
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
                            placeholder="Ví dụ: Nhiều khiếu nại về chất lượng buổi học trong tháng qua."
                        />
                        {error && <p className="um-error">{error}</p>}
                    </div>

                    {/* Money leaves escrow the moment this is confirmed — show the bill, not a warning to read. */}
                    {impact && impact.bookingsAffected > 0 && (
                        <div className="um-callout um-callout-warn" style={{ marginBottom: 0 }}>
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                            <div>
                                <p className="um-callout-text">
                                    Sẽ hủy <strong>{impact.sessionsCancelled} buổi</strong> và hoàn{' '}
                                    <strong>{formatVnd(impact.totalRefunded)}</strong> cho người đã thanh toán.
                                </p>
                            </div>
                        </div>
                    )}
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
                        {isSubmitting ? 'Đang xử lý…' : 'Tạm ngưng'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuspendUserModal;
