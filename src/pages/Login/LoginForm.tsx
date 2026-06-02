/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/Login/LoginForm.tsx — Admin-only login (chỉ chấp nhận role=Admin).
// Repo gốc Agora-Frontend cho phép cả tutor/parent/student; admin repo chỉ admin.
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import InputGroup from "../../components/InputGroup";
import { saveUserToStorage, clearUserFromStorage } from "../../services/auth.service";

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5166") + "/api";
const REMEMBERED_EMAIL_KEY = "TUTORA_remembered_email";

// ─── Brand colors ───
const NAVY = "#1a2238";
const NAVY_HOVER = "#0f1729";
const GOLD = "#d4b483";

const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHover, setIsHover] = useState(false);

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Decode JWT payload to extract role. Admin repo chỉ chấp nhận role=Admin —
   * trả về false nếu role khác.
   */
  const isAdminToken = (token: string): boolean => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        )
      );
      const roleClaim = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
      const role = (payload[roleClaim] || "").toLowerCase();
      return role === "admin";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.warning("Vui lòng nhập đầy đủ email và mật khẩu!");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        emailOrPhone: formData.email,
        password: formData.password,
      });

      const data = response.data;
      const token = data.content?.token;
      const refreshToken = data.content?.refreshToken;

      if (!token) {
        throw new Error("Không nhận được token từ server");
      }

      // Admin-only gate
      if (!isAdminToken(token)) {
        await clearUserFromStorage();
        toast.error("Tài khoản này không có quyền truy cập trang quản trị.");
        return;
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, formData.email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      saveUserToStorage({ accessToken: token, refreshToken });

      toast.success("Đăng nhập thành công!");
      setTimeout(() => {
        navigate("/admin-portal/dashboard");
      }, 600);
    } catch (error: any) {
      console.error("Login Error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.content ||
        error.message ||
        "Đăng nhập thất bại";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Heading */}
      <div style={{ marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "20px",
            fontFamily: "'Bricolage Grotesque', 'IBM Plex Sans', sans-serif",
            fontWeight: 600,
            color: NAVY,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Đăng nhập
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "#6b6b6b",
            margin: "4px 0 0",
            lineHeight: 1.5,
          }}
        >
          Nhập tài khoản quản trị viên đã được cấp.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "18px" }}
      >
        <InputGroup
          id="email"
          name="email"
          type="text"
          label="Email hoặc username"
          placeholder="admin@tutora.vn"
          icon="mail"
          value={formData.email}
          onChange={handleChange}
          disabled={isSubmitting}
        />

        <InputGroup
          id="password"
          name="password"
          type="password"
          label="Mật khẩu"
          placeholder="••••••••"
          icon="lock"
          value={formData.password}
          onChange={handleChange}
          showPasswordToggle={true}
          disabled={isSubmitting}
        />

        {/* Remember me */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            userSelect: "none",
            fontSize: "13px",
            color: "#4a4a4a",
            fontWeight: 500,
            marginTop: "-4px",
          }}
        >
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isSubmitting}
            style={{
              width: "16px",
              height: "16px",
              accentColor: NAVY,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              margin: 0,
            }}
          />
          Ghi nhớ đăng nhập
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          style={{
            background: isSubmitting ? "#3a4258" : isHover ? NAVY_HOVER : NAVY,
            color: "white",
            border: "none",
            padding: "13px 16px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: isSubmitting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "background 0.2s, transform 0.1s",
            transform: isHover && !isSubmitting ? "translateY(-1px)" : "translateY(0)",
            boxShadow: isHover && !isSubmitting
              ? "0 4px 12px rgba(26, 34, 56, 0.25)"
              : "0 2px 6px rgba(26, 34, 56, 0.15)",
            fontFamily: "'IBM Plex Sans', sans-serif",
            letterSpacing: "0.02em",
            marginTop: "4px",
          }}
        >
          {isSubmitting && (
            <svg
              style={{ animation: "spin 1s linear infinite" }}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                opacity="0.3"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          )}
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        {/* Accent line at bottom */}
        <div
          style={{
            height: "3px",
            background: `linear-gradient(90deg, transparent 0%, ${GOLD} 50%, transparent 100%)`,
            opacity: 0.4,
            marginTop: "8px",
            borderRadius: "2px",
          }}
        />

        {/* Keyframes for spinner (inline since no global animation lib) */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </form>
    </div>
  );
};

export default LoginForm;
