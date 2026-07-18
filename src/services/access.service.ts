import { apiClient } from './apiClient';
import type { AccessSnapshot, PermissionGroupRef } from '../types/access.types';

const unwrap = <T>(data: T | { content?: T }): T => {
  if (data && typeof data === 'object' && 'content' in data) {
    return ((data as { content?: T }).content ?? data) as T;
  }
  return data as T;
};

export const getMyAccess = async (): Promise<AccessSnapshot> => {
  const { data } = await apiClient.get('/access/me');
  const raw = unwrap<Record<string, unknown>>(data);
  const groupRaw = (raw.permissionGroup ?? raw.PermissionGroup) as Record<string, unknown> | null | undefined;
  const group: PermissionGroupRef | null = groupRaw
    ? {
        id: String(groupRaw.id ?? groupRaw.permissionGroupId ?? groupRaw.PermissionGroupId ?? ''),
        name: String(groupRaw.name ?? groupRaw.Name ?? ''),
      }
    : null;

  return {
    role: String(raw.role ?? raw.Role ?? ''),
    permissionKeys: ((raw.permissionKeys ?? raw.PermissionKeys ?? []) as unknown[]).map(String),
    permissionGroup: group,
    groupVersion: Number(raw.groupVersion ?? raw.GroupVersion ?? raw.version ?? raw.Version ?? 0),
    updatedAt: (raw.updatedAt ?? raw.UpdatedAt ?? null) as string | null,
  };
};
