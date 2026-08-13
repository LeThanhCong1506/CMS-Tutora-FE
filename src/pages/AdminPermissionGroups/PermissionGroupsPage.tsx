import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ConfirmDialog, DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import {
  createPermissionGroup,
  deletePermissionGroup,
  getPermissionCatalog,
  getPermissionGroup,
  getPermissionGroups,
  updatePermissionGroup,
} from '../../services/permissionGroup.service';
import type {
  PermissionDefinition,
  PermissionGroupSummary,
  SavePermissionGroupRequest,
} from '../../types/access.types';
import { formatDateTime } from '../../utils/formatters';
import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import {
  addPermissionsWithRequirements,
  removePermissionsWithDependents,
} from '../../utils/permissionAccess';
import './PermissionGroupsPage.css';

const PAGE_SIZE = ADMIN_PAGE_SIZE;

const actionLabels: Record<string, string> = {
  view: 'Xem',
  create: 'Thêm',
  update: 'Sửa',
  delete: 'Xóa',
  decide: 'Duyệt / từ chối',
  approve: 'Duyệt',
  reject: 'Từ chối',
  verify: 'Xác minh',
  investigate: 'Điều tra',
  resolve: 'Giải quyết',
  manage: 'Quản lý',
  send: 'Gửi',
  upload: 'Tải lên',
  export: 'Xuất dữ liệu',
};

const labelForAction = (permission: PermissionDefinition) =>
  actionLabels[permission.action.toLowerCase()] || permission.label;

const apiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as
    | { message?: string; Message?: string; content?: string; Content?: string }
    | undefined;
  return data?.message || data?.Message || data?.content || data?.Content || fallback;
};

interface TriCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

const TriCheckbox = ({ checked, indeterminate, disabled, label, onChange }: TriCheckboxProps) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <label className="permission-check">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
};

interface PermissionGroupEditorProps {
  group: PermissionGroupSummary | null;
  catalog: PermissionDefinition[];
  onClose: () => void;
  onSaved: () => void;
  onConflict: () => void;
}

const PermissionGroupEditor = ({
  group,
  catalog,
  onClose,
  onSaved,
  onConflict,
}: PermissionGroupEditorProps) => {
  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [selected, setSelected] = useState(() => new Set(group?.permissionKeys ?? []));
  const [activeDomain, setActiveDomain] = useState('all');
  const [moduleSearch, setModuleSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const byDomain = useMemo(() => {
    const result = new Map<string, Map<string, PermissionDefinition[]>>();
    catalog.forEach((permission) => {
      const domain = permission.domain || 'Khác';
      const modules = result.get(domain) ?? new Map<string, PermissionDefinition[]>();
      const permissions = modules.get(permission.module) ?? [];
      permissions.push(permission);
      modules.set(permission.module, permissions);
      result.set(domain, modules);
    });
    return result;
  }, [catalog]);

  const visibleModules = useMemo(() => {
    const normalizedSearch = moduleSearch.trim().toLocaleLowerCase('vi');
    return Array.from(byDomain.entries())
      .filter(([domain]) => activeDomain === 'all' || activeDomain === domain)
      .flatMap(([domain, modules]) =>
        Array.from(modules.entries())
          .filter(([module, permissions]) => {
            if (!normalizedSearch) return true;
            return (
              module.toLocaleLowerCase('vi').includes(normalizedSearch) ||
              permissions.some((permission) =>
                permission.label.toLocaleLowerCase('vi').includes(normalizedSearch),
              )
            );
          })
          .map(([module, permissions]) => ({ domain, module, permissions })),
      );
  }, [activeDomain, byDomain, moduleSearch]);

  const toggleKeys = (keys: string[], checked: boolean) => {
    setSelected((current) =>
      checked
        ? addPermissionsWithRequirements(catalog, keys, current)
        : removePermissionsWithDependents(catalog, keys, current),
    );
  };

  const save = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      toast.warning('Vui lòng nhập tên nhóm quyền.');
      return;
    }
    if (normalizedName.length > 100) {
      toast.warning('Tên nhóm quyền không vượt quá 100 ký tự.');
      return;
    }
    if (description.trim().length > 255) {
      toast.warning('Mô tả không vượt quá 255 ký tự.');
      return;
    }

    const payload: SavePermissionGroupRequest = {
      name: normalizedName,
      description: description.trim(),
      permissionKeys: Array.from(selected).sort(),
    };

    try {
      setSaving(true);
      if (group) {
        await updatePermissionGroup(group.id, { ...payload, expectedVersion: group.version });
        toast.success('Đã cập nhật nhóm quyền.');
      } else {
        await createPermissionGroup(payload);
        toast.success('Đã tạo nhóm quyền.');
      }
      onSaved();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.warning('Nhóm quyền đã được quản trị viên khác cập nhật. Dữ liệu sẽ được tải lại.');
        onConflict();
        return;
      }
      toast.error(apiErrorMessage(error, 'Không thể lưu nhóm quyền.'));
    } finally {
      setSaving(false);
    }
  };

  const selectedVisibleCount = visibleModules.reduce(
    (total, item) => total + item.permissions.filter((permission) => selected.has(permission.key)).length,
    0,
  );
  const visibleCount = visibleModules.reduce((total, item) => total + item.permissions.length, 0);

  return (
    <div className="permission-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="permission-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="permission-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="permission-modal__header">
          <div>
            <h2 id="permission-editor-title">{group ? 'Sửa nhóm quyền: ' + group.name : 'Thêm nhóm quyền'}</h2>
            <p>Chọn các quyền theo từng module nghiệp vụ của Tutora.</p>
          </div>
          <button type="button" className="permission-icon-button" onClick={onClose} aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <div className="permission-modal__body">
          <div className="permission-fields">
            <label>
              <span>Tên nhóm quyền *</span>
              <input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              <span>Mô tả</span>
              <textarea value={description} maxLength={255} rows={2} onChange={(event) => setDescription(event.target.value)} />
              <small>{description.length}/255</small>
            </label>
          </div>

          <div className="permission-editor-title-row">
            <div>
              <h3>Phân quyền theo module</h3>
              <span>Đã chọn {selected.size}/{catalog.length} quyền</span>
            </div>
            <input
              className="permission-search"
              type="search"
              value={moduleSearch}
              placeholder="Tìm module hoặc quyền..."
              onChange={(event) => setModuleSearch(event.target.value)}
            />
          </div>

          <div className="permission-domain-tabs">
            <button type="button" className={activeDomain === 'all' ? 'active' : ''} onClick={() => setActiveDomain('all')}>
              Tất cả <span>{selected.size}/{catalog.length}</span>
            </button>
            {Array.from(byDomain.entries()).map(([domain, modules]) => {
              const permissions = Array.from(modules.values()).flat();
              const count = permissions.filter((permission) => selected.has(permission.key)).length;
              return (
                <button type="button" key={domain} className={activeDomain === domain ? 'active' : ''} onClick={() => setActiveDomain(domain)}>
                  {domain} <span>{count}/{permissions.length}</span>
                </button>
              );
            })}
          </div>

          <div className="permission-select-all">
            <TriCheckbox
              label={'Chọn tất cả quyền đang hiển thị (' + selectedVisibleCount + '/' + visibleCount + ')'}
              checked={visibleCount > 0 && selectedVisibleCount === visibleCount}
              indeterminate={selectedVisibleCount > 0 && selectedVisibleCount < visibleCount}
              onChange={(checked) =>
                toggleKeys(visibleModules.flatMap((item) => item.permissions.map((permission) => permission.key)), checked)
              }
            />
          </div>

          <div className="permission-module-list">
            {visibleModules.length === 0 ? (
              <div className="permission-empty">Không tìm thấy module phù hợp.</div>
            ) : (
              visibleModules.map(({ domain, module, permissions }) => {
                const selectedCount = permissions.filter((permission) => selected.has(permission.key)).length;
                return (
                  <article className="permission-module" key={domain + ':' + module}>
                    <div className="permission-module__header">
                      <TriCheckbox
                        label={module.replaceAll('_', ' ')}
                        checked={selectedCount === permissions.length}
                        indeterminate={selectedCount > 0 && selectedCount < permissions.length}
                        onChange={(checked) => toggleKeys(permissions.map((permission) => permission.key), checked)}
                      />
                      <span>{selectedCount}/{permissions.length}</span>
                    </div>
                    <div className="permission-module__actions">
                      {permissions.map((permission) => (
                        <TriCheckbox
                          key={permission.key}
                          label={labelForAction(permission)}
                          checked={selected.has(permission.key)}
                          onChange={(checked) => toggleKeys([permission.key], checked)}
                        />
                      ))}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <footer className="permission-modal__footer">
          <button type="button" className="admin-ui-button" onClick={onClose} disabled={saving}>Hủy</button>
          <button type="button" className="admin-ui-button admin-ui-button-primary" onClick={() => void save()} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu nhóm quyền'}
          </button>
        </footer>
      </section>
    </div>
  );
};

const PermissionGroupsPage = () => {
  const [groups, setGroups] = useState<PermissionGroupSummary[]>([]);
  const [catalog, setCatalog] = useState<PermissionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<PermissionGroupSummary | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [confirming, setConfirming] = useState<PermissionGroupSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [groupData, catalogData] = await Promise.all([getPermissionGroups(), getPermissionCatalog()]);
      setGroups(groupData);
      setCatalog(catalogData);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể tải danh sách nhóm quyền.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial API synchronization for the page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    if (!keyword) return groups;
    return groups.filter((group) =>
      (group.name + ' ' + (group.description ?? '')).toLocaleLowerCase('vi').includes(keyword),
    );
  }, [groups, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleGroups = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openEdit = async (summary: PermissionGroupSummary) => {
    try {
      const detail = await getPermissionGroup(summary.id);
      setEditing(detail);
      setEditorOpen(true);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Không thể tải chi tiết nhóm quyền.'));
    }
  };

  const requestRemove = (group: PermissionGroupSummary) => {
    if (group.staffCount > 0) {
      toast.warning('Nhóm đang được gán cho ' + group.staffCount + ' nhân viên. Hãy chuyển nhóm trước khi xóa.');
      return;
    }
    setConfirming(group);
  };

  const confirmRemove = async () => {
    if (!confirming) return;
    setDeleting(true);
    try {
      await deletePermissionGroup(confirming.id, confirming.version);
      toast.success('Đã xóa nhóm quyền.');
      setConfirming(null);
      await load();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.warning('Nhóm quyền đã thay đổi hoặc đang được sử dụng. Danh sách sẽ được tải lại.');
        setConfirming(null);
        await load();
        return;
      }
      toast.error(apiErrorMessage(error, 'Không thể xóa nhóm quyền.'));
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<PermissionGroupSummary>[] = [
    {
      key: 'name',
      title: 'Tên nhóm quyền',
      render: (group) => (
        <div className="permission-group-name">
          <span className="material-symbols-outlined">verified_user</span>
          <div>
            <strong>{group.name}</strong>
            <small>{group.description || 'Không có mô tả'}</small>
          </div>
        </div>
      ),
    },
    {
      key: 'permissionCount',
      title: 'Số quyền',
      render: (group) => (
        <StatusBadge variant="info">
          {group.permissionCount}/{group.totalPermissionCount ?? catalog.length}
        </StatusBadge>
      ),
    },
    { key: 'staffCount', title: 'Nhân viên', render: (group) => group.staffCount + ' nhân viên' },
    {
      key: 'updatedAt',
      title: 'Cập nhật',
      render: (group) => (group.updatedAt ? formatDateTime(group.updatedAt) : '—'),
      hideOnMobile: true,
    },
    {
      key: 'actions',
      title: 'Thao tác',
      render: (group) => (
        <div className="permission-row-actions">
          <button type="button" onClick={() => void openEdit(group)} title="Sửa nhóm">
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button type="button" className="danger" onClick={() => requestRemove(group)} title="Xóa nhóm">
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageContainer
        eyebrow="Quản trị"
        title="Nhóm quyền"
        subtitle="Tạo nhóm tùy chỉnh và gán cho nhân viên vận hành."
        maxWidth="wide"
        headerAction={
          <button
            type="button"
            className="admin-ui-button admin-ui-button-primary"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <span className="material-symbols-outlined">add</span>
            Thêm nhóm quyền
          </button>
        }
      >
        <SectionCard
          title="Danh sách nhóm quyền"
          subtitle={groups.length + ' nhóm quyền trong hệ thống'}
          headerAction={
            <input
              className="permission-list-search"
              type="search"
              value={search}
              placeholder="Tìm theo tên, mô tả..."
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          }
        >
          <DataTable
            columns={columns}
            data={visibleGroups}
            rowKey="id"
            loading={loading}
            loadingText="Đang tải nhóm quyền..."
            emptyText="Chưa có nhóm quyền nào."
            pagination={{ current: currentPage, pageSize: PAGE_SIZE, total: filtered.length, onChange: setPage }}
            minWidth={820}
            variant="embedded"
            density="compact"
            adaptive
          />
        </SectionCard>
      </PageContainer>

      {editorOpen && (
        <PermissionGroupEditor
          group={editing}
          catalog={catalog}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            void load();
          }}
          onConflict={() => {
            setEditorOpen(false);
            void load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirming}
        title="Xóa nhóm quyền?"
        description={
          <>
            Nhóm quyền <strong>{confirming?.name}</strong> sẽ bị xóa vĩnh viễn và không thể khôi phục.
          </>
        }
        confirmLabel="Xóa nhóm quyền"
        busy={deleting}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
};

export default PermissionGroupsPage;
