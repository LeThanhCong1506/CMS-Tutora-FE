export type PortalRole = 'Admin' | 'Staff' | string;

export interface PermissionGroupRef {
  id: string;
  name: string;
}

export interface AccessSnapshot {
  role: PortalRole;
  permissionKeys: string[];
  permissionGroup: PermissionGroupRef | null;
  groupVersion: number;
  updatedAt: string | null;
}

export interface PermissionDefinition {
  key: string;
  label: string;
  domain: string;
  module: string;
  action: string;
  description?: string | null;
  requires: string[];
}

export interface PermissionGroupSummary {
  id: string;
  name: string;
  description: string | null;
  permissionKeys: string[];
  permissionCount: number;
  totalPermissionCount?: number;
  staffCount: number;
  version: number;
  updatedAt: string | null;
  isActive: boolean;
}

export interface SavePermissionGroupRequest {
  name: string;
  description?: string;
  permissionKeys: string[];
  expectedVersion?: number;
}
