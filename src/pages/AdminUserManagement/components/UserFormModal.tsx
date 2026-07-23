import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { createUser, updateUser } from '../../../services/admin.service';
import { getRoleDisplay } from '../roleDisplay';
import type { FlatUserDetail } from '../mockData';

// Roles an admin may create through this modal. Internal accounts (Staff/Admin)
// have their own flow, so they are intentionally excluded here.
const CUSTOMER_ROLES = ['Student', 'Parent', 'Tutor'] as const;
type CustomerRole = (typeof CUSTOMER_ROLES)[number];

// Mirror of the backend password rule (8+ chars, upper, lower, digit, special)
// so the user gets immediate feedback instead of a round-trip 400.
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RULE = /^0\d{9}$/; // Vietnamese mobile: leading 0 + 9 digits

interface UserFormModalProps {
    isOpen: boolean;
    mode: 'create' | 'edit';
    /** The user being edited (edit mode only). */
    user?: FlatUserDetail | null;
    /** Pre-selected / fixed role for create (from a role-scoped view). */
    lockedRole?: CustomerRole;
    onClose: () => void;
    /** Called after a successful save so the parent can refetch the list. */
    onSaved: () => void | Promise<void>;
}

const UserFormModal = ({ isOpen, mode, user, lockedRole, onClose, onSaved }: UserFormModalProps) => {
    const isCreate = mode === 'create';

    const [fullname, setFullname] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<CustomerRole>(lockedRole ?? 'Student');

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset / prefill the form each time the modal opens. Syncing controlled
    // inputs to the incoming props on open is the intended use here.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOpen) return;
        setErrors({});
        setShowPassword(false);
        if (isCreate) {
            setFullname('');
            setEmail('');
            setPhone('');
            setPassword('');
            setRole(lockedRole ?? 'Student');
        } else if (user) {
            setFullname(user.fullname ?? '');
            // Tài khoản đăng ký qua social/SĐT có email placeholder do hệ thống sinh
            // ra — hiển thị trống để admin không vô tình lưu lại rác.
            setEmail(user.email?.includes('@tutora') || user.email?.includes('no-email') ? '' : (user.email ?? ''));
            setPhone(user.phone ?? '');
        }
    }, [isOpen, isCreate, user, lockedRole]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!isOpen) return null;

    const validate = (): boolean => {
        const next: Record<string, string> = {};

        if (!fullname.trim()) next.fullname = 'Vui lòng nhập họ tên.';
        else if (fullname.trim().length > 100) next.fullname = 'Họ tên không được vượt quá 100 ký tự.';

        if (email.trim() && !EMAIL_RULE.test(email.trim())) next.email = 'Email không đúng định dạng.';

        if (isCreate) {
            if (!phone.trim()) next.phone = 'Vui lòng nhập số điện thoại.';
            else if (!PHONE_RULE.test(phone.trim())) next.phone = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0.';

            if (!password) next.password = 'Vui lòng nhập mật khẩu.';
            else if (!PASSWORD_RULE.test(password))
                next.password = 'Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';
        } else if (phone.trim() && !PHONE_RULE.test(phone.trim())) {
            next.phone = 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0.';
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            if (isCreate) {
                await createUser({
                    fullname: fullname.trim(),
                    email: email.trim() || undefined,
                    phone: phone.trim(),
                    password,
                    role,
                });
                toast.success(`Đã tạo tài khoản ${getRoleDisplay(role).label.toLowerCase()} “${fullname.trim()}”`);
            } else if (user) {
                await updateUser(user.userid, {
                    fullname: fullname.trim(),
                    email: email.trim() || undefined,
                    phone: phone.trim() || undefined,
                });
                toast.success(`Đã cập nhật thông tin ${fullname.trim()}`);
            }
            await onSaved();
            onClose();
        } catch (err: unknown) {
            // Surface the backend's message when present (duplicate phone/email, etc.).
            const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(apiMessage || (isCreate ? 'Không thể tạo tài khoản.' : 'Không thể cập nhật tài khoản.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const roleLocked = isCreate && Boolean(lockedRole);

    return (
        <div
            className="um-overlay"
            onClick={onClose}
            onKeyDown={(event) => event.key === 'Escape' && !isSubmitting && onClose()}
        >
            <div
                className="um-modal um-modal-md"
                role="dialog"
                aria-modal="true"
                aria-labelledby="user-form-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="um-modal-head">
                    <div className="um-modal-head-main">
                        <h3 id="user-form-dialog-title" className="um-modal-title">
                            <span className="material-symbols-outlined">{isCreate ? 'person_add' : 'edit'}</span>
                            {isCreate ? 'Thêm người dùng' : 'Chỉnh sửa người dùng'}
                        </h3>
                        <p className="um-modal-sub">
                            {isCreate
                                ? 'Tài khoản được kích hoạt ngay và đăng nhập bằng số điện thoại.'
                                : 'Cập nhật thông tin cơ bản. Để trống email nếu không muốn thay đổi.'}
                        </p>
                    </div>
                    <button type="button" className="um-modal-close" onClick={onClose} aria-label="Đóng">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="um-modal-body">
                    {/* Khi sửa: nhắc lại đang sửa ai để tránh nhầm hàng. */}
                    {!isCreate && user && (
                        <div className="um-identity">
                            <div
                                className="um-identity-avatar"
                                style={{ backgroundImage: `url('${user.avatarurl}')` }}
                            />
                            <div className="um-identity-main">
                                <p className="um-identity-name">{user.fullname}</p>
                                <p className="um-identity-sub">
                                    {getRoleDisplay(user.primaryrole).label} • {user.userid}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="um-field">
                        <label className="um-label" htmlFor="uf-fullname">
                            Họ và tên <span className="um-req">*</span>
                        </label>
                        <input
                            id="uf-fullname"
                            className={`um-input ${errors.fullname ? 'um-input-error' : ''}`}
                            value={fullname}
                            onChange={(e) => setFullname(e.target.value)}
                            placeholder="Nguyễn Văn A"
                        />
                        {errors.fullname && <p className="um-error">{errors.fullname}</p>}
                    </div>

                    <div className="um-grid-2">
                        <div className="um-field">
                            <label className="um-label" htmlFor="uf-role">
                                Vai trò {isCreate && <span className="um-req">*</span>}
                            </label>
                            {isCreate ? (
                                <select
                                    id="uf-role"
                                    className="um-input"
                                    value={role}
                                    disabled={roleLocked}
                                    onChange={(e) => setRole(e.target.value as CustomerRole)}
                                >
                                    {CUSTOMER_ROLES.map((r) => (
                                        <option key={r} value={r}>
                                            {getRoleDisplay(r).label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    id="uf-role"
                                    className="um-input"
                                    value={getRoleDisplay(user?.primaryrole).label}
                                    disabled
                                />
                            )}
                            {roleLocked && <p className="um-hint">Cố định theo danh sách đang mở.</p>}
                            {!isCreate && <p className="um-hint">Đổi vai trò có chức năng riêng.</p>}
                        </div>

                        <div className="um-field">
                            <label className="um-label" htmlFor="uf-phone">
                                Số điện thoại {isCreate && <span className="um-req">*</span>}
                            </label>
                            <input
                                id="uf-phone"
                                className={`um-input ${errors.phone ? 'um-input-error' : ''}`}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="0901234567"
                                inputMode="numeric"
                            />
                            {errors.phone && <p className="um-error">{errors.phone}</p>}
                        </div>
                    </div>

                    <div className="um-field">
                        <label className="um-label" htmlFor="uf-email">
                            Email{' '}
                            {isCreate && (
                                <span className="um-hint" style={{ display: 'inline' }}>
                                    (tùy chọn)
                                </span>
                            )}
                        </label>
                        <input
                            id="uf-email"
                            className={`um-input ${errors.email ? 'um-input-error' : ''}`}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            type="email"
                        />
                        {errors.email && <p className="um-error">{errors.email}</p>}
                    </div>

                    {isCreate && (
                        <div className="um-field">
                            <label className="um-label" htmlFor="uf-password">
                                Mật khẩu <span className="um-req">*</span>
                                <button
                                    type="button"
                                    className="um-counter"
                                    style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                                    onClick={() => setShowPassword((v) => !v)}
                                >
                                    {showPassword ? 'Ẩn' : 'Hiện'}
                                </button>
                            </label>
                            <input
                                id="uf-password"
                                className={`um-input ${errors.password ? 'um-input-error' : ''}`}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                            />
                            {errors.password ? (
                                <p className="um-error">{errors.password}</p>
                            ) : (
                                <p className="um-hint">
                                    Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="um-modal-foot">
                    <button className="um-btn um-btn-secondary" onClick={onClose} disabled={isSubmitting}>
                        Hủy
                    </button>
                    <button className="um-btn um-btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                        <span className="material-symbols-outlined">{isCreate ? 'person_add' : 'save'}</span>
                        {isSubmitting ? 'Đang lưu…' : isCreate ? 'Tạo tài khoản' : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserFormModal;
