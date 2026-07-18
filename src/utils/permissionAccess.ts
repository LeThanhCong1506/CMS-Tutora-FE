import type { PermissionDefinition } from '../types/access.types';

export interface AccessRule {
  permission?: string;
  anyOf?: string[];
  adminOnly?: boolean;
}

export const canAccess = (
  role: string,
  permissionKeys: ReadonlySet<string>,
  rule: AccessRule,
): boolean => {
  const isAdmin = role.toLowerCase() === 'admin';
  if (rule.adminOnly) return isAdmin;
  if (isAdmin) return true;
  if (role.toLowerCase() !== 'staff') return false;
  if (rule.permission) return permissionKeys.has(rule.permission);
  if (rule.anyOf?.length) return rule.anyOf.some((permission) => permissionKeys.has(permission));
  return true;
};

export const addPermissionsWithRequirements = (
  catalog: PermissionDefinition[],
  keys: Iterable<string>,
  current: ReadonlySet<string>,
): Set<string> => {
  const next = new Set(current);
  const byKey = new Map(catalog.map((permission) => [permission.key, permission]));
  const queue = Array.from(keys);
  while (queue.length) {
    const key = queue.pop()!;
    if (next.has(key)) continue;
    next.add(key);
    byKey.get(key)?.requires.forEach((required) => queue.push(required));
  }
  return next;
};

export const removePermissionsWithDependents = (
  catalog: PermissionDefinition[],
  keys: Iterable<string>,
  current: ReadonlySet<string>,
): Set<string> => {
  const removed = new Set(keys);
  let changed = true;
  while (changed) {
    changed = false;
    catalog.forEach((permission) => {
      if (!removed.has(permission.key) && permission.requires.some((required) => removed.has(required))) {
        removed.add(permission.key);
        changed = true;
      }
    });
  }
  const next = new Set(current);
  removed.forEach((key) => next.delete(key));
  return next;
};

export const selectionState = (keys: Iterable<string>, selected: ReadonlySet<string>) => {
  const list = Array.from(keys);
  const selectedCount = list.filter((key) => selected.has(key)).length;
  return {
    selectedCount,
    totalCount: list.length,
    checked: list.length > 0 && selectedCount === list.length,
    indeterminate: selectedCount > 0 && selectedCount < list.length,
  };
};
