import { describe, expect, it } from 'vitest';
import type { PermissionDefinition } from '../types/access.types';
import {
  addPermissionsWithRequirements,
  canAccess,
  removePermissionsWithDependents,
  selectionState,
} from './permissionAccess';

const permission = (key: string, requires: string[] = []): PermissionDefinition => ({
  key,
  label: key,
  domain: 'Nội dung',
  module: 'Test',
  action: 'Test',
  requires,
});

const catalog = [
  permission('question_bank.view'),
  permission('question_bank.create', ['question_bank.view']),
  permission('question_document.view'),
  permission('question_document.upload', ['question_document.view', 'question_bank.create']),
];

describe('permission group editor', () => {
  it('adds all transitive requirements for an action', () => {
    const selected = addPermissionsWithRequirements(catalog, ['question_document.upload'], new Set());
    expect(Array.from(selected).sort()).toEqual([
      'question_bank.create',
      'question_bank.view',
      'question_document.upload',
      'question_document.view',
    ]);
  });

  it('removes every dependent when a required view permission is revoked', () => {
    const all = new Set(catalog.map((item) => item.key));
    const selected = removePermissionsWithDependents(catalog, ['question_bank.view'], all);
    expect(selected.has('question_bank.create')).toBe(false);
    expect(selected.has('question_document.upload')).toBe(false);
    expect(selected.has('question_document.view')).toBe(true);
  });

  it('returns tri-state counts for module and select-all checkboxes', () => {
    const state = selectionState(['a', 'b', 'c'], new Set(['a', 'c']));
    expect(state).toEqual({ selectedCount: 2, totalCount: 3, checked: false, indeterminate: true });
  });
});

describe('route and action guard', () => {
  it('lets Admin bypass and keeps Admin-only pages away from Staff', () => {
    expect(canAccess('Admin', new Set(), { permission: 'anything' })).toBe(true);
    expect(canAccess('Staff', new Set(['anything']), { adminOnly: true })).toBe(false);
  });

  it('handles Staff with and without a group and reflects a live revoke', () => {
    let granted = new Set(['user.view']);
    expect(canAccess('Staff', granted, { permission: 'user.view' })).toBe(true);
    granted = new Set();
    expect(canAccess('Staff', granted, { permission: 'user.view' })).toBe(false);
    expect(canAccess('Parent', new Set(['user.view']), { permission: 'user.view' })).toBe(false);
  });
});
