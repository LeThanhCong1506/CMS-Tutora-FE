import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getStaffs } from '../../services/staff.service';
import { assignStaffPermissionGroup, getPermissionGroups } from '../../services/permissionGroup.service';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import type { StaffListItem } from '../../types/staff.types';
import type { PermissionGroupSummary } from '../../types/access.types';
import CreateStaffModal from './components/CreateStaffModal';

import '../../styles/pages/admin-user-management.css';
import '../../styles/pages/admin-vetting-modal.css';
import '../../styles/pages/admin-staff.css';

const PAGE_SIZE = 20;

const avatarFor = (staff: StaffListItem): string =>
  staff.avatarurl ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.fullname || staff.username || 'NV')}&background=random`;

const errorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  return String(error.response?.data?.message ?? error.response?.data?.content ?? fallback);
};

const StaffManagementPage = () => {
  const [staffs, setStaffs] = useState<StaffListItem[]>([]);
  const [groups, setGroups] = useState<PermissionGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assigningStaffId, setAssigningStaffId] = useState<string | null>(null);

  const fetchStaffs = useCallback(async () => {
    try {
      setLoading(true);
      const { content, hasMore: more } = await getStaffs(page, PAGE_SIZE);
      setStaffs(content);
      setHasMore(more);
    } catch (error) {
      console.error('Error fetching staffs:', error);
      toast.error('Không thể tải danh sách nhân viên.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchGroups = useCallback(async () => {
    try {
      setGroups(await getPermissionGroups());
    } catch (error) {
      toast.error(errorMessage(error, 'Không thể tải danh sách nhóm quyền.'));
    }
  }, []);

  useEffect(() => {
    // Page changes synchronize the table with the backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchStaffs();
  }, [fetchStaffs]);

  useEffect(() => {
    // Initial group catalog synchronization for assignment controls.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchGroups();
  }, [fetchGroups]);

  const setGroup = async (staff: StaffListItem, permissionGroupId: string | null) => {
    try {
      setAssigningStaffId(staff.userid);
      await assignStaffPermissionGroup(staff.userid, permissionGroupId, staff.assignmentVersion ?? 0);
      toast.success(permissionGroupId ? 'Đã cập nhật nhóm quyền của nhân viên.' : 'Đã bỏ nhóm quyền của nhân viên.');
      await fetchStaffs();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.warning('Nhân viên đã được quản trị viên khác cập nhật. Danh sách sẽ được tải lại.');
        await fetchStaffs();
      } else {
        toast.error(errorMessage(error, 'Không thể cập nhật nhóm quyền.'));
      }
    } finally {
      setAssigningStaffId(null);
    }
  };

  const pseudoTotal = hasMore ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + staffs.length;
  const columns: DataTableColumn<StaffListItem>[] = [
    {
      key: 'identity',
      title: 'Nhân viên',
      render: (staff) => (
        <div className="staff-identity">
          <img className="staff-avatar" src={avatarFor(staff)} alt={staff.fullname} />
          <div className="admin-ui-entity">
            <span className="admin-ui-entity-primary">{staff.fullname || '—'}</span>
            <span className="admin-ui-entity-secondary">{staff.username || 'Chưa có tên đăng nhập'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'account',
      title: 'Tài khoản',
      render: (staff) => (
        <div className="admin-ui-entity">
          <span className="admin-ui-entity-primary">{staff.email}</span>
          <span className="admin-ui-entity-secondary">{staff.phone || 'Chưa có số điện thoại'}</span>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'permissionGroup',
      title: 'Nhóm quyền',
      render: (staff) => staff.permissionGroup?.name || <span className="staff-no-group">Chưa cấp quyền</span>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (staff) => (
        <StatusBadge variant={staff.status === 1 ? 'success' : 'error'}>
          {staff.status === 1 ? 'Hoạt động' : 'Vô hiệu hóa'}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      title: 'Hành động',
      render: (staff) => (
        <select
          className="staff-group-select"
          aria-label={`Nhóm quyền của ${staff.fullname}`}
          value={staff.permissionGroup?.id ?? ''}
          disabled={assigningStaffId === staff.userid}
          onChange={(event) => void setGroup(staff, event.target.value || null)}
        >
          <option value="">Không có nhóm</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <>
      <PageContainer
        eyebrow="Quản trị"
        title="Quản lý nhân viên"
        subtitle="Tạo tài khoản và gán đúng một nhóm quyền cho mỗi nhân viên vận hành."
        maxWidth="wide"
        headerAction={
          <button
            type="button"
            className="admin-ui-button admin-ui-button-primary staff-create-trigger"
            onClick={() => setIsCreateOpen(true)}
          >
            <span className="material-symbols-outlined">person_add</span>
            Tạo tài khoản nhân viên
          </button>
        }
      >
        <SectionCard
          title="Danh sách nhân viên"
          subtitle="Nhân viên không có nhóm sẽ không có quyền sử dụng chức năng CMS."
          footer={`Hiển thị ${staffs.length} nhân viên`}
        >
          <DataTable<StaffListItem>
            columns={columns}
            data={staffs}
            rowKey="userid"
            loading={loading}
            loadingText="Đang tải nhân viên..."
            emptyText="Chưa có nhân viên nào."
            pagination={{ current: page, pageSize: PAGE_SIZE, total: pseudoTotal, onChange: setPage }}
            minWidth={920}
            variant="embedded"
            density="compact"
            adaptive
          />
        </SectionCard>
      </PageContainer>

      <CreateStaffModal
        isOpen={isCreateOpen}
        groups={groups}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => {
          if (page !== 1) setPage(1);
          else void fetchStaffs();
        }}
      />
    </>
  );
};

export default StaffManagementPage;
