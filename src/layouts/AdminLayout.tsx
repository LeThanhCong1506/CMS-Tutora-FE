import React, { useEffect, useMemo, useState } from 'react';
import { PortalLayout } from '../components/shared/PortalLayout';
import type { NavItem } from '../components/shared/PortalLayout';
import { getPendingTutors, getPendingCertificates, getPendingProfileUpdateRequests } from '../services/admin.service';
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
  const [pendingProfileUpdates, setPendingProfileUpdates] = useState(0);
  const [pendingCertificates, setPendingCertificates] = useState(0);
  const { isAdmin, isStaff, can, canAny } = useAccess();

  useEffect(() => {
    if (!canAny(['tutor_approval.view', 'tutor_profile_update.view', 'certificate.view'])) return;

    const fetchBadgeCounts = () => {
      if (can('tutor_approval.view')) {
        getPendingTutors(1, BADGE_FETCH_SIZE)
          .then((res) => setPendingTutors(res?.total || 0))
          .catch(() => undefined);
      }
      if (can('tutor_profile_update.view')) {
        // Không phân trang (BE không hỗ trợ) — dùng luôn content.length làm tổng số yêu cầu chờ duyệt.
        getPendingProfileUpdateRequests()
          .then((res) => setPendingProfileUpdates(res?.content?.length || 0))
          .catch(() => undefined);
      }
      if (can('certificate.view')) {
        getPendingCertificates(1, BADGE_FETCH_SIZE)
          .then((res) => setPendingCertificates(res?.total || 0))
          .catch(() => undefined);
      }
    };

    fetchBadgeCounts();

    // AdminLayout ở mức khung, không remount khi điều hướng giữa các trang trong /admin-portal —
    // nên chỉ fetch 1 lần lúc mount thì số badge (hồ sơ/chứng chỉ chờ duyệt) đứng yên mãi, không
    // tự trừ khi Admin duyệt/từ chối ngay trên trang con. Trang con phát event này sau khi
    // duyệt/từ chối thành công để badge cập nhật ngay, không cần rời trang rồi quay lại.
    window.addEventListener('tutora:admin-badge-refresh', fetchBadgeCounts);
    return () => window.removeEventListener('tutora:admin-badge-refresh', fetchBadgeCounts);
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
        badge: pendingTutors + pendingProfileUpdates + pendingCertificates,
        children: [
          {
            path: '/admin-portal/vetting/profiles',
            label: 'Hồ sơ gia sư',
            materialIcon: 'badge',
            // Gộp cả "Hồ sơ mới" và "Yêu cầu cập nhật hồ sơ" — 2 tab con của cùng trang này —
            // để Admin không thấy badge "còn 0 việc" trong khi vẫn còn yêu cầu cập nhật chưa duyệt.
            badge: pendingTutors + pendingProfileUpdates,
            anyOf: ['tutor_approval.view', 'tutor_profile_update.view'],
          },
          { path: '/admin-portal/vetting/certificates', label: 'Chứng chỉ', materialIcon: 'workspace_premium', badge: pendingCertificates, permission: 'certificate.view' },
        ],
      },
      {
        path: '/admin-portal/disputes',
        label: 'Tranh chấp',
        materialIcon: 'gavel',
        children: [
          { path: '/admin-portal/disputes', label: 'Khiếu nại', materialIcon: 'gavel', permission: 'dispute.view' },
          { path: '/admin-portal/warnings', label: 'Cảnh báo', materialIcon: 'warning', permission: 'warning.view' },
        ]
      },
      { path: '/admin-portal/feedbacks', label: 'Đánh giá', materialIcon: 'reviews', permission: 'feedback.view' },
      { path: '/admin-portal/policies', label: 'Văn bản chính sách', materialIcon: 'gavel', permission: 'policy.view' },
      {
        path: '/admin-portal/reports',
        label: 'Báo cáo',
        materialIcon: 'analytics',
        sectionLabel: 'Tài chính',
        children: [
          { path: '/admin-portal/revenue-reports/overview', label: 'Báo cáo doanh thu', materialIcon: 'insights', permission: 'financial.view' },
          { path: '/admin-portal/financials', label: 'Tài chính', materialIcon: 'account_balance', permission: 'financial.view' },
          { path: '/admin-portal/finance-new', label: 'Quản lý tài chính (mới)', materialIcon: 'account_balance_wallet', permission: 'financial.view' },
        ]
      },
      { path: '/admin-portal/payouts', label: 'Payout', materialIcon: 'monitoring', permission: 'payout.view' },
      {
        path: '/admin-portal/resources',
        label: 'Cấu hình chương trình',
        materialIcon: 'folder',
        sectionLabel: 'Tài nguyên',
        children: [
          { path: '/admin-portal/resources/subjects', label: 'Môn & Lớp', materialIcon: 'category', permission: 'lookup.view' },
          { path: '/admin-portal/resources/chapters', label: 'Chương & Loại câu', materialIcon: 'menu_book', permission: 'lookup.view' },
        ]
      },
      { path: '/admin-portal/question-bank', label: 'Ngân hàng câu hỏi', materialIcon: 'quiz', permission: 'question_bank.view' },
      { path: '/admin-portal/ai-credit/packages', label: 'Gói & Hạn Mức', materialIcon: 'package_2', sectionLabel: 'Tài nguyên AI', permission: 'financial.view',},
      // TEMP: proposal page, running on mock data — see src/pages/AdminFinanceNew
      { path: '/admin-portal/staff', label: 'Quản lý nhân viên', materialIcon: 'badge', sectionLabel: 'Nhân sự & phân quyền', adminOnly: true },
      { path: '/admin-portal/permission-groups', label: 'Nhóm quyền', materialIcon: 'admin_panel_settings', adminOnly: true },
      { path: '/admin-portal/notifications', label: 'Thông báo', materialIcon: 'notifications', sectionLabel: 'Hệ thống', permission: 'notification.view' },
      { path: '/admin-portal/support', label: 'Nhắn tin hỗ trợ', materialIcon: 'support_agent', permission: 'support.view' },
      { path: '/admin-portal/knowledge-base', label: 'Thông tin Hệ thống', materialIcon: 'auto_stories', permission: 'knowledge_base.view' },
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
  }, [can, canAny, isAdmin, pendingCertificates, pendingProfileUpdates, pendingTutors]);

  const isActive = (path: string, pathname: string) => {
    if (path === '/admin-portal/payouts') return pathname.startsWith('/admin-portal/payout');
    if (path.startsWith('/admin-portal/revenue-reports')) {
      return pathname.startsWith('/admin-portal/revenue-reports');
    }
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
    if (path === '/admin-portal/ai-credit/packages') return pathname.startsWith('/admin-portal/ai-credit');
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
