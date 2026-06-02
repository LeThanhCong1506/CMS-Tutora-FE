export interface FlatUserDetail {
    userid: string;
    fullname: string;
    email: string;
    phone: string;
    avatarurl: string;
    primaryrole: string;
    accountstatus: string;
    isidentityverified: boolean;
    createdat: string;
    lastloginat: string;
    warningcount: number;
    suspensioncount: number;
    walletbalance?: number;
    escrowbalance?: number;
    totalearnings?: number;
}

// Mock user list data
export const mockUsers: FlatUserDetail[] = [
    {
        userid: 'USR-001',
        fullname: 'Nguyễn Văn A',
        email: 'nguyenvana@gmail.com',
        phone: '0901234567',
        avatarurl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDI-YmjSx331niu75HJlIw9LJMth7qVRb1Si8eVKOe0gYAPTthYjHmogm6JKQ_pgUR8vQGciJprGIjWpnk5hi_Dvb3I-LVWIGHE89T1bLeZYmQxNDSTM9z_izWSG3ba3p7MvPL2bOzxruVUzETDSD0guMu9NWCFahWZTNAQlr5tH-VcFLx-q9aXGvC3LZWd7bkat-uWnfbHmTEBPD_nyRCtb45YrHS8D-mWvnhP-LXfgUQakeurVHSc3a-7QLzM7x8QWjGvLkNuqr8',
        primaryrole: 'tutor',
        accountstatus: 'active',
        isidentityverified: true,
        createdat: '2023-08-15T10:30:00Z',
        lastloginat: '2024-01-20T14:25:00Z',
        warningcount: 0,
        suspensioncount: 0,
        // Tutor-specific
        walletbalance: 12500000,
        escrowbalance: 3200000,
        totalearnings: 45000000,
    },
    {
        userid: 'USR-002',
        fullname: 'Sarah Jenkins',
        email: 'sarah.jenkins@example.com',
        phone: '0912345678',
        avatarurl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfz32ATF6j4EYMU4EU9u-wlrDY82lB8nPkzEdAmzwR-5zuYt5jyBqRd0bMOYsNCyyif-3tApntXBNNdm2wTJjojlM8H-EnQif5WKNxw2ECQSqpuXbV0jrfa3X90LXkp7CeW_JqG52bkg1AN8-9eY1Ffpjehbh3Cx4vSDLdT3oXWQPn634JIo2doT4su1evJBMPaTi_pbIWAa_EFRjG_y84d4hJZYUOVRAnm6nERP1sSMc6RhvFh6TeeLykvPzooCJhEhqqNJ-m-v8',
        primaryrole: 'tutor',
        accountstatus: 'active',
        isidentityverified: true,
        createdat: '2023-09-20T09:15:00Z',
        lastloginat: '2024-01-21T11:30:00Z',
        warningcount: 1,
        suspensioncount: 0,
        walletbalance: 8750000,
        escrowbalance: 1500000,
        totalearnings: 32000000,
    },
    {
        userid: 'USR-003',
        fullname: 'Trần Thị B',
        email: 'tranthib@gmail.com',
        phone: '0923456789',
        avatarurl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-RgLEJMH5nbo-3tyQEnt7kaT8CyGOKT_-4vo8liFbcLUymnBOjDN3JlZ4DQ6YL4lvxytFsp0iIkLkXH7eVa2R3yYNWhb_SC1QA4lKYCSyY5emWbHIfFGZFfW_9R65CYBcbKwa82DV7zGTokos2f35OxJcNvRpDrB6kSMXB3EjC1dIaWasOfVzfQgmtMCEtNzx49MyGh5zObnmitst_kYueiU4bnr-I2wpMBYKHYY4JPQ_mZsUv6jY8AKsFnSYOefyynEYeV6Q8gw',
        primaryrole: 'student',
        accountstatus: 'active',
        isidentityverified: true,
        createdat: '2024-01-05T16:45:00Z',
        lastloginat: '2024-01-21T09:00:00Z',
        warningcount: 0,
        suspensioncount: 0,
    },
    {
        userid: 'USR-004',
        fullname: 'David Chen',
        email: 'david.chen@example.com',
        phone: '0934567890',
        avatarurl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5OI74H0dALG0GJrWMfCNjQWOit2HroMVAIHfzWtM_ff01rW_Dmlr3avm5Up3W8fcRGkp8xxqDlzWmrzgX-MB8Mbh6sMbJDTnu9AmHqJYeYzNpTbiq_H7qVzSItdY3ok6IVAkmPpVphXa25pVjpAHO6_VYwkLrVIX2oB_Kn0e2B58yj929OHLVFBtgdAesn9xb4-C-SkgFfFlkWDAwU_mCHiK-0DdDYx1AcRV6SYo5lLIuBshkjY76a4pe85zJL_QdLK-2bRHyka8',
        primaryrole: 'tutor',
        accountstatus: 'suspended',
        isidentityverified: true,
        createdat: '2023-07-10T13:20:00Z',
        lastloginat: '2024-01-15T18:40:00Z',
        warningcount: 2,
        suspensioncount: 1,
        walletbalance: 4200000,
        escrowbalance: 0,
        totalearnings: 28000000,
    },
    {
        userid: 'USR-005',
        fullname: 'Lê Minh C',
        email: 'leminhc@gmail.com',
        phone: '0945678901',
        avatarurl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyZ5rQwT8FGqJ7LmN3pKsR4vXy9wBzA1eDfGhI2jKlM3nO4pQrS5tU6vWx7yZ8aB9cD0eF1gH2iJ3kL4mN5oP6qR7sT8uV9wX0yZ1aB2cD3eF4gH5iJ6kL7mN8oP9qR',
        primaryrole: 'student',
        accountstatus: 'active',
        isidentityverified: false,
        createdat: '2024-01-18T08:30:00Z',
        lastloginat: '2024-01-21T10:15:00Z',
        warningcount: 0,
        suspensioncount: 0,
    },
    {
        userid: 'USR-006',
        fullname: 'Emily Watson',
        email: 'emily.watson@example.com',
        phone: '0956789012',
        avatarurl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZY3xW2vU1tS0rQ9pO8nM7lK6jI5hG4fE3dC2bA1zY0xW9vU8tS7rQ6pO5nM4lK3jI2hG1fE0dC9bA8zY',
        primaryrole: 'tutor',
        accountstatus: 'blocked',
        isidentityverified: true,
        createdat: '2023-06-25T11:00:00Z',
        lastloginat: '2024-01-10T15:20:00Z',
        warningcount: 3,
        suspensioncount: 2,
        walletbalance: 0,
        escrowbalance: 0,
        totalearnings: 18500000,
    },
    {
        userid: 'USR-007',
        fullname: 'Phạm Văn D',
        email: 'phamvand@gmail.com',
        phone: '0967890123',
        avatarurl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuEaZ4yX3wV2uT1sR0qP9oN8mL7kJ6iH5gF4eD3cB2aZ1yX0wV9uT8sR7qP6oN5mL4kJ3iH2gF1eD0cB9aZ',
        primaryrole: 'student',
        accountstatus: 'active',
        isidentityverified: true,
        createdat: '2023-12-01T14:30:00Z',
        lastloginat: '2024-01-20T16:50:00Z',
        warningcount: 0,
        suspensioncount: 0,
    },
    {
        userid: 'USR-008',
        fullname: 'Michael Zhang',
        email: 'michael.zhang@example.com',
        phone: '0978901234',
        avatarurl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuFbZ5zY4xW3vU2tS1rQ0pO9nM8lK7jI6hG5fE4dC3bA2zY1xW0vU9tS8rQ7pO6nM5lK4jI3hG2fE1dC0bA9zY',
        primaryrole: 'tutor',
        accountstatus: 'active',
        isidentityverified: true,
        createdat: '2023-10-12T10:45:00Z',
        lastloginat: '2024-01-21T12:00:00Z',
        warningcount: 0,
        suspensioncount: 0,
        walletbalance: 15800000,
        escrowbalance: 2400000,
        totalearnings: 52000000,
    },
];

// Mock warnings data
export const mockWarnings: Record<string, any[]> = {
    'USR-002': [
        {
            warningid: 'WARN-001',
            userid: 'USR-002',
            reason: 'Đến muộn buổi học mà không thông báo trước',
            severity: 'medium',
            issuedby: 'Admin Team',
            createdat: '2023-11-15T09:30:00Z',
            relatedbookingid: 'BK-5521',
        },
    ],
    'USR-004': [
        {
            warningid: 'WARN-002',
            userid: 'USR-004',
            reason: 'Không hoàn thành buổi học đầy đủ',
            severity: 'high',
            issuedby: 'Admin Team',
            createdat: '2023-12-05T14:20:00Z',
            relatedbookingid: 'BK-6782',
        },
        {
            warningid: 'WARN-003',
            userid: 'USR-004',
            reason: 'Yêu cầu thanh toán bên ngoài nền tảng',
            severity: 'high',
            issuedby: 'Admin Team',
            createdat: '2024-01-10T11:45:00Z',
            relatedbookingid: 'BK-7234',
        },
    ],
    'USR-006': [
        {
            warningid: 'WARN-004',
            userid: 'USR-006',
            reason: 'Hủy buổi học vào phút chót nhiều lần',
            severity: 'medium',
            issuedby: 'Admin Team',
            createdat: '2023-10-20T16:00:00Z',
            relatedbookingid: null,
        },
        {
            warningid: 'WARN-005',
            userid: 'USR-006',
            reason: 'Thái độ không phù hợp với học viên',
            severity: 'high',
            issuedby: 'Admin Team',
            createdat: '2023-12-12T10:30:00Z',
            relatedbookingid: 'BK-6923',
        },
        {
            warningid: 'WARN-006',
            userid: 'USR-006',
            reason: 'Vi phạm quy định nền tảng nhiều lần',
            severity: 'high',
            issuedby: 'Super Admin',
            createdat: '2024-01-08T13:15:00Z',
            relatedbookingid: null,
        },
    ],
};

// Mock suspensions data
export const mockSuspensions: Record<string, any[]> = {
    'USR-004': [
        {
            suspensionid: 'SUSP-001',
            userid: 'USR-004',
            reason: 'Vi phạm quy định nền tảng nghiêm trọng',
            startdate: '2024-01-11T00:00:00Z',
            enddate: '2024-01-25T23:59:59Z',
            durationdays: 14,
            status: 'active',
            issuedby: 'Admin Team',
            createdat: '2024-01-11T09:00:00Z',
        },
    ],
    'USR-006': [
        {
            suspensionid: 'SUSP-002',
            userid: 'USR-006',
            reason: 'Hủy buổi học liên tục',
            startdate: '2023-10-22T00:00:00Z',
            enddate: '2023-11-05T23:59:59Z',
            durationdays: 14,
            status: 'expired',
            issuedby: 'Admin Team',
            createdat: '2023-10-22T08:30:00Z',
        },
        {
            suspensionid: 'SUSP-003',
            userid: 'USR-006',
            reason: 'Thái độ xấu với học viên - cảnh cáo lần 3',
            startdate: '2023-12-15T00:00:00Z',
            enddate: '2024-01-14T23:59:59Z',
            durationdays: 30,
            status: 'expired',
            issuedby: 'Super Admin',
            createdat: '2023-12-15T10:00:00Z',
        },
    ],
};

// Mock API functions
export const mockGetAllUsers = async (
    role?: string,
    status?: string,
    search?: string,
    limit: number = 50,
    offset: number = 0
): Promise<{ users: FlatUserDetail[]; total: number }> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    let filtered = [...mockUsers];

    // Filter by role
    if (role && role !== 'all') {
        filtered = filtered.filter((u) => u.primaryrole === role);
    }

    // Filter by status
    if (status && status !== 'all') {
        filtered = filtered.filter((u) => u.accountstatus === status);
    }

    // Filter by search
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
            (u) =>
                u.fullname.toLowerCase().includes(searchLower) ||
                u.email.toLowerCase().includes(searchLower) ||
                u.userid.toLowerCase().includes(searchLower)
        );
    }

    // Pagination
    const paginated = filtered.slice(offset, offset + limit);

    return {
        users: paginated,
        total: filtered.length,
    };
};

export const mockGetUserDetail = async (userId: string): Promise<FlatUserDetail | null> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const user = mockUsers.find((u) => u.userid === userId);
    if (!user) return null;

    return user;
};

export const mockGetUserWarnings = async (userId: string): Promise<any[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return mockWarnings[userId] || [];
};

export const mockGetUserSuspensions = async (userId: string): Promise<any[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return mockSuspensions[userId] || [];
};

export const mockBlockUser = async (userId: string, reason: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    console.log(`Blocking user ${userId} with reason: ${reason}`);
    // In real implementation, would update user status to 'blocked'
};

export const mockUnblockUser = async (userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    console.log(`Unblocking user ${userId}`);
    // In real implementation, would update user status to 'active'
};

export const mockIssueWarning = async (userId: string, reason: string, severity: string, _relatedBookingId?: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    console.log(`Issuing ${severity} warning to user ${userId}: ${reason}`);
    // In real implementation, would create new warning record
};

export const mockSuspendUser = async (userId: string, reason: string, durationDays: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    console.log(`Suspending user ${userId} for ${durationDays} days: ${reason}`);
    // In real implementation, would update user status and create suspension record
};

export const mockResetPassword = async (userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    console.log(`Password reset email sent to user ${userId}`);
    // In real implementation, would send password reset email
};
