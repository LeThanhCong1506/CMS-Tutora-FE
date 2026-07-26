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

    const CONFIRM_PHRASE = 'NGỪNG QUYỀN TRUY CẬP';

    const handleSubmit = async () => {
        // Validation
        if (reason.trim().length < 30) {
            setError('Vui lòng cung cấp lý do có ít nhất 30 ký tự');
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
            toast.success(`Đã cập nhật quyền truy cập của ${userName}`);
            onClose();
            // Reset form
            setReason('');
            setConfirmText('');
        } catch (err) {
            console.error('Error locking account:', err);
            toast.error('Không thể cập nhật quyền truy cập. Vui lòng thử lại.');
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
                <h3 style={{ color: '#7f1d1d' }}>Ngừng quyền truy cập tài khoản</h3>
                <div
                    style={{
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}
                >
                    <p style={{ margin: 0, color: '#9a3412', fontWeight: 600, fontSize: '14px' }}>
                        Lưu ý trước khi xác nhận
                    </p>
                    <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#9a3412', fontSize: '13px' }}>
                        <li>Tài khoản <strong>{userName}</strong> sẽ ngừng quyền truy cập lâu dài</li>
                        <li>Người dùng sẽ không thể đăng nhập sau khi cập nhật</li>
                        <li>Các buổi học đã đặt sẽ được cập nhật trạng thái</li>
                        <li>Số dư trong ví sẽ được hoàn trả theo chính sách</li>
                        <li>Chỉ nên áp dụng sau khi đã đối chiếu đầy đủ thông tin</li>
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
                        Lý do cập nhật quyền truy cập (tối thiểu 30 ký tự)
                    </label>
                    <textarea
                        className="vetting-rejection-textarea"
                        rows={5}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                        }}
                        placeholder="Mô tả thông tin đã đối chiếu và lý do áp dụng thay đổi..."
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
                        Để xác nhận, nhập "<strong>{CONFIRM_PHRASE}</strong>"
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
                        {isSubmitting ? 'Đang cập nhật...' : 'Xác nhận ngừng quyền truy cập'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LockAccountConfirmDialog;
