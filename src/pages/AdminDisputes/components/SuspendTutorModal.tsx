import { useState } from 'react';
import { toast } from 'react-toastify';

interface SuspendTutorModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorId: string;
    tutorName: string;
    onSuspend: (tutorId: string, reason: string, durationDays: number) => Promise<void>;
}

const SuspendTutorModal = ({
    isOpen,
    onClose,
    tutorId,
    tutorName,
    onSuspend,
}: SuspendTutorModalProps) => {
    const [reason, setReason] = useState('');
    const [durationDays, setDurationDays] = useState(7);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        // Validation
        if (reason.trim().length < 20) {
            setError('Lý do phải có ít nhất 20 ký tự');
            return;
        }

        if (durationDays < 1 || durationDays > 365) {
            setError('Thời gian đình chỉ phải từ 1-365 ngày');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onSuspend(tutorId, reason, durationDays);
            toast.success(`Đã đình chỉ tài khoản ${tutorName} trong ${durationDays} ngày`);
            onClose();
            // Reset form
            setReason('');
            setDurationDays(7);
        } catch (err) {
            console.error('Error suspending tutor:', err);
            toast.error('Không thể đình chỉ tài khoản. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="vetting-modal-overlay" onClick={onClose}>
            <div className="vetting-rejection-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Đình chỉ hồ sơ gia sư</h3>
                <p style={{ marginBottom: '20px', color: '#dc2626' }}>
                    ⚠️ Hành động này sẽ tạm dừng toàn bộ hoạt động của gia sư <strong>{tutorName}</strong>.
                    Tất cả buổi học đã đặt sẽ bị hủy và học viên sẽ được hoàn tiền.
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
                        Thời gian đình chỉ (ngày)
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={durationDays}
                            onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                            }}
                        />
                        <select
                            value={durationDays}
                            onChange={(e) => setDurationDays(parseInt(e.target.value))}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                            }}
                        >
                            <option value="7">7 ngày</option>
                            <option value="14">14 ngày</option>
                            <option value="30">30 ngày</option>
                            <option value="90">90 ngày</option>
                            <option value="180">180 ngày</option>
                            <option value="365">365 ngày</option>
                        </select>
                    </div>
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
                        Lý do đình chỉ (tối thiểu 20 ký tự)
                    </label>
                    <textarea
                        className="vetting-rejection-textarea"
                        rows={5}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                        }}
                        placeholder="Mô tả chi tiết lý do đình chỉ hồ sơ gia sư..."
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
                        {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đình chỉ'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuspendTutorModal;
