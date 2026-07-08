import { useState } from 'react';
import { toast } from 'react-toastify';
import InputGroup from '../../../components/InputGroup/InputGroup';
import { createStaff, getCreateStaffErrorMessage } from '../../../services/staff.service';
import type { CreateStaffRequest, StaffGender } from '../../../types/staff.types';

interface CreateStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Gọi sau khi tạo thành công để trang cha refresh danh sách. */
    onCreated: () => void;
}

// State form dùng string cho mọi trường (kể cả gender) để bind trực tiếp vào
// input/select; chỉ convert khi submit.
interface StaffForm {
    fullname: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    identityNumber: string;
    birthdate: string;
    gender: string;
    address: string;
}

type FormErrors = Partial<Record<keyof StaffForm, string>>;

const EMPTY_FORM: StaffForm = {
    fullname: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    identityNumber: '',
    birthdate: '',
    gender: '',
    address: '',
};

// Khớp ràng buộc password của BE: >= 8 ký tự, đủ hoa/thường/số/ký tự đặc biệt.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate toàn bộ form phía client — phản chiếu ràng buộc BE để bắt lỗi sớm. */
function validate(form: StaffForm): FormErrors {
    const errors: FormErrors = {};

    if (!form.fullname.trim()) errors.fullname = 'Vui lòng nhập họ tên.';
    else if (form.fullname.trim().length > 100) errors.fullname = 'Họ tên không vượt quá 100 ký tự.';

    if (!form.username.trim()) errors.username = 'Vui lòng nhập tên đăng nhập.';
    else if (form.username.trim().length < 3 || form.username.trim().length > 50)
        errors.username = 'Tên đăng nhập từ 3 đến 50 ký tự.';

    if (!form.email.trim()) errors.email = 'Vui lòng nhập email.';
    else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Email không đúng định dạng.';

    if (!form.password) errors.password = 'Vui lòng nhập mật khẩu.';
    else if (!PASSWORD_REGEX.test(form.password))
        errors.password = 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@$!%*?&).';

    const phoneDigits = form.phone.replace(/[\s.-]/g, '');
    if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại.';
    else if (!/^\+?\d{9,15}$/.test(phoneDigits)) errors.phone = 'Số điện thoại không hợp lệ.';

    if (!form.identityNumber.trim()) errors.identityNumber = 'Vui lòng nhập số CCCD.';
    else if (!/^\d{12}$/.test(form.identityNumber.trim())) errors.identityNumber = 'CCCD phải gồm đúng 12 chữ số.';

    if (!form.birthdate) errors.birthdate = 'Vui lòng chọn ngày sinh.';
    else if (form.birthdate >= new Date().toISOString().slice(0, 10))
        errors.birthdate = 'Ngày sinh phải ở quá khứ.';

    if (form.gender === '') errors.gender = 'Vui lòng chọn giới tính.';

    if (!form.address.trim()) errors.address = 'Vui lòng nhập địa chỉ.';
    else if (form.address.trim().length > 255) errors.address = 'Địa chỉ không vượt quá 255 ký tự.';

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

        const payload: CreateStaffRequest = {
            fullname: form.fullname.trim(),
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
            phone: form.phone.replace(/[\s.-]/g, ''),
            identityNumber: form.identityNumber.trim(),
            birthdate: form.birthdate,
            gender: Number(form.gender) as StaffGender,
            address: form.address.trim(),
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
                    <p className="staff-form-intro">
                        Nhân viên được cấp quyền truy cập cổng vận hành. Điền đầy đủ thông tin bên dưới;
                        nhân viên có thể đăng nhập ngay bằng tên đăng nhập/email và mật khẩu vừa tạo.
                    </p>

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
                                label="Tên đăng nhập"
                                placeholder="nhanvien.a"
                                icon="person"
                                value={form.username}
                                onChange={(e) => setField('username')(e.target.value)}
                                error={errors.username}
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

                        <div className="staff-field">
                            <InputGroup
                                id="staff-phone"
                                name="phone"
                                type="tel"
                                label="Số điện thoại"
                                placeholder="0901234567"
                                icon="phone"
                                value={form.phone}
                                onChange={(e) => setField('phone')(e.target.value)}
                                error={errors.phone}
                                autoComplete="off"
                                inputMode="tel"
                            />
                        </div>

                        <div className="staff-field">
                            <InputGroup
                                id="staff-identity"
                                name="identityNumber"
                                type="text"
                                label="Số CCCD"
                                placeholder="12 chữ số"
                                icon="badge"
                                value={form.identityNumber}
                                onChange={(e) => setField('identityNumber')(e.target.value.replace(/\D/g, ''))}
                                error={errors.identityNumber}
                                autoComplete="off"
                                inputMode="numeric"
                            />
                        </div>

                        <div className="staff-field">
                            <label className="staff-field-label" htmlFor="staff-birthdate">Ngày sinh</label>
                            <input
                                id="staff-birthdate"
                                type="date"
                                className={`staff-field-control${errors.birthdate ? ' staff-field-control--invalid' : ''}`}
                                value={form.birthdate}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => setField('birthdate')(e.target.value)}
                            />
                            {errors.birthdate && <p className="staff-field-error">{errors.birthdate}</p>}
                        </div>

                        <div className="staff-field">
                            <label className="staff-field-label" htmlFor="staff-gender">Giới tính</label>
                            <select
                                id="staff-gender"
                                className={`staff-field-control${errors.gender ? ' staff-field-control--invalid' : ''}`}
                                value={form.gender}
                                onChange={(e) => setField('gender')(e.target.value)}
                            >
                                <option value="" disabled>Chọn giới tính</option>
                                <option value="1">Nam</option>
                                <option value="2">Nữ</option>
                                <option value="0">Khác</option>
                            </select>
                            {errors.gender && <p className="staff-field-error">{errors.gender}</p>}
                        </div>

                        <div className="staff-field staff-field--full">
                            <label className="staff-field-label" htmlFor="staff-address">Địa chỉ</label>
                            <input
                                id="staff-address"
                                type="text"
                                className={`staff-field-control${errors.address ? ' staff-field-control--invalid' : ''}`}
                                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                                value={form.address}
                                maxLength={255}
                                onChange={(e) => setField('address')(e.target.value)}
                            />
                            {errors.address && <p className="staff-field-error">{errors.address}</p>}
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
