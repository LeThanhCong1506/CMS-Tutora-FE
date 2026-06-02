import React from 'react';
import './UnderDevelopment.css';

interface UnderDevelopmentProps {
    /** Feature name for description (e.g. "quản lý buổi học") */
    featureName?: string;
}

const UnderDevelopment: React.FC<UnderDevelopmentProps> = ({ featureName = 'này' }) => {
    return (
        <div className="under-dev-banner">
            <span className="under-dev-banner-icon">🚧</span>
            <span className="under-dev-banner-text">
                Tính năng {featureName} đang được phát triển. Dữ liệu hiển thị có thể là dữ liệu mẫu.
            </span>
            <span className="under-dev-banner-badge">
                <span className="under-dev-badge-dot"></span>
                ĐANG PHÁT TRIỂN
            </span>
        </div>
    );
};

export default UnderDevelopment;
