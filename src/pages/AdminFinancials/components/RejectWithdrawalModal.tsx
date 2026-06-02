import { useState } from 'react';
import { toast } from 'react-toastify';
import type { WithdrawalRequest } from '../../../types/admin.types';
import { formatCurrency } from '../../../utils/formatters';

interface RejectWithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    withdrawal: WithdrawalRequest | null;
    onReject: (withdrawalId: string, reason: string) => Promise<void>;
}

const RejectWithdrawalModal = ({ isOpen, onClose, withdrawal, onReject }: RejectWithdrawalModalProps) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleReject = async () => {
        if (!withdrawal) return;

        // Validation
        if (reason.trim().length < 10) {
            setError('Lý do từ chối phải có ít nhất 10 ký tự');
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            await onReject(withdrawal.withdrawalid, reason);
            toast.success(`Đã từ chối yêu cầu rút tiền ${withdrawal.withdrawalid}`);
            onClose();
            // Reset form
            setReason('');
        } catch (err) {
            console.error('Error rejecting withdrawal:', err);
            toast.error('Không thể từ chối yêu cầu. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset form when modal closes
    const handleClose = () => {
        setReason('');
        setError('');
        onClose();
    };

    if (!isOpen || !withdrawal) return null;

    return (
        <div className="vetting-modal-overlay" onClick={handleClose}>
            <div
                className="vetting-rejection-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '550px' }}
            >
                <h3 style={{ color: '#991b1b' }}>✗ Từ chối yêu cầu rút tiền</h3>
                <p style={{ marginBottom: '20px', color: '#475569' }}>
                    Vui lòng cung cấp lý do rõ ràng cho việc từ chối yêu cầu rút tiền. Gia sư sẽ nhận được thông báo này.
                </p>

                {/* Withdrawal Summary */}
                <div
                    style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundImage: `url('${withdrawal.tutoravatar}')`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        ></div>
                        <div>
                            <p style={{ margin: '0 0 2px', fontWeight: 700, color: 'var(--color-navy)' }}>
                                {withdrawal.tutorname}
                            </p>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                {withdrawal.tutorsubject}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                        <div>
                            <p style={{ margin: '0 0 4px', color: '#64748b', fontWeight: 600 }}>Số tiền</p>
                            <p style={{ margin: 0, fontWeight: 700, color: '#991b1b' }}>
                                {formatCurrency(withdrawal.amount)}
                            </p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px', color: '#64748b', fontWeight: 600 }}>Mã yêu cầu</p>
                            <p style={{ margin: 0, fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-navy)' }}>
                                {withdrawal.withdrawalid}
                            </p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px', color: '#64748b', fontWeight: 600 }}>Ngân hàng</p>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-navy)' }}>
                                {withdrawal.bankname}
                            </p>
                        </div>
                        <div>
                            <p style={{ margin: '0 0 4px', color: '#64748b', fontWeight: 600 }}>Ngày yêu cầu</p>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-navy)' }}>
                                {new Date(withdrawal.requestedat).toLocaleDateString('vi-VN')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Reason Input */}
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
                        Lý do từ chối (tối thiểu 10 ký tự)
                    </label>
                    <textarea
                        className="vetting-rejection-textarea"
                        rows={5}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            setError('');
                        }}
                        placeholder="Ví dụ: Thông tin ngân hàng không khớp với hồ sơ đã đăng ký. Vui lòng cập nhật thông tin chính xác và gửi lại yêu cầu."
                        style={{ borderColor: error ? '#dc2626' : '#e2e8f0' }}
                    />
                    {error && <p className="vetting-error-message">{error}</p>}
                </div>

                {/* Common Reasons (Quick Select) */}
                <div style={{ marginTop: '16px', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                        Lý do phổ biến:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {[
                            'Thông tin ngân hàng không khớp',
                            'Số dư không đủ',
                            'Tài khoản đang bị đình chỉ',
                            'Cần xác minh danh tính bổ sung',
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
                        className="vetting-btn vetting-btn-danger"
                        onClick={handleReject}
                        disabled={isSubmitting || reason.trim().length < 10}
                        style={{ opacity: reason.trim().length < 10 ? 0.5 : 1 }}
                    >
                        {isSubmitting ? 'Đang xử lý...' : '✗ Xác nhận từ chối'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RejectWithdrawalModal;
