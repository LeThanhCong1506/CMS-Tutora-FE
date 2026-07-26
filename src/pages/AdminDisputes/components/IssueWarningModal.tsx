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
            toast.success(`Đã gửi nhắc nhở đến ${tutorName}`);
            onClose();
            // Reset form
            setReason('');
            setSeverity('medium');
        } catch (err) {
            console.error('Error issuing warning:', err);
            toast.error('Không thể gửi nhắc nhở. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="vetting-modal-overlay" onClick={onClose}>
            <div className="vetting-rejection-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Gửi nhắc nhở đến gia sư</h3>
                <p style={{ marginBottom: '20px' }}>
                    Nội dung nhắc nhở dành cho <strong>{tutorName}</strong> sẽ được lưu trong hồ sơ để tiện theo dõi.
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
                        Mức độ theo dõi
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
                        <option value="low">Mức 1 - Nhắc nhở</option>
                        <option value="medium">Mức 2 - Cần theo dõi</option>
                        <option value="high">Mức 3 - Cần ưu tiên xem xét</option>
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
                        Nội dung nhắc nhở (tối thiểu 10 ký tự)
                    </label>
                    <textarea
                        className="vetting-rejection-textarea"
                        rows={4}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                        }}
                        placeholder="Mô tả nội dung cần gia sư lưu ý..."
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
                        {isSubmitting ? 'Đang gửi...' : 'Gửi nhắc nhở'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IssueWarningModal;
