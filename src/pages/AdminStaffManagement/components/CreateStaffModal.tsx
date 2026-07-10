import { useState } from 'react';
import { toast } from 'react-toastify';
import InputGroup from '../../../components/InputGroup/InputGroup';
import { createStaff, getCreateStaffErrorMessage } from '../../../services/staff.service';
import type { CreateStaffRequest } from '../../../types/staff.types';

interface CreateStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Gọi sau khi tạo thành công để trang cha refresh danh sách. */
    onCreated: () => void;
}

// Chỉ giữ trường tối thiểu để nhân viên đăng nhập được — hồ sơ cá nhân
// (ngày sinh, giới tính, địa chỉ, avatar) nhân viên tự cập nhật sau.
interface StaffForm {
    fullname: string;
    username: string;
    email: string;
    password: string;
    phone: string;
}

type FormErrors = Partial<Record<keyof StaffForm, string>>;

const EMPTY_FORM: StaffForm = {
    fullname: '',
    username: '',
    email: '',
    password: '',
    phone: '',
};

// Khớp ràng buộc password của BE: >= 8 ký tự, đủ hoa/thường/số/ký tự đặc biệt.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate toàn bộ form phía client — phản chiếu ràng buộc BE để bắt lỗi sớm. */
function validate(form: StaffForm): FormErrors {
    const errors: FormErrors = {};

    if (!form.fullname.trim()) errors.fullname = 'Vui lòng nhập họ tên.';
    else if (form.fullname.trim().length > 100) errors.fullname = 'Họ tên không vượt quá 100 ký tự.';

    // Username tùy chọn — nhân viên đăng nhập bằng email nếu không có.
    if (form.username.trim() && (form.username.trim().length < 3 || form.username.trim().length > 50))
        errors.username = 'Tên đăng nhập từ 3 đến 50 ký tự.';

    if (!form.email.trim()) errors.email = 'Vui lòng nhập email.';
    else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Email không đúng định dạng.';

    if (!form.password) errors.password = 'Vui lòng nhập mật khẩu.';
    else if (!PASSWORD_REGEX.test(form.password))
        errors.password = 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&).';

    // Phone là trường tùy chọn — chỉ validate định dạng khi có nhập.
    const phoneDigits = form.phone.replace(/[\s.-]/g, '');
    if (form.phone.trim() && !/^\+?\d{9,15}$/.test(phoneDigits))
        errors.phone = 'Số điện thoại không hợp lệ.';

    return errors;
}

const CreateStaffModal = ({ isOpen, onClose, onCreated }: CreateStaffModalProps) => {
    const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
    const [errors, setErrors] = useState<FormErrors>({});
    const [serverError, setServerError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const setField = (key: keyof StaffForm) => (value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        // Xoá lỗi của trường đang gõ + banner lỗi server (nếu có).
        setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
        if (serverError) setServerError('');
    };

    const resetAndClose = () => {
        setForm(EMPTY_FORM);
        setErrors({});
        setServerError('');
        onClose();
    };

    const handleSubmit = async () => {
        const nextErrors = validate(form);
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        const phoneDigits = form.phone.replace(/[\s.-]/g, '');
        const username = form.username.trim();
        const payload: CreateStaffRequest = {
            fullname: form.fullname.trim(),
            email: form.email.trim(),
            password: form.password,
            // Username/phone tùy chọn — không gửi chuỗi rỗng để BE khỏi
            // validate/check unique vô nghĩa.
            ...(username ? { username } : {}),
            ...(phoneDigits ? { phone: phoneDigits } : {}),
        };

        try {
            setSubmitting(true);
            setServerError('');
            await createStaff(payload);
            toast.success(`Đã tạo tài khoản nhân viên cho ${payload.fullname}.`);
            setForm(EMPTY_FORM);
            setErrors({});
            onCreated();
            onClose();
        } catch (err) {
            const message = getCreateStaffErrorMessage(err);
            setServerError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="vetting-modal-overlay" onClick={resetAndClose}>
            <div
                className="vetting-rejection-modal staff-create-modal"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="vetting-rejection-body">
                    <h3>Tạo tài khoản nhân viên</h3>

                    {serverError && (
                        <div className="staff-form-alert" role="alert">
                            <span className="material-symbols-outlined">error</span>
                            <span>{serverError}</span>
                        </div>
                    )}

                    <div className="staff-form-grid">
                        <div className="staff-field staff-field--full">
                            <InputGroup
                                id="staff-fullname"
                                name="fullname"
                                type="text"
                                label="Họ và tên"
                                placeholder="Nguyễn Văn A"
                                icon="person"
                                value={form.fullname}
                                onChange={(e) => setField('fullname')(e.target.value)}
                                error={errors.fullname}
                                autoComplete="off"
                            />
                        </div>

                        <div className="staff-field">
                            <InputGroup
                                id="staff-username"
                                name="username"
                                type="text"
                                label="Tên đăng nhập (tùy chọn)"
                                placeholder="nhanvien.a"
                                icon="person"
                                value={form.username}
                                onChange={(e) => setField('username')(e.target.value)}
                                error={errors.username}
                                hint={!errors.username ? 'Bỏ trống thì nhân viên đăng nhập bằng email.' : undefined}
                                autoComplete="off"
                            />
                        </div>

                        <div className="staff-field">
                            <InputGroup
                                id="staff-email"
                                name="email"
                                type="email"
                                label="Email"
                                placeholder="nhanvien@tutora.vn"
                                icon="mail"
                                value={form.email}
                                onChange={(e) => setField('email')(e.target.value)}
                                error={errors.email}
                                autoComplete="off"
                                inputMode="email"
                            />
                        </div>

                        <div className="staff-field staff-field--full">
                            <InputGroup
                                id="staff-password"
                                name="password"
                                type="password"
                                label="Mật khẩu"
                                placeholder="Tối thiểu 8 ký tự"
                                icon="lock"
                                value={form.password}
                                onChange={(e) => setField('password')(e.target.value)}
                                error={errors.password}
                                hint={!errors.password ? 'Gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&).' : undefined}
                                showPasswordToggle
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="staff-field staff-field--full">
                            <InputGroup
                                id="staff-phone"
                                name="phone"
                                type="tel"
                                label="Số điện thoại (tùy chọn)"
                                placeholder="0901234567"
                                icon="phone"
                                value={form.phone}
                                onChange={(e) => setField('phone')(e.target.value)}
                                error={errors.phone}
                                autoComplete="off"
                                inputMode="tel"
                            />
                        </div>

                        <div className="staff-field staff-field--full">
                            <p className="staff-field-hint">
                                Nhân viên tự bổ sung thông tin cá nhân (ngày sinh, giới
                                tính, địa chỉ, ảnh đại diện) sau khi đăng nhập.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="vetting-rejection-footer">
                    <button
                        type="button"
                        className="vetting-btn vetting-btn-secondary"
                        onClick={resetAndClose}
                        disabled={submitting}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="vetting-btn vetting-btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateStaffModal;
