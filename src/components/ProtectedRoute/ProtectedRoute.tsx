import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCurrentUser, getUserInfoFromToken } from '../../services/auth.service';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: ReactNode;
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const user = getCurrentUser();
  if (!user?.accessToken) {
    toast.info('Vui lòng đăng nhập để truy cập trang này.', { toastId: 'auth-required' });
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length) {
    const role = (getUserInfoFromToken()?.role || '').toLowerCase();
    if (!allowedRoles.some((allowed) => allowed.toLowerCase() === role)) {
      toast.warning('Bạn không có quyền truy cập cổng vận hành.', { toastId: 'role-forbidden' });
      return <Navigate to="/403" replace />;
    }
  }
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
