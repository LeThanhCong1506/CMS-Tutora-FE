import React, { useEffect, useMemo, useState } from 'react';
import { PortalLayout } from '../components/shared/PortalLayout';
import type { NavItem } from '../components/shared/PortalLayout';
import { getPendingTutors, getPendingCertificates } from '../services/admin.service';
import { useAccess } from '../contexts/AccessContext';

const BADGE_FETCH_SIZE = 50;

type SecuredNavItem = Omit<NavItem, 'children'> & {
  permission?: string;
  anyOf?: string[];
  adminOnly?: boolean;
  children?: SecuredNavItem[];
};

const AdminLayout: React.FC = () => {
  const [pendingTutors, setPendingTutors] = useState(0);
  const [pendingCertificates, setPendingCertificates] = useState(0);
  const { isAdmin, isStaff, can, canAny } = useAccess();

  useEffect(() => {
    if (!canAny(['tutor_approval.view', 'certificate.view'])) return;
    if (can('tutor_approval.view')) {
      getPendingTutors(1, BADGE_FETCH_SIZE)
        .then((res) => setPendingTutors(res?.total || 0))
        .catch(() => undefined);
    }
    if (can('certificate.view')) {
      getPendingCertificates(1, BADGE_FETCH_SIZE)
        .then((res) => setPendingCertificates(res?.total || 0))
        .catch(() => undefined);
    }
  }, [can, canAny]);

  const navItems = useMemo<NavItem[]>(() => {
    const configured: SecuredNavItem[] = [
      { path: '/admin-portal/dashboard', label: 'Bảng điều khiển', materialIcon: 'dashboard', permission: 'dashboard.view' },
      {
        path: '/admin-portal/users',
        label: 'Quản lý người dùng',
        materialIcon: 'group',
        sectionLabel: 'Tài khoản',
        permission: 'user.view',
        children: [
          { path: '/admin-portal/users', label: 'Tất cả', materialIcon: 'groups', permission: 'user.view' },
          { path: '/admin-portal/users/students', label: 'Học viên', materialIcon: 'school', permission: 'user.view' },
          { path: '/admin-portal/users/parents', label: 'Phụ huynh', materialIcon: 'family_restroom', permission: 'user.view' },
          { path: '/admin-portal/users/tutors', label: 'Gia sư', materialIcon: 'cast_for_education', permission: 'user.view' },
        ],
      },
      { path: '/admin-portal/bookings', label: 'Quản lý đặt lịch', materialIcon: 'event_note', sectionLabel: 'Vận hành', permission: 'booking.view' },
      {
        path: '/admin-portal/vetting',
        label: 'Kiểm duyệt',
        materialIcon: 'description',
        badge: pendingTutors + pendingCertificates,
        children: [
          {
            path: '/admin-portal/vetting/profiles',
            label: 'Hồ sơ gia sư',
            materialIcon: 'badge',
            badge: pendingTutors,
            anyOf: ['tutor_approval.view', 'tutor_profile_update.view'],
          },
          { path: '/admin-portal/vetting/certificates', label: 'Chứng chỉ', materialIcon: 'workspace_premium', badge: pendingCertificates, permission: 'certificate.view' },
        ],
      },
      { path: '/admin-portal/disputes', label: 'Khiếu nại', materialIcon: 'gavel', permission: 'dispute.view' },
      { path: '/admin-portal/warnings', label: 'Cảnh báo', materialIcon: 'warning', permission: 'warning.view' },
      { path: '/admin-portal/resources/subjects', label: 'Môn & Lớp', materialIcon: 'category', sectionLabel: 'Tài nguyên', permission: 'lookup.view' },
      { path: '/admin-portal/resources/chapters', label: 'Chương & Loại câu', materialIcon: 'menu_book', permission: 'lookup.view' },
      { path: '/admin-portal/question-bank', label: 'Ngân hàng câu hỏi', materialIcon: 'quiz', permission: 'question_bank.view' },
      { path: '/admin-portal/financials', label: 'Tài chính', materialIcon: 'account_balance', sectionLabel: 'Tài chính', permission: 'financial.view' },
      { path: '/admin-portal/payouts', label: 'Payout', materialIcon: 'monitoring', permission: 'payout.view' },
      { path: '/admin-portal/staff', label: 'Quản lý nhân viên', materialIcon: 'badge', sectionLabel: 'Nhân sự & phân quyền', adminOnly: true },
      { path: '/admin-portal/permission-groups', label: 'Nhóm quyền', materialIcon: 'admin_panel_settings', adminOnly: true },
      { path: '/admin-portal/notifications', label: 'Thông báo', materialIcon: 'notifications', sectionLabel: 'Hệ thống', permission: 'notification.view' },
      { path: '/admin-portal/settings', label: 'Cài đặt', materialIcon: 'settings', permission: 'lookup.view' },
    ];

    const isVisible = (item: SecuredNavItem) => item.adminOnly
      ? isAdmin
      : item.permission
        ? can(item.permission)
        : item.anyOf
          ? canAny(item.anyOf)
          : true;

    return configured.flatMap((item): NavItem[] => {
      const visibleChildren = item.children
        ?.filter(isVisible)
        .map(({ permission, anyOf, adminOnly, ...child }) => {
          void permission;
          void anyOf;
          void adminOnly;
          return child;
        });
      const visible = item.children ? Boolean(visibleChildren?.length) : isVisible(item);
      if (!visible) return [];
      const {
        permission: _permission,
        anyOf: _anyOf,
        adminOnly: _adminOnly,
        ...navItem
      } = item;
      void _permission;
      void _anyOf;
      void _adminOnly;
      return [{ ...navItem, children: visibleChildren }];
    });
  }, [can, canAny, isAdmin, pendingCertificates, pendingTutors]);

  const isActive = (path: string, pathname: string) => {
    if (path === '/admin-portal/payouts') return pathname.startsWith('/admin-portal/payout');
    if (path === '/admin-portal/warnings') return pathname.startsWith('/admin-portal/warnings');
    if (path === '/admin-portal/bookings') return pathname.startsWith('/admin-portal/bookings');
    if (path === '/admin-portal/disputes') return pathname.startsWith('/admin-portal/disputes');
    if (path === '/admin-portal/resources/subjects') {
      return pathname.startsWith('/admin-portal/resources/subjects')
        || pathname.startsWith('/admin-portal/resources/grade-levels');
    }
    if (path === '/admin-portal/resources/chapters') {
      return pathname.startsWith('/admin-portal/resources/chapters')
        || pathname.startsWith('/admin-portal/resources/question-types');
    }
    if (path === '/admin-portal/question-bank') return pathname.startsWith('/admin-portal/question-bank');
    return pathname === path;
  };

  return (
    <PortalLayout
      navItems={navItems}
      userRole={isAdmin ? 'ADMIN' : isStaff ? 'STAFF' : 'USER'}
      isActive={isActive}
      showAvatarImage
    />
  );
};

export default AdminLayout;
