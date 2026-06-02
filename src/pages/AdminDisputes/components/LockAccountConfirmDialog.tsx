import { useState } from 'react';
import { toast } from 'react-toastify';

interface LockAccountConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    onLockAccount: (userId: string, reason: string) => Promise<void>;
}

const LockAccountConfirmDialog = ({
    isOpen,
    onClose,
    userId,
    userName,
    onLockAccount,
}: LockAccountConfirmDialogProps) => {
    const [reason, setReason] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const CONFIRM_PHRASE = 'KHÓA TÀI KHOẢN';

    const handleSubmit = async () => {
        // Validation
        if (reason.trim().length < 30) {
            setError('Lý do phải có ít nhất 30 ký tự vì đây là hành động nghiêm trọng');
            return;
        }

        if (confirmText !== CONFIRM_PHRASE) {
            setError(`Vui lòng nhập chính xác "${CONFIRM_PHRASE}" để xác nhận`);
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onLockAccount(userId, reason);
            toast.success(`Đã khóa tài khoản ${userName}`);
            onClose();
            // Reset form
            setReason('');
            setConfirmText('');
        } catch (err) {
            console.error('Error locking account:', err);
            toast.error('Không thể khóa tài khoản. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="vetting-modal-overlay" onClick={onClose}>
            <div
                className="vetting-rejection-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '550px' }}
            >
                <h3 style={{ color: '#991b1b' }}>⚠️ Khóa tài khoản vĩnh viễn</h3>
                <div
                    style={{
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}
                >
                    <p style={{ margin: 0, color: '#991b1b', fontWeight: 600, fontSize: '14px' }}>
                        🛑 CẢNH BÁO: Đây là hành động không thể hoàn tác!
                    </p>
                    <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#991b1b', fontSize: '13px' }}>
                        <li>Tài khoản <strong>{userName}</strong> sẽ bị khóa vĩnh viễn</li>
                        <li>Người dùng sẽ không thể đăng nhập trở lại</li>
                        <li>Tất cả buổi học đã đặt sẽ bị hủy ngay lập tức</li>
                        <li>Số dư trong ví sẽ được hoàn trả theo chính sách</li>
                        <li>Hành động này chỉ dành cho vi phạm nghiêm trọng</li>
                    </ul>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label
                        style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#64748b',
                            marginBottom: '8px',
                        }}
                    >
                        Lý do khóa tài khoản (tối thiểu 30 ký tự)
                    </label>
                    <textarea
                        className="vetting-rejection-textarea"
                        rows={5}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                        }}
                        placeholder="Mô tả chi tiết vi phạm nghiêm trọng dẫn đến quyết định khóa tài khoản..."
                        style={{ borderColor: error && reason.length < 30 ? '#dc2626' : '#e2e8f0' }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label
                        style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#64748b',
                            marginBottom: '8px',
                        }}
                    >
                        Xác nhận hành động - Nhập "<strong>{CONFIRM_PHRASE}</strong>"
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => {
                            setConfirmText(e.target.value);
                            setError('');
                        }}
                        placeholder={CONFIRM_PHRASE}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: `2px solid ${error && confirmText !== CONFIRM_PHRASE ? '#dc2626' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                        }}
                    />
                    {error && <p className="vetting-error-message">{error}</p>}
                </div>

                <div className="vetting-rejection-footer">
                    <button
                        className="vetting-btn vetting-btn-secondary"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Hủy
                    </button>
                    <button
                        className="vetting-btn"
                        onClick={handleSubmit}
                        disabled={isSubmitting || confirmText !== CONFIRM_PHRASE}
                        style={{
                            background: '#991b1b',
                            color: '#ffffff',
                            opacity: confirmText !== CONFIRM_PHRASE ? 0.5 : 1,
                        }}
                    >
                        {isSubmitting ? 'Đang khóa...' : '🔒 Khóa tài khoản vĩnh viễn'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LockAccountConfirmDialog;
