import { useState } from 'react';
import { toast } from 'react-toastify';
import type { WithdrawalRequest } from '../../../types/admin.types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';

interface ApproveWithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    withdrawal: WithdrawalRequest | null;
    onApprove: (withdrawalId: string) => Promise<void>;
}

const ApproveWithdrawalModal = ({ isOpen, onClose, withdrawal, onApprove }: ApproveWithdrawalModalProps) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleApprove = async () => {
        if (!withdrawal) return;

        try {
            setIsSubmitting(true);
            await onApprove(withdrawal.withdrawalid);
            toast.success(`Đã phê duyệt rút tiền ${formatCurrency(withdrawal.amount)} cho ${withdrawal.tutorname}`);
            onClose();
        } catch (err) {
            console.error('Error approving withdrawal:', err);
            toast.error('Không thể phê duyệt yêu cầu. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !withdrawal) return null;

    return (
        <div className="vetting-modal-overlay" onClick={onClose}>
            <div
                className="vetting-rejection-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '550px' }}
            >
                <h3 style={{ color: '#166534' }}>✓ Xác nhận phê duyệt rút tiền</h3>
                <p style={{ marginBottom: '20px', color: '#475569' }}>
                    Bạn đang phê duyệt yêu cầu rút tiền. Vui lòng kiểm tra kỹ thông tin trước khi xác nhận.
                </p>

                {/* Withdrawal Details */}
                <div
                    style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Tutor Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    backgroundImage: `url('${withdrawal.tutoravatar}')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            ></div>
                            <div>
                                <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--color-navy)' }}>
                                    {withdrawal.tutorname}
                                </p>
                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                    {withdrawal.tutorsubject}
                                </p>
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                                Số tiền rút
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: 'var(--color-gold)',
                                }}
                            >
                                {formatCurrency(withdrawal.amount)}
                            </p>
                        </div>

                        {/* Bank Details */}
                        <div>
                            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                                Thông tin ngân hàng
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="material-symbols-outlined" style={{ color: 'var(--color-navy)' }}>
                                    account_balance
                                </span>
                                <div>
                                    <p style={{ margin: '0 0 2px', fontWeight: 600, color: 'var(--color-navy)' }}>
                                        {withdrawal.bankname}
                                    </p>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: '13px',
                                            color: '#64748b',
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        {withdrawal.bankaccountfull}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Request Date */}
                        <div>
                            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                                Ngày yêu cầu
                            </p>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-navy)' }}>
                                {formatDateTime(withdrawal.requestedat)}
                            </p>
                        </div>

                        {/* Withdrawal ID */}
                        <div>
                            <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                                Mã yêu cầu
                            </p>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '14px',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    color: 'var(--color-navy)',
                                }}
                            >
                                {withdrawal.withdrawalid}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Warning Message */}
                <div
                    style={{
                        background: '#dcfce7',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '20px',
                    }}
                >
                    <p style={{ margin: 0, fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                        <strong>Lưu ý:</strong> Sau khi phê duyệt, tiền sẽ được chuyển đến tài khoản ngân hàng của gia
                        sư trong vòng 1-3 ngày làm việc. Hành động này không thể hoàn tác.
                    </p>
                </div>

                {/* Actions */}
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
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        style={{
                            background: '#166534',
                            color: '#ffffff',
                        }}
                    >
                        {isSubmitting ? 'Đang xử lý...' : '✓ Xác nhận phê duyệt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApproveWithdrawalModal;
