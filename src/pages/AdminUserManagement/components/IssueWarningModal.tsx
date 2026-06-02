import { useState } from 'react';
import { toast } from 'react-toastify';
import type { FlatUserDetail } from '../mockData';
import { getRoleDisplay } from '../roleDisplay';

interface IssueWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: FlatUserDetail | null;
    onIssue: (userId: string, reason: string, severity: string, relatedBookingId?: string) => Promise<void>;
}

const IssueWarningModal = ({ isOpen, onClose, user, onIssue }: IssueWarningModalProps) => {
    const [reason, setReason] = useState('');
    const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
    const [relatedBookingId, setRelatedBookingId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleIssue = async () => {
        if (!user) return;

        // Validation
        if (reason.trim().length < 10) {
            setError('Lý do cảnh cáo phải có ít nhất 10 ký tự');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onIssue(
                user.userid,
                reason,
                severity,
                relatedBookingId.trim() || undefined
            );
            toast.success(`Đã cảnh cáo ${user.fullname}`);
            onClose();
            // Reset form
            setReason('');
            setSeverity('medium');
            setRelatedBookingId('');
        } catch (err) {
            console.error('Error issuing warning:', err);
            toast.error('Không thể cảnh cáo. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset form when modal closes
    const handleClose = () => {
        setReason('');
        setSeverity('medium');
        setRelatedBookingId('');
        setError('');
        onClose();
    };

    if (!isOpen || !user) return null;

    return (
        <div className="vetting-modal-overlay" onClick={handleClose}>
            <div
                className="vetting-rejection-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '550px' }}
            >
                <div className="vetting-rejection-body">
                <h3 style={{ color: '#92400e' }}>⚠️ Cảnh cáo người dùng</h3>
                <p style={{ marginBottom: '20px', color: '#475569' }}>
                    Cảnh cáo sẽ được ghi vào hồ sơ người dùng và họ sẽ nhận được thông báo. Nhiều cảnh cáo có thể dẫn
                    đến tạm ngưng hoặc chặn tài khoản.
                </p>

                {/* User Summary */}
                <div
                    style={{
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundImage: `url('${user.avatarurl}')`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        ></div>
                        <div>
                            <p style={{ margin: '0 0 2px', fontWeight: 700, color: 'var(--color-navy)' }}>
                                {user.fullname}
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                {getRoleDisplay(user.primaryrole).label} • Hiện có {user.warningcount}{' '}
                                cảnh cáo
                            </p>
                        </div>
                    </div>
                </div>

                {/* Severity Select */}
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
                        Mức độ nghiêm trọng *
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => setSeverity('low')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: severity === 'low' ? '2px solid #64748b' : '2px solid #e2e8f0',
                                borderRadius: '8px',
                                background: severity === 'low' ? '#f1f5f9' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                                Thấp
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Nhắc nhở nhẹ</div>
                        </button>
                        <button
                            onClick={() => setSeverity('medium')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: severity === 'medium' ? '2px solid #ea580c' : '2px solid #e2e8f0',
                                borderRadius: '8px',
                                background: severity === 'medium' ? '#fef3c7' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ea580c', marginBottom: '4px' }}>
                                Trung bình
                            </div>
                            <div style={{ fontSize: '11px', color: '#92400e' }}>Cảnh cáo chính thức</div>
                        </button>
                        <button
                            onClick={() => setSeverity('high')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: severity === 'high' ? '2px solid #dc2626' : '2px solid #e2e8f0',
                                borderRadius: '8px',
                                background: severity === 'high' ? '#fee2e2' : '#ffffff',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>
                                Cao
                            </div>
                            <div style={{ fontSize: '11px', color: '#991b1b' }}>Vi phạm nghiêm trọng</div>
                        </button>
                    </div>
                </div>

                {/* Reason Input */}
                <div style={{ marginBottom: '16px' }}>
                    <label
                        style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#64748b',
                            marginBottom: '8px',
                        }}
                    >
                        Lý do cảnh cáo (tối thiểu 10 ký tự) *
                    </label>
                    <textarea
                        className="vetting-rejection-textarea"
                        rows={4}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                        }}
                        placeholder="Ví dụ: Đến muộn buổi học 30 phút mà không thông báo trước cho học viên."
                        style={{ borderColor: error ? '#dc2626' : '#e2e8f0' }}
                    />
                    {error && <p className="vetting-error-message">{error}</p>}
                </div>

                {/* Common Reasons */}
                <div style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                        Lý do phổ biến:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {[
                            'Đến muộn không báo trước',
                            'Hủy buổi học vào phút chót',
                            'Không hoàn thành buổi học đầy đủ',
                            'Thái độ không phù hợp',
                        ].map((commonReason) => (
                            <button
                                key={commonReason}
                                onClick={() => setReason(commonReason)}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    background: '#ffffff',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#ffffff';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                {commonReason}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Related Booking ID (Optional) */}
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
                        Mã đặt lớp liên quan (tùy chọn)
                    </label>
                    <input
                        type="text"
                        value={relatedBookingId}
                        onChange={(e) => setRelatedBookingId(e.target.value)}
                        placeholder="Ví dụ: BK-5521"
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '2px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'monospace',
                        }}
                    />
                </div>

                </div>{/* /.vetting-rejection-body */}

                {/* Actions */}
                <div className="vetting-rejection-footer">
                    <button
                        className="vetting-btn vetting-btn-secondary"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Hủy
                    </button>
                    <button
                        className="vetting-btn"
                        onClick={handleIssue}
                        disabled={isSubmitting || reason.trim().length < 10}
                        style={{
                            opacity: reason.trim().length < 10 ? 0.5 : 1,
                            background: '#fbbf24',
                            color: '#78350f',
                            border: '2px solid #f59e0b',
                        }}
                    >
                        {isSubmitting ? 'Đang xử lý...' : '⚠️ Xác nhận cảnh cáo'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IssueWarningModal;
