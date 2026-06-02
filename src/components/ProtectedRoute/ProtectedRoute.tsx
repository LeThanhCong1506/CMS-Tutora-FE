import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCurrentUser, getUserInfoFromToken } from "../../services/auth.service";
import { toast } from "react-toastify";

interface ProtectedRouteProps {
    allowedRoles?: string[];
    children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    allowedRoles,
    children,
}) => {
    const user = getCurrentUser();

    if (!user || !user.accessToken) {
        // Chưa đăng nhập -> toast + redirect login
        toast.info('Vui lòng đăng nhập để truy cập trang này.', { toastId: 'auth-required' });
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const userInfo = getUserInfoFromToken();
        const userRole = (userInfo?.role || '').toLowerCase();

        if (!allowedRoles.some(r => r.toLowerCase() === userRole)) {
            // Admin repo: chỉ có /admin-portal/*, các role khác không có dashboard riêng
            // → đẩy thẳng /403 thay vì /{role}-portal/dashboard (route không tồn tại).
            toast.warning('Bạn không có quyền truy cập trang này.', { toastId: 'role-forbidden' });
            return <Navigate to="/403" replace />;
        }
    }

    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;

