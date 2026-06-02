import { useState } from 'react';
import { toast } from 'react-toastify';

interface IssueWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorId: string;
    tutorName: string;
    disputeId: string;
    onIssueWarning: (disputeId: string, tutorId: string, reason: string, severity: 'low' | 'medium' | 'high') => Promise<void>;
}

const IssueWarningModal = ({
    isOpen,
    onClose,
    tutorId,
    tutorName,
    disputeId,
    onIssueWarning,
}: IssueWarningModalProps) => {
    const [reason, setReason] = useState('');
    const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        // Validation
        if (reason.trim().length < 10) {
            setError('Lý do phải có ít nhất 10 ký tự');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onIssueWarning(disputeId, tutorId, reason, severity);
            toast.success(`Đã gửi cảnh báo đến ${tutorName}`);
            onClose();
            // Reset form
            setReason('');
            setSeverity('medium');
        } catch (err) {
            console.error('Error issuing warning:', err);
            toast.error('Không thể gửi cảnh báo. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="vetting-modal-overlay" onClick={onClose}>
            <div className="vetting-rejection-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Gửi cảnh báo đến gia sư</h3>
                <p style={{ marginBottom: '20px' }}>
                    Bạn đang gửi cảnh báo đến <strong>{tutorName}</strong>. Cảnh báo sẽ được ghi vào hồ sơ gia sư.
                </p>

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
                        Mức độ nghiêm trọng
                    </label>
                    <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value as 'low' | 'medium' | 'high')}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                        }}
                    >
                        <option value="low">Thấp - Vi phạm nhỏ</option>
                        <option value="medium">Trung bình - Vi phạm đáng chú ý</option>
                        <option value="high">Cao - Vi phạm nghiêm trọng</option>
                    </select>
                </div>

                <div>
                    <label
                        style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#64748b',
                            marginBottom: '8px',
                        }}
                    >
                        Lý do cảnh báo (tối thiểu 10 ký tự)
                    </label>
                    <textarea
                        className="vetting-rejection-textarea"
                        rows={4}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                        }}
                        placeholder="Mô tả chi tiết lý do cảnh báo..."
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
                        className="vetting-btn vetting-btn-danger"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Đang gửi...' : 'Gửi cảnh báo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IssueWarningModal;
