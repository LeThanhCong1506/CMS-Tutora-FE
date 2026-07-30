/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { getCurrentUser, getCurrentUserRole } from '../services/auth.service';
import { getMyAccess } from '../services/access.service';
import type { AccessSnapshot } from '../types/access.types';
import { canAccess } from '../utils/permissionAccess';

interface AccessContextValue {
  access: AccessSnapshot | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isStaff: boolean;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  refresh: () => Promise<AccessSnapshot | null>;
}

const AccessContext = createContext<AccessContextValue | null>(null);

export const AccessProvider = ({ children }: { children: ReactNode }) => {
  const [access, setAccess] = useState<AccessSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(getCurrentUser()?.accessToken));
  const [error, setError] = useState<string | null>(null);
  const accessRef = useRef<AccessSnapshot | null>(null);
  const refreshRequestRef = useRef<Promise<AccessSnapshot | null> | null>(null);
  const accessGenerationRef = useRef(0);

  const refresh = useCallback((): Promise<AccessSnapshot | null> => {
    const accessToken = getCurrentUser()?.accessToken;
    if (!accessToken) {
      accessGenerationRef.current += 1;
      refreshRequestRef.current = null;
      accessRef.current = null;
      setAccess(null);
      setLoading(false);
      setError(null);
      return Promise.resolve(null);
    }

    // Several API calls can fail with 403 at the same time after a live revoke.
    // Reuse one /access/me request so stale responses cannot race each other.
    if (refreshRequestRef.current) return refreshRequestRef.current;

    const generation = accessGenerationRef.current;
    if (!accessRef.current) setLoading(true);

    const request = (async () => {
      try {
        const snapshot = await getMyAccess();
        if (
          generation !== accessGenerationRef.current
          || getCurrentUser()?.accessToken !== accessToken
        ) {
          return null;
        }

        accessRef.current = snapshot;
        setAccess(snapshot);
        setError(null);
        return snapshot;
      } catch {
        if (
          generation !== accessGenerationRef.current
          || getCurrentUser()?.accessToken !== accessToken
        ) {
          return null;
        }

        // A background refresh must not erase the last valid permission
        // snapshot because of a transient network/server failure.
        if (!accessRef.current) {
          setAccess(null);
          setError('Không thể tải thông tin phân quyền. Vui lòng thử lại.');
        }
        return null;
      } finally {
        if (
          generation === accessGenerationRef.current
          && getCurrentUser()?.accessToken === accessToken
        ) {
          setLoading(false);
        }
      }
    })();

    refreshRequestRef.current = request;
    void request.finally(() => {
      if (refreshRequestRef.current === request) refreshRequestRef.current = null;
    });
    return request;
  }, []);

  useEffect(() => {
    const handleAuthChanged = () => {
      accessGenerationRef.current += 1;
      refreshRequestRef.current = null;
      accessRef.current = null;
      setAccess(null);
      setError(null);
      setLoading(Boolean(getCurrentUser()?.accessToken));
      void refresh();
    };
    const handleForbidden = () => void refresh();
    window.addEventListener('tutora:auth-changed', handleAuthChanged);
    window.addEventListener('tutora:access-forbidden', handleForbidden);
    // Initial API synchronization for the provider.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return () => {
      window.removeEventListener('tutora:auth-changed', handleAuthChanged);
      window.removeEventListener('tutora:access-forbidden', handleForbidden);
    };
  }, [refresh]);

  const role = access?.role || getCurrentUserRole() || '';
  const isAdmin = role.toLowerCase() === 'admin';
  const isStaff = role.toLowerCase() === 'staff';
  const granted = useMemo(() => new Set(access?.permissionKeys ?? []), [access?.permissionKeys]);
  const can = useCallback((permission: string) => canAccess(role, granted, { permission }), [granted, role]);
  const canAny = useCallback(
    (permissions: string[]) => canAccess(role, granted, { anyOf: permissions }),
    [granted, role],
  );

  const value = useMemo<AccessContextValue>(() => ({
    access,
    loading,
    error,
    isAdmin,
    isStaff,
    can,
    canAny,
    refresh,
  }), [access, loading, error, isAdmin, isStaff, can, canAny, refresh]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

export const useAccess = () => {
  const value = useContext(AccessContext);
  if (!value) throw new Error('useAccess must be used inside AccessProvider');
  return value;
};

export const Can = ({
  permission,
  anyOf,
  children,
  fallback = null,
}: {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { can, canAny } = useAccess();
  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true;
  return <>{allowed ? children : fallback}</>;
};
