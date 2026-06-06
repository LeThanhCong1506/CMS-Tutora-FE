import React from 'react';
import ErrorStatePage from './ErrorStatePage';

const NotFoundPage: React.FC = () => {
    return (
        <ErrorStatePage
            code="404"
            icon="travel_explore"
            title="Không tìm thấy trang"
            message="Trang bạn đang tìm có thể đã bị xóa, đổi đường dẫn hoặc tạm thời không khả dụng."
            primaryAction={{ label: 'Về trang chủ', to: '/' }}
            secondaryAction={{ label: 'Quay lại', onClick: () => window.history.back() }}
        />
    );
};

export default NotFoundPage;
