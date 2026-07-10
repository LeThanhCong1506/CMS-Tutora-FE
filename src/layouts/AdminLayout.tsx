import React, { useState, useEffect } from 'react';
import { PortalLayout } from '../components/shared/PortalLayout';
import type { NavItem } from '../components/shared/PortalLayout';
import { getPendingTutors, getPendingCertificates } from '../services/admin.service';

// BE caps PageSize at 50 and the CORS policy doesn't expose the X-Pagination
// header, so `total` falls back to the returned slice length. Request the full
// cap in one page so the badge counts reflect the real pending totals.
const BADGE_FETCH_SIZE = 50;

const AdminLayout: React.FC = () => {
    const [pendingTutors, setPendingTutors] = useState(0);
    const [pendingCertificates, setPendingCertificates] = useState(0);

    // Fetch pending profile + certificate counts for the vetting badges.
    useEffect(() => {
        getPendingTutors(1, BADGE_FETCH_SIZE).then((res) => {
            setPendingTutors(res?.total || 0);
        }).catch(() => { /* ignore */ });

        getPendingCertificates(1, BADGE_FETCH_SIZE).then((res) => {
            setPendingCertificates(res?.total || 0);
        }).catch(() => { /* ignore */ });
    }, []);

    // Sidebar chia nhóm theo domain nghiệp vụ. "Tài khoản" gom người dùng nền
    // tảng (khách hàng) và nhân viên nội bộ — 2 mục riêng vì lifecycle + hành
    // động khác nhau, không gộp thành menu cha-con.
    const navItems: NavItem[] = [
        { path: '/admin-portal/dashboard', label: 'Bảng điều khiển', materialIcon: 'dashboard' },
        { path: '/admin-portal/users', label: 'Quản lý người dùng', materialIcon: 'group', sectionLabel: 'Tài khoản' },
        { path: '/admin-portal/staff', label: 'Quản lý nhân viên', materialIcon: 'badge' },
        { path: '/admin-portal/bookings', label: 'Quản lý đặt lịch', materialIcon: 'event_note', sectionLabel: 'Vận hành' },
        {
            path: '/admin-portal/vetting',
            label: 'Kiểm duyệt',
            materialIcon: 'description',
            badge: pendingTutors + pendingCertificates,
            children: [
                { path: '/admin-portal/vetting/profiles', label: 'Hồ sơ gia sư', materialIcon: 'badge', badge: pendingTutors },
                { path: '/admin-portal/vetting/certificates', label: 'Chứng chỉ', materialIcon: 'workspace_premium', badge: pendingCertificates },
            ],
        },
        { path: '/admin-portal/disputes', label: 'Khiếu nại', materialIcon: 'gavel' },
        { path: '/admin-portal/warnings', label: 'Cảnh báo', materialIcon: 'warning' },
        { path: '/admin-portal/question-bank', label: 'Ngân hàng câu hỏi', materialIcon: 'quiz' },
        { path: '/admin-portal/financials', label: 'Tài chính', materialIcon: 'account_balance' },
        { path: '/admin-portal/payouts', label: 'Payout', materialIcon: 'monitoring' },
        { path: '/admin-portal/settings', label: 'Cài đặt', materialIcon: 'settings', sectionLabel: 'Hệ thống' },
    ];

    const isActive = (path: string, pathname: string) => {
        if (path === '/admin-portal/payouts') {
            return pathname.startsWith('/admin-portal/payout');
        }
        if (path === '/admin-portal/warnings') {
            return pathname.startsWith('/admin-portal/warnings');
        }
        if (path === '/admin-portal/bookings') {
            return pathname.startsWith('/admin-portal/bookings');
        }
        if (path === '/admin-portal/disputes') {
            return pathname.startsWith('/admin-portal/disputes');
        }
        return pathname === path;
    };

    return (
        <PortalLayout
            navItems={navItems}
            userRole="ADMIN"
            isActive={isActive}

            showAvatarImage={true}
        />
    );
};

export default AdminLayout;
