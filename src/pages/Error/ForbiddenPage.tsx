import React from 'react';
import ErrorStatePage from './ErrorStatePage';

const ForbiddenPage: React.FC = () => {
    return (
        <ErrorStatePage
            code="403"
            icon="shield_locked"
            title="Truy cập bị từ chối"
            message="Tài khoản hiện tại không có quyền truy cập màn hình này. Nếu đây là nhầm lẫn, hãy liên hệ quản trị viên hệ thống."
            primaryAction={{ label: 'Về trang chủ', to: '/' }}
            secondaryAction={{ label: 'Đăng nhập lại', to: '/login' }}
        />
    );
};

export default ForbiddenPage;
