import React, { useState } from 'react';
import './InputGroup.css';

// SVG icon map — replaces Material Symbols font icons for cross-browser compatibility
// (Samsung Internet doesn't load the Material Symbols web font)
const SvgIcons: Record<string, React.ReactNode> = {
    person: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    mail: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 7l-10 7L2 7" />
        </svg>
    ),
    phone: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
    ),
    lock: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
    ),
    visibility: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    visibility_off: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    ),
};

const renderIcon = (iconName: string) => {
    return SvgIcons[iconName] ?? <span className="material-symbols-outlined">{iconName}</span>;
};

interface InputGroupProps {
    id: string;
    name: string;
    type: string;
    label: string;
    placeholder: string;
    icon: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    rightLink?: {
        text: string;
        href: string;
    };
    showPasswordToggle?: boolean; // Prop để bật/tắt chức năng toggle password
    disabled?: boolean;
}

const InputGroup: React.FC<InputGroupProps> = ({
    id,
    name,
    type,
    label,
    placeholder,
    icon,
    value,
    onChange,
    rightLink,
    showPasswordToggle = false,
    disabled = false
}) => {
    // State để quản lý việc hiển thị password
    const [showPassword, setShowPassword] = useState(false);

    // Xác định type thực tế của input
    // Nếu type ban đầu là "password" và showPasswordToggle = true, cho phép toggle
    const actualType = (type === 'password' && showPasswordToggle && showPassword) ? 'text' : type;

    return (
        <div className="input-group">
            <div className="input-group__header">
                <label htmlFor={id} className="input-group__label">
                    {label}
                </label>
                {rightLink && (
                    <a href={rightLink.href} className="input-group__link">
                        {rightLink.text}
                    </a>
                )}
            </div>

            <div className="input-group__field" style={{ position: 'relative' }}>
                <span className="input-group__icon">
                    {renderIcon(icon)}
                </span>
                <input
                    id={id}
                    name={name}
                    type={actualType}
                    className="input-group__input"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                />

                {/* Nút toggle password - chỉ hiển thị khi type='password' và showPasswordToggle=true */}
                {type === 'password' && showPasswordToggle && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6B7280',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#1F2937'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6B7280'}
                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                    >
                        {renderIcon(showPassword ? 'visibility_off' : 'visibility')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default InputGroup;
