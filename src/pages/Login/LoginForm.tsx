/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import InputGroup from '../../components/InputGroup';
import { clearUserFromStorage, getRoleFromToken, saveUserToStorage } from '../../services/auth.service';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';
const REMEMBERED_EMAIL_KEY = 'TUTORA_remembered_email';

interface LoginCredentials {
  email: string;
  password: string;
}

type LoginField = keyof LoginCredentials;

const initialFormData: LoginCredentials = {
  email: '',
  password: '',
};

const getRememberedEmail = () => {
  return typeof window === 'undefined' ? '' : localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
};

const validateField = (name: LoginField, value: string) => {
  if (value.trim()) return '';

  return name === 'email' ? 'Vui lòng nhập email hoặc tên đăng nhập.' : 'Vui lòng nhập mật khẩu.';
};

const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginCredentials>(() => ({
    ...initialFormData,
    email: getRememberedEmail(),
  }));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [rememberMe, setRememberMe] = useState(() => Boolean(getRememberedEmail()));
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target as HTMLInputElement & { name: LoginField };
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = event.target as HTMLInputElement & { name: LoginField };
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handlePasswordKeyEvent = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(event.getModifierState('CapsLock'));
  };

  const validateForm = () => {
    const nextErrors = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
    };

    setFieldErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        emailOrPhone: formData.email.trim(),
        password: formData.password,
      });

      const data = response.data;
      const token = data.content?.token;
      const refreshToken = data.content?.refreshToken;

      if (!token) {
        throw new Error('Không nhận được token từ server');
      }

      const normalizedRole = getRoleFromToken(token)?.toLowerCase();
      if (!normalizedRole || !['admin', 'staff'].includes(normalizedRole)) {
        await clearUserFromStorage();
        toast.error('Tài khoản này không có quyền truy cập trang quản trị.');
        return;
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email.trim());
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      await saveUserToStorage({ accessToken: token, refreshToken });

      toast.success('Đăng nhập thành công!');
      setTimeout(() => {
        navigate(normalizedRole === 'staff' ? '/admin-portal/payouts' : '/admin-portal/dashboard');
      }, 600);
    } catch (error: any) {
      console.error('Login Error:', error);
      const errorMessage =
        error.response?.data?.message || error.response?.data?.content || error.message || 'Đăng nhập thất bại';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-form">
      <div className="login-form__intro">
        <h1>Đăng nhập</h1>
      </div>

      <form className="login-form__fields" onSubmit={handleSubmit} noValidate>
        <InputGroup
          id="email"
          name="email"
          type="text"
          label="Email hoặc tên đăng nhập"
          placeholder="admin@tutora.vn"
          icon="mail"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={fieldErrors.email}
          autoComplete="username"
          disabled={isSubmitting}
        />

        <InputGroup
          id="password"
          name="password"
          type="password"
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          icon="lock"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handlePasswordKeyEvent}
          onKeyUp={handlePasswordKeyEvent}
          hint={isCapsLockOn ? 'Caps Lock đang bật.' : undefined}
          error={fieldErrors.password}
          autoComplete="current-password"
          showPasswordToggle
          disabled={isSubmitting}
        />

        <div className="login-form__options">
          <label className="login-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              disabled={isSubmitting}
            />
            <span aria-hidden="true" />
            <strong>Ghi nhớ tài khoản</strong>
          </label>
        </div>

        <button className="login-submit" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
          {isSubmitting ? (
            <LoaderCircle className="login-submit__spinner" size={18} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
