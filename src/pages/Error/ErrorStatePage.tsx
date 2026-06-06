import React from 'react';
import { Link } from 'react-router-dom';

interface ErrorAction {
    label: string;
    to?: string;
    onClick?: () => void;
}

interface ErrorStatePageProps {
    code: string;
    icon: string;
    title: string;
    message: string;
    primaryAction: ErrorAction;
    secondaryAction?: ErrorAction;
}

const ErrorStatePage: React.FC<ErrorStatePageProps> = ({
    code,
    icon,
    title,
    message,
    primaryAction,
    secondaryAction,
}) => {
    const renderAction = (action: ErrorAction, variant: 'primary' | 'secondary') => {
        const className = variant === 'primary' ? 'error-btn-primary' : 'error-btn-secondary';

        if (action.to) {
            return (
                <Link to={action.to} className={className}>
                    {action.label}
                </Link>
            );
        }

        return (
            <button type="button" onClick={action.onClick} className={className}>
                {action.label}
            </button>
        );
    };

    return (
        <div className="error-page">
            <div className="error-container">
                <div className="error-logo">
                    <span className="logo-text">TUTORA</span>
                </div>

                <div className="error-status-icon">
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <h1 className="error-code">{code}</h1>
                <div className="error-divider"></div>
                <h2 className="error-title">{title}</h2>

                <p className="error-message">{message}</p>

                <div className="error-actions">
                    {renderAction(primaryAction, 'primary')}
                    {secondaryAction && renderAction(secondaryAction, 'secondary')}
                </div>

                <div className="error-footer">
                    Cần hỗ trợ?{' '}
                    <a href="mailto:support@TUTORA.edu.vn" className="error-link">
                        Liên hệ chúng tôi
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ErrorStatePage;
