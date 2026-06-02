import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/auth.service";
import styles from "../styles/components/session-expired-modal.module.css";

interface SessionExpiredModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
    isOpen,
    onClose,
}) => {
    const navigate = useNavigate();

    const handleLoginRedirect = useCallback(async () => {
        // Admin repo: web-only. Original Agora-Frontend also signs out Supabase
        // session + Zalo auth — both stripped here (admin không dùng Supabase OAuth
        // và không chạy Zalo Mini App).
        await logout();
        onClose();
        navigate("/login");
    }, [navigate, onClose]);

    // Auto-redirect after 10 seconds
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            handleLoginRedirect();
        }, 10000);
        return () => clearTimeout(timer);
    }, [isOpen, handleLoginRedirect]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            {/* Backdrop - no click to dismiss, force user action */}
            <div className={styles.backdrop} />

            {/* Modal */}
            <div className={styles.modal}>
                <div className={styles.content}>
                    {/* Icon */}
                    <div className={styles.iconCircle}>
                        <svg
                            width="32"
                            height="32"
                            fill="none"
                            stroke="#ef4444"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>

                    {/* Title & Description */}
                    <h2 className={styles.title}>Phiên đăng nhập hết hạn</h2>
                    <p className={styles.description}>
                        Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp
                        tục sử dụng dịch vụ.
                    </p>

                    {/* Login Button */}
                    <button
                        onClick={handleLoginRedirect}
                        className={styles.btnPrimary}
                    >
                        <svg
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                            />
                        </svg>
                        Đăng nhập lại
                    </button>
                </div>

                {/* Decorative Accent Bar */}
                <div className={styles.accentBar} />
            </div>
        </div>
    );
};

export default SessionExpiredModal;
