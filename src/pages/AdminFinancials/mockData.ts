import type {
    WithdrawalRequest,
    FinancialMetrics,
} from '../../types/admin.types';

/**
 * Mock data for Admin Financials Module
 * Used for development and testing before backend integration
 */

// ============================================
// MOCK FINANCIAL METRICS
// ============================================

export const mockFinancialMetrics: any = {
    platformrevenue: 213450000, // VND - Platform fees collected this month
    escrowbalance: 45600000, // VND - Money held in escrow
    pendingwithdrawals: 12500000, // VND - Total pending withdrawal requests
    totalrefunds: 8750000, // VND - Total refunds in last 30 days
    monthlyrevenuegrowth: 12.5, // %
};

// ============================================
// MOCK WITHDRAWAL REQUESTS
// ============================================

export const mockWithdrawalRequests: any[] = [
    {
        withdrawalid: 'WD-992',
        tutorid: 'TUT-001',
        tutorname: 'Nguyễn Văn A',
        tutoravatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDI-YmjSx331niu75HJlIw9LJMth7qVRb1Si8eVKOe0gYAPTthYjHmogm6JKQ_pgUR8vQGciJprGIjWpnk5hi_Dvb3I-LVWIGHE89T1bLeZYmQxNDSTM9z_izWSG3ba3p7MvPL2bOzxruVUzETDSD0guMu9NWCFahWZTNAQlr5tH-VcFLx-q9aXGvC3LZWd7bkat-uWnfbHmTEBPD_nyRCtb45YrHS8D-mWvnhP-LXfgUQakeurVHSc3a-7QLzM7x8QWjGvLkNuqr8',
        tutorsubject: 'Toán học',
        amount: 5000000,
        bankname: 'Vietcombank',
        bankaccount: '**** 1234',
        bankaccountfull: '1234567890',
        status: 'pending',
        requestedat: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        processedat: null,
        processedby: null,
        rejectionnote: null,
    },
    {
        withdrawalid: 'WD-991',
        tutorid: 'TUT-002',
        tutorname: 'Trần Thị B',
        tutoravatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAgGVmiMa1qOpPl9ptdzQmoDOvRv81iK__Lau7oXY35Hqed699ccruST3HLpnAMp3WlqMTb7zYb1-h0qfuKV9IsGZnxHmY7n6iefXknJzQNVDyjF8kumQ8J_m4icZqU8xOkRrOROSijpdgfJMVnCVe70oyoPBUCIFJF8Kd1kppqA1bc7r2XBJE450VchjmKDRkOGcqirsPk1-zHHuhck8iKU51odEqRY9uulyEoruIju4pXIkbh_t_Xqz4AMiAr2rZGDJWpz0QzpyY',
        tutorsubject: 'Vật lý',
        amount: 3500000,
        bankname: 'Techcombank',
        bankaccount: '**** 5678',
        bankaccountfull: '5678901234',
        status: 'pending',
        requestedat: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        processedat: null,
        processedby: null,
        rejectionnote: null,
    },
    {
        withdrawalid: 'WD-990',
        tutorid: 'TUT-003',
        tutorname: 'Lê Văn C',
        tutoravatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfoPTqviyQwfEXTgibH4wMRXkJD6CN5H2GH6xtjpn3E2nlgadR4YcLpz_kpxv_BG43eqpj6koea1XRsQNJSPU-XOleaLq5dYlPwXqm3iVs65w7_0ixup07F0wxHdX0lbhLf8ZU1S1VvWUzh9LRSd8UJbUeUZr3ezKZOIdEAQBDQ_w4HAbodf1qfJiXm9vTrewxtSQduiB86tbj0DL5XT8A2h8R2gJ8oQbf_yRlBQP4g7qtAHdf2gDfxRKyy5LyUHRoyioarN-oy4w',
        tutorsubject: 'Hóa học',
        amount: 4000000,
        bankname: 'BIDV',
        bankaccount: '**** 9012',
        bankaccountfull: '9012345678',
        status: 'pending',
        requestedat: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
        processedat: null,
        processedby: null,
        rejectionnote: null,
    },
    {
        withdrawalid: 'WD-989',
        tutorid: 'TUT-004',
        tutorname: 'Phạm Thị D',
        tutoravatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXH0JZiBytEovqHxhoTP7ycg5FCGsD3jhOi1e3TmhKKGDiwzurTOcqS4lTKZV8PaZTxHLdnIQ_Xn_tgl0-lU0NNPXNfrCn3O5T8Y_FTx2l-DMpVsohxsowHZSTd2FM5WkDAZZyuUV1mGKMMGVoS9iKcn2G7qKfqeW0wsv4r9X6VsPTupbLu7mky6himXAtv25ihSi3NpcSx-pUNxWz5GGQLBQKgb7cEY4b_rPmoefsbnhBE3EYFIOmJ9fUTWSoaHnpxWvPGhJ8Heo',
        tutorsubject: 'Tiếng Anh',
        amount: 6000000,
        bankname: 'ACB',
        bankaccount: '**** 3456',
        bankaccountfull: '3456789012',
        status: 'approved',
        requestedat: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        processedat: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), // 20 hours ago
        processedby: 'Admin Lê',
        rejectionnote: null,
    },
    {
        withdrawalid: 'WD-988',
        tutorid: 'TUT-005',
        tutorname: 'Hoàng Văn E',
        tutoravatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMBrilX3h5Zs6XdyMjSCYGqJO_4gM3TLx6vbZtPLycGNYtfEO4cYD9lY8VVI0dwD-nJilY0gHxA-j1evOJYhy4GOPwUVcCs-i1krQmX8HuAf_zXDAfcMqpDIQWWt8GfWeFdOf2NLBThkjHseWDV3277IO8WrJojWT2eYuiyAg9nPspFFyDJWGL5IE5jWAt_ahFm5Mr2vh3SeUniGNFvJj-mQOGXw2fSb2MnC2FMCJkriNgS4xHQhIMPtR2wykda8VIaG4kYr7kKN8',
        tutorsubject: 'Lịch sử',
        amount: 2500000,
        bankname: 'MB Bank',
        bankaccount: '**** 7890',
        bankaccountfull: '7890123456',
        status: 'rejected',
        requestedat: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
        processedat: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(), // 40 hours ago
        processedby: 'Admin Nguyễn',
        rejectionnote: 'Thông tin ngân hàng không khớp với hồ sơ',
    },
];

// ============================================
// MOCK TRANSACTIONS LEDGER
// ============================================

const generateMockTransactions = (): any[] => {
    const transactions: any[] = [];
    const types: Array<'Deposit' | 'Escrow' | 'Release' | 'Refund' | 'Withdrawal' | 'Fee'> = [
        'Deposit',
        'Escrow',
        'Release',
        'Refund',
        'Withdrawal',
        'Fee',
    ];

    // Generate 100 transactions for testing pagination
    for (let i = 1; i <= 100; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const amount = Math.floor(Math.random() * 5000000) + 100000; // 100K - 5M VND
        const hoursAgo = Math.floor(Math.random() * 720); // Random within last 30 days

        transactions.push({
            transactionid: `TXN-${String(10000 - i).padStart(5, '0')}`,
            type,
            amount,
            userid: `USR-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
            username: `User ${i}`,
            description:
                type === 'Deposit'
                    ? 'Nạp tiền vào ví'
                    : type === 'Escrow'
                    ? `Giữ tiền booking #BK-${i}`
                    : type === 'Release'
                    ? `Giải phóng tiền booking #BK-${i}`
                    : type === 'Refund'
                    ? `Hoàn tiền booking #BK-${i}`
                    : type === 'Withdrawal'
                    ? `Rút tiền #WD-${i}`
                    : 'Phí nền tảng',
            bookingid: ['Escrow', 'Release', 'Refund'].includes(type) ? `BK-${String(i).padStart(4, '0')}` : null,
            createdat: new Date(Date.now() - 1000 * 60 * 60 * hoursAgo).toISOString(),
            status: Math.random() > 0.1 ? 'completed' : 'pending',
        });
    }

    return transactions.sort((a, b) => new Date(b.createdat).getTime() - new Date(a.createdat).getTime());
};

export const mockTransactions = generateMockTransactions();

// ============================================
// MOCK API FUNCTIONS
// ============================================

const delay = (ms: number = 500) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get financial metrics
 */
export const mockGetFinancialMetrics = async (): Promise<FinancialMetrics> => {
    await delay(600);
    return mockFinancialMetrics;
};

/**
 * Get withdrawal requests (with status filter)
 */
export const mockGetWithdrawalRequests = async (status?: string): Promise<WithdrawalRequest[]> => {
    await delay(600);

    if (status && status !== 'all') {
        return mockWithdrawalRequests.filter((w) => w.status === status);
    }

    return mockWithdrawalRequests;
};

/**
 * Approve withdrawal request
 */
export const mockApproveWithdrawal = async (withdrawalId: string): Promise<void> => {
    await delay(800);

    console.log(`[MOCK] Approving withdrawal ${withdrawalId}`);

    // Update mock data
    const withdrawal = mockWithdrawalRequests.find((w) => w.withdrawalid === withdrawalId);
    if (withdrawal) {
        withdrawal.status = 'approved';
        withdrawal.processedat = new Date().toISOString();
        withdrawal.processedby = 'Current Admin';
    }

    return;
};

/**
 * Reject withdrawal request
 */
export const mockRejectWithdrawal = async (withdrawalId: string, reason: string): Promise<void> => {
    await delay(800);

    console.log(`[MOCK] Rejecting withdrawal ${withdrawalId}:`, reason);

    // Update mock data
    const withdrawal = mockWithdrawalRequests.find((w) => w.withdrawalid === withdrawalId);
    if (withdrawal) {
        withdrawal.status = 'rejected';
        withdrawal.processedat = new Date().toISOString();
        withdrawal.processedby = 'Current Admin';
        withdrawal.rejectionnote = reason;
    }

    return;
};

/**
 * Get transactions with pagination and filters
 */
export const mockGetTransactions = async (
    limit: number = 50,
    offset: number = 0,
    type?: string,
    startDate?: string,
    endDate?: string
): Promise<{ transactions: any[]; total: number }> => {
    await delay(700);

    let filtered = [...mockTransactions];

    // Filter by type
    if (type && type !== 'all') {
        filtered = filtered.filter((t) => t.type === type);
    }

    // Filter by date range
    if (startDate) {
        filtered = filtered.filter((t) => new Date(t.createdat) >= new Date(startDate));
    }
    if (endDate) {
        filtered = filtered.filter((t) => new Date(t.createdat) <= new Date(endDate));
    }

    // Pagination
    const total = filtered.length;
    const transactions = filtered.slice(offset, offset + limit);

    return { transactions, total };
};

/**
 * Export transactions to CSV
 */
export const mockExportTransactionsCSV = async (
    type?: string,
    startDate?: string,
    endDate?: string
): Promise<string> => {
    await delay(1000);

    let filtered = [...mockTransactions];

    // Apply same filters
    if (type && type !== 'all') {
        filtered = filtered.filter((t) => t.type === type);
    }
    if (startDate) {
        filtered = filtered.filter((t) => new Date(t.createdat) >= new Date(startDate));
    }
    if (endDate) {
        filtered = filtered.filter((t) => new Date(t.createdat) <= new Date(endDate));
    }

    // Generate CSV content
    const headers = ['Transaction ID', 'Type', 'Amount (VND)', 'User', 'Description', 'Date', 'Status'];
    const rows = filtered.map((t) => [
        t.transactionid,
        t.type,
        t.amount.toString(),
        t.username,
        t.description,
        new Date(t.createdat).toLocaleString('vi-VN'),
        t.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    console.log(`[MOCK] Exported ${filtered.length} transactions to CSV`);

    return csvContent;
};
