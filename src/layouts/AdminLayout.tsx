import React, { useState, useEffect } from 'react';
import { PortalLayout } from '../components/shared/PortalLayout';
import type { NavItem } from '../components/shared/PortalLayout';
import { getPendingTutors } from '../services/admin.service';

const AdminLayout: React.FC = () => {
    const [pendingCount, setPendingCount] = useState(0);

    // Fetch pending tutors count for vetting badge
    useEffect(() => {
        getPendingTutors(1, 1).then((res) => {
            setPendingCount(res?.total || 0);
        }).catch(() => { /* ignore */ });
    }, []);

    const navItems: NavItem[] = [
        { path: '/admin-portal/dashboard', label: 'Bảng điều khiển', materialIcon: 'dashboard' },
        { path: '/admin-portal/users', label: 'Quản lý người dùng', materialIcon: 'group' },
        { path: '/admin-portal/bookings', label: 'Quản lý đặt lịch', materialIcon: 'event_note' },
        {
            path: '/admin-portal/vetting',
            label: 'Kiểm duyệt',
            materialIcon: 'description',
            badge: pendingCount,
            children: [
                { path: '/admin-portal/vetting/profiles', label: 'Hồ sơ gia sư', materialIcon: 'badge' },
                { path: '/admin-portal/vetting/certificates', label: 'Chứng chỉ', materialIcon: 'workspace_premium' },
            ],
        },
        { path: '/admin-portal/disputes', label: 'Khiếu nại', materialIcon: 'gavel' },
        { path: '/admin-portal/warnings', label: 'Cảnh báo', materialIcon: 'warning' },
        { path: '/admin-portal/financials', label: 'Tài chính', materialIcon: 'account_balance' },
        { path: '/admin-portal/payouts', label: 'Payout', materialIcon: 'monitoring' },
        { path: '/admin-portal/settings', label: 'Cài đặt', materialIcon: 'settings' },
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
