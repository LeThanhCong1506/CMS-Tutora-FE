import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAccess } from '../../contexts/AccessContext';
import PageLoader from '../PageLoader/PageLoader';

interface PermissionRouteProps {
  children: ReactNode;
  permission?: string;
  anyOf?: string[];
  adminOnly?: boolean;
}

const PermissionRoute = ({ children, permission, anyOf, adminOnly }: PermissionRouteProps) => {
  const location = useLocation();
  const { access, loading, error, isAdmin, can, canAny } = useAccess();

  if (loading) return <PageLoader />;
  if (error && !access) return <Navigate to="/admin-portal/no-access" replace state={{ accessError: true }} />;

  const allowed = adminOnly
    ? isAdmin
    : permission
      ? can(permission)
      : anyOf
        ? canAny(anyOf)
        : true;

  if (!allowed) {
    return <Navigate to="/admin-portal/no-access" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
};

export default PermissionRoute;
