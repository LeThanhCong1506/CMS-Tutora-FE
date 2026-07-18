import axios from 'axios';
import { apiClient } from './apiClient';
import type { PermissionDefinition, PermissionGroupSummary, SavePermissionGroupRequest } from '../types/access.types';

const unwrap = <T>(data: T | { content?: T }): T => {
  if (data && typeof data === 'object' && 'content' in data) {
    return ((data as { content?: T }).content ?? data) as T;
  }
  return data as T;
};

const toStringArray = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];

const normalizeGroup = (value: unknown): PermissionGroupSummary => {
  const raw = value as Record<string, unknown>;
  const keys = toStringArray(raw.permissionKeys ?? raw.PermissionKeys);
  return {
    id: String(raw.id ?? raw.permissionGroupId ?? raw.PermissionGroupId ?? raw.groupId ?? ''),
    name: String(raw.name ?? raw.Name ?? ''),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    permissionKeys: keys,
    permissionCount: Number(raw.permissionCount ?? raw.PermissionCount ?? keys.length),
    totalPermissionCount: raw.totalPermissionCount == null ? undefined : Number(raw.totalPermissionCount),
    staffCount: Number(raw.staffCount ?? raw.StaffCount ?? 0),
    version: Number(raw.version ?? raw.Version ?? 0),
    updatedAt: (raw.updatedAt ?? raw.UpdatedAt ?? null) as string | null,
    isActive: Boolean(raw.isActive ?? raw.IsActive ?? true),
  };
};

const normalizePermission = (value: unknown): PermissionDefinition => {
  const raw = value as Record<string, unknown>;
  const key = String(raw.key ?? raw.Key ?? '');
  const segments = key.split('.');
  const domain = String(raw.domain ?? raw.Domain ?? raw.group ?? raw.Group ?? 'Khác');
  return {
    key,
    label: String(raw.label ?? raw.Label ?? key),
    description: (raw.description ?? raw.Description ?? null) as string | null,
    domain,
    module: String(raw.module ?? raw.Module ?? segments[0] ?? 'other'),
    action: String(raw.action ?? raw.Action ?? segments.slice(1).join('.') ?? 'access'),
    requires: toStringArray(raw.requires ?? raw.Requires),
  };
};

const normalizeListPayload = (payload: unknown): unknown[] => {
  const unwrapped = unwrap<unknown>(payload);
  if (Array.isArray(unwrapped)) return unwrapped;
  if (unwrapped && typeof unwrapped === 'object') {
    const raw = unwrapped as Record<string, unknown>;
    const candidate = raw.items ?? raw.Items ?? raw.groups ?? raw.Groups;
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
};

export const getPermissionGroups = async (): Promise<PermissionGroupSummary[]> => {
  const { data } = await apiClient.get('/admin/permission-groups');
  return normalizeListPayload(data).map(normalizeGroup);
};

export const getPermissionGroup = async (id: string): Promise<PermissionGroupSummary> => {
  const { data } = await apiClient.get(`/admin/permission-groups/${encodeURIComponent(id)}`);
  return normalizeGroup(unwrap<unknown>(data));
};

export const getPermissionCatalog = async (): Promise<PermissionDefinition[]> => {
  try {
    const { data } = await apiClient.get('/admin/permission-groups/catalog');
    return normalizeListPayload(data).map(normalizePermission).filter((item) => item.key);
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
    const { data } = await apiClient.get('/admin/staff-permissions/catalog');
    return normalizeListPayload(data).map(normalizePermission).filter((item) => item.key);
  }
};

export const createPermissionGroup = async (request: SavePermissionGroupRequest): Promise<PermissionGroupSummary> => {
  const { data } = await apiClient.post('/admin/permission-groups', request);
  return normalizeGroup(unwrap<unknown>(data));
};

export const updatePermissionGroup = async (
  id: string,
  request: SavePermissionGroupRequest & { expectedVersion: number },
): Promise<PermissionGroupSummary> => {
  const { data } = await apiClient.put(`/admin/permission-groups/${encodeURIComponent(id)}`, request);
  return normalizeGroup(unwrap<unknown>(data));
};

export const deletePermissionGroup = async (id: string, expectedVersion: number): Promise<void> => {
  await apiClient.delete(`/admin/permission-groups/${encodeURIComponent(id)}`, { params: { expectedVersion } });
};

export const assignStaffPermissionGroup = async (
  staffId: string,
  permissionGroupId: string | null,
  expectedVersion: number,
): Promise<void> => {
  await apiClient.put(`/admin/staffs/${encodeURIComponent(staffId)}/permission-group`, {
    permissionGroupId,
    expectedVersion,
  });
};
