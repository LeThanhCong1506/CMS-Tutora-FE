import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { FlatUserDetail } from '../mockData';
import { getRoleDisplay } from '../roleDisplay';

const MIN_REASON = 20;

const COMMON_REASONS = [
    'Vi phạm quy định nền tảng nhiều lần',
    'Lừa đảo hoặc gian lận',
    'Hành vi quấy rối hoặc lạm dụng',
    'Tài khoản giả mạo hoặc spam',
];

interface BlockUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: FlatUserDetail | null;
    onBlock: (userId: string, reason: string) => Promise<void>;
}

const BlockUserModal = ({ isOpen, onClose, user, onBlock }: BlockUserModalProps) => {
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

    if (!isOpen || !user) return null;

    const tooShort = reason.trim().length < MIN_REASON;

    const handleBlock = async () => {
        if (tooShort) {
            setError(`Lý do chặn phải có ít nhất ${MIN_REASON} ký tự.`);
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onBlock(user.userid, reason.trim());
            toast.success(`Đã chặn tài khoản ${user.fullname}`);
            onClose();
        } catch (err) {
            console.error('Error blocking user:', err);
            toast.error('Không thể chặn tài khoản. Vui lòng thử lại.');
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
                aria-labelledby="block-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="um-modal-head">
                    <div className="um-modal-head-main">
                        <h3 id="block-dialog-title" className="um-modal-title um-modal-title-danger">
                            <span className="material-symbols-outlined">block</span>
                            Chặn tài khoản
                        </h3>
                        <p className="um-modal-sub">
                            Người dùng sẽ không thể đăng nhập, đặt lớp hoặc nhận thanh toán. Có thể mở khoá lại sau.
                        </p>
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
                        {user.warningcount > 0 && (
                            <span className="um-badge um-badge-warning">{user.warningcount} cảnh cáo</span>
                        )}
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="block-reason">
                            Lý do chặn <span className="um-req">*</span>
                            <span className="um-counter">
                                {reason.trim().length}/{MIN_REASON}
                            </span>
                        </label>
                        <textarea
                            id="block-reason"
                            className={`um-textarea ${error ? 'um-textarea-error' : ''}`}
                            rows={4}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ví dụ: Vi phạm nghiêm trọng quy định nền tảng nhiều lần, đã có 3 khiếu nại từ học viên về thái độ và hủy buổi học đột ngột."
                        />
                        {error ? (
                            <p className="um-error">{error}</p>
                        ) : (
                            <p className="um-hint">Lý do này được ghi vào hồ sơ và gửi tới người dùng.</p>
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
                    <button className="um-btn um-btn-danger" onClick={handleBlock} disabled={isSubmitting || tooShort}>
                        <span className="material-symbols-outlined">block</span>
                        {isSubmitting ? 'Đang xử lý…' : 'Xác nhận chặn'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlockUserModal;
