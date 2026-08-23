import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getAllUsers } from '../../../services/admin.service';
import { transferToUser } from '../../../services/adminPayout.service';
import { formatCurrency } from '../../../utils/formatters';
import type { UserListItem } from '../../../types/admin.types';
import { apiErrorMessage } from '../../../utils/apiError';

const MIN_REASON = 10;
const SEARCH_DEBOUNCE_MS = 350;

// Chỉ 3 role này được nhận chuyển tiền chủ động — admin/staff bị loại để tránh chuyển
// nhầm cho chính đồng nghiệp. BE cũng hard-validate lại điều này, đây chỉ là lọc hiển thị.
const RECEIVABLE_ROLES: UserListItem['primaryrole'][] = ['tutor', 'parent', 'student'];

const ROLE_LABEL: Record<string, string> = {
    tutor: 'Gia sư',
    parent: 'Phụ huynh',
    student: 'Học sinh',
};

interface TransferMoneyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TransferMoneyModal = ({ isOpen, onClose, onSuccess }: TransferMoneyModalProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<UserListItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [recipient, setRecipient] = useState<UserListItem | null>(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setSearchTerm('');
        setSearchResults([]);
        setRecipient(null);
        setAmount('');
        setReason('');
        setError('');
    }, [isOpen]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        if (!isOpen || recipient) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const term = searchTerm.trim();
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const { users } = await getAllUsers({ searchTerm: term, pageSize: 8, pageNumber: 1 });
                setSearchResults(users.filter((u) => RECEIVABLE_ROLES.includes(u.primaryrole)));
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchTerm, isOpen, recipient]);

    if (!isOpen) return null;

    const parsedAmount = Number(amount);
    const amountInvalid = !amount || Number.isNaN(parsedAmount) || parsedAmount < 1000;
    const reasonTooShort = reason.trim().length < MIN_REASON;
    const canSubmit = Boolean(recipient) && !amountInvalid && !reasonTooShort;

    const handleSubmit = async () => {
        if (!recipient) {
            setError('Vui lòng chọn người nhận.');
            return;
        }
        if (amountInvalid) {
            setError('Số tiền phải từ 1.000đ trở lên.');
            return;
        }
        if (reasonTooShort) {
            setError(`Lý do phải có ít nhất ${MIN_REASON} ký tự.`);
            return;
        }

        try {
            setIsSubmitting(true);
            setError('');
            const result = await transferToUser({
                recipientUserId: recipient.userid,
                amount: parsedAmount,
                reason: reason.trim(),
            });
            toast.success(
                `Đã chuyển ${formatCurrency(result.amount)} cho ${result.recipientName || recipient.fullname}.`,
            );
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error transferring money:', err);
            toast.error(apiErrorMessage(err, 'Không thể chuyển tiền. Vui lòng thử lại.'));
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
                aria-labelledby="transfer-money-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="um-modal-head">
                    <div className="um-modal-head-main">
                        <h3 id="transfer-money-title" className="um-modal-title">
                            <span className="material-symbols-outlined">send_money</span>
                            Chuyển tiền chủ động
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
                    <div className="um-field">
                        <label className="um-label" htmlFor="transfer-recipient">
                            Người nhận <span className="um-req">*</span>
                        </label>

                        {recipient ? (
                            <div className="um-identity" style={{ marginBottom: 0 }}>
                                <div
                                    className="um-identity-avatar"
                                    style={{ backgroundImage: recipient.avatarurl ? `url('${recipient.avatarurl}')` : undefined }}
                                />
                                <div className="um-identity-main">
                                    <p className="um-identity-name">{recipient.fullname}</p>
                                    <p className="um-identity-sub">
                                        {ROLE_LABEL[recipient.primaryrole] || recipient.primaryrole} • {recipient.email}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="um-chip"
                                    onClick={() => {
                                        setRecipient(null);
                                        setSearchTerm('');
                                    }}
                                    disabled={isSubmitting}
                                >
                                    Đổi
                                </button>
                            </div>
                        ) : (
                            <>
                                <input
                                    id="transfer-recipient"
                                    className="um-textarea"
                                    style={{ minHeight: 'auto' }}
                                    placeholder="Nhập tên, email hoặc số điện thoại..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoComplete="off"
                                />
                                {searching && <p className="um-hint">Đang tìm...</p>}
                                {!searching && searchTerm.trim().length >= 2 && searchResults.length === 0 && (
                                    <p className="um-hint">Không tìm thấy gia sư/phụ huynh/học sinh phù hợp.</p>
                                )}
                                {searchResults.length > 0 && (
                                    <div className="um-chips" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                        {searchResults.map((u) => (
                                            <button
                                                key={u.userid}
                                                type="button"
                                                className="um-chip"
                                                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                                                onClick={() => {
                                                    setRecipient(u);
                                                    setError('');
                                                }}
                                            >
                                                <strong>{u.fullname}</strong>
                                                &nbsp;— {ROLE_LABEL[u.primaryrole] || u.primaryrole} • {u.email}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="transfer-amount">
                            Số tiền (đ) <span className="um-req">*</span>
                        </label>
                        <input
                            id="transfer-amount"
                            type="number"
                            min={1000}
                            step={1000}
                            className="um-textarea"
                            style={{ minHeight: 'auto' }}
                            placeholder="Ví dụ: 100000"
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                if (error) setError('');
                            }}
                        />
                        {amount && !amountInvalid && (
                            <p className="um-hint">{formatCurrency(parsedAmount)}</p>
                        )}
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="transfer-reason">
                            Lý do <span className="um-req">*</span>
                            <span className="um-counter">
                                {reason.trim().length}/{MIN_REASON}
                            </span>
                        </label>
                        <textarea
                            id="transfer-reason"
                            className="um-textarea"
                            rows={3}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="Ví dụ: Bồi thường sự cố kỹ thuật ngày 05/08 theo thỏa thuận với người dùng."
                        />
                        {error ? (
                            <p className="um-error">{error}</p>
                        ) : (
                            <p className="um-hint">
                                Tiền được cộng thẳng vào ví trong app ngay khi bạn xác nhận — không có bước duyệt
                                thứ hai. Lý do này chỉ lưu nội bộ để đối chiếu sau này.
                            </p>
                        )}
                    </div>
                </div>

                <div className="um-modal-foot">
                    <button className="um-btn um-btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Hủy
                    </button>
                    <button
                        className="um-btn um-btn-primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !canSubmit}
                    >
                        <span className="material-symbols-outlined">send_money</span>
                        {isSubmitting ? 'Đang xử lý…' : 'Xác nhận chuyển tiền'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferMoneyModal;
