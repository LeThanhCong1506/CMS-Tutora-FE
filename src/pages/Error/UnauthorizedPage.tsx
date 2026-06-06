import React from 'react';
import ErrorStatePage from './ErrorStatePage';

const UnauthorizedPage: React.FC = () => {
    return (
        <ErrorStatePage
            code="401"
            icon="lock"
            title="Chưa xác thực"
            message="Bạn cần đăng nhập để truy cập trang này. Vui lòng dùng tài khoản có quyền phù hợp trước khi tiếp tục."
            primaryAction={{ label: 'Đăng nhập ngay', to: '/login' }}
        />
    );
};

export default UnauthorizedPage;
