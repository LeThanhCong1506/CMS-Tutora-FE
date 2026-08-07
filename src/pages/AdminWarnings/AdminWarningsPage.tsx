import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getActiveSuspensions, getUserWarnings, unsuspendUser } from '../../services/admin.service';
import { DataTable, FilterTabs, PageContainer, SectionCard, StatCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn, StatusVariant } from '../../components/shared';
import type { AdminUserWarningSummary, AdminWarningHistoryItem } from '../../types/admin.types';
import { Can } from '../../contexts/AccessContext';
import '../../styles/pages/admin-warnings.css';

interface SuspensionListItem {
    suspensionId: number;
    userId?: string;
    userName?: string;
    userEmail?: string;
    suspensionType: string;
    reason?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    createdByName?: string;
    timeRemainingDisplay?: string;
    suspensionTypeDisplay?: string;
}

type TabKey = 'suspensions' | 'lookup';

type ApiEnvelope<T> = {
    content?: T;
    data?: T;
};

type PagedContent<T> = T[] | {
    items?: T[];
    total?: number;
    totalCount?: number;
    totalItems?: number;
};

const tabs = [
    { key: 'suspensions', label: 'Đình chỉ đang hoạt động' },
    { key: 'lookup', label: 'Tra cứu cảnh báo' },
];

const unwrapContent = <T,>(response: unknown): T | undefined => {
    const envelope = response as ApiEnvelope<T>;
    return envelope?.content ?? envelope?.data ?? (response as T);
};

const parsePagedItems = <T,>(response: unknown): { items: T[]; total: number } => {
    const content = unwrapContent<PagedContent<T>>(response);

    if (Array.isArray(content)) {
        return { items: content, total: content.length };
    }

    const items = content?.items ?? [];
    const total = content?.total ?? content?.totalCount ?? content?.totalItems ?? items.length;
    return { items, total };
};

const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getSuspensionVariant = (type: string): StatusVariant => (
    type === 'account_locked' ? 'error' : 'warning'
);

const getWarningVariant = (level: number): StatusVariant => (
    level >= 2 ? 'error' : 'warning'
);

const AdminWarningsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('suspensions');
    const [suspensions, setSuspensions] = useState<SuspensionListItem[]>([]);
    const [suspensionsTotal, setSuspensionsTotal] = useState(0);
    const [suspensionsLoading, setSuspensionsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = ADMIN_PAGE_SIZE;
    const [searchUserId, setSearchUserId] = useState('');
    const [warningSummary, setWarningSummary] = useState<AdminUserWarningSummary | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);

    const fetchSuspensions = useCallback(async () => {
        try {
            setSuspensionsLoading(true);
            const response = await getActiveSuspensions(currentPage, pageSize);
            const parsed = parsePagedItems<SuspensionListItem>(response);
            setSuspensions(parsed.items);
            setSuspensionsTotal(parsed.total);
        } catch {
            toast.error('Không thể tải danh sách đình chỉ.');
            setSuspensions([]);
            setSuspensionsTotal(0);
        } finally {
            setSuspensionsLoading(false);
        }
    }, [currentPage]);

    useEffect(() => {
        if (activeTab === 'suspensions') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void fetchSuspensions();
        }
    }, [activeTab, fetchSuspensions]);

    const handleUnsuspend = useCallback(async (userId: string, userName?: string) => {
        const confirmed = window.confirm(`Bạn có chắc muốn gỡ đình chỉ cho ${userName || userId}?`);
        if (!confirmed) return;

        try {
            await unsuspendUser(userId);
            toast.success(`Đã gỡ đình chỉ cho ${userName || userId}`);
            await fetchSuspensions();
        } catch {
            toast.error('Không thể gỡ đình chỉ. Vui lòng thử lại.');
        }
    }, [fetchSuspensions]);

    const handleLookup = async () => {
        const userId = searchUserId.trim();
        if (!userId) {
            toast.warn('Vui lòng nhập User ID.');
            return;
        }

        try {
            setLookupLoading(true);
            setWarningSummary(await getUserWarnings(userId));
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response?.status;
            toast.error(status === 404 ? 'Không tìm thấy user.' : 'Lỗi khi tra cứu cảnh báo.');
            setWarningSummary(null);
        } finally {
            setLookupLoading(false);
        }
    };

    const totalWarningsInResult = warningSummary?.totalWarnings ?? 0;

    const suspensionColumns = useMemo<DataTableColumn<SuspensionListItem>[]>(() => [
        {
            key: 'user',
            title: 'Người dùng',
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{record.userName || 'N/A'}</span>
                    <span className="admin-ui-entity-secondary">{record.userEmail || record.userId || 'N/A'}</span>
                </div>
            ),
            minWidth: 220,
        },
        {
            key: 'type',
            title: 'Loại',
            render: (record) => (
                <StatusBadge variant={getSuspensionVariant(record.suspensionType)} shape="tag">
                    {record.suspensionTypeDisplay || record.suspensionType}
                </StatusBadge>
            ),
            minWidth: 160,
        },
        {
            key: 'reason',
            title: 'Lý do',
            render: (record) => (
                <span className="warnings-reason-text" title={record.reason}>
                    {record.reason || '—'}
                </span>
            ),
            minWidth: 240,
        },
        {
            key: 'duration',
            title: 'Thời hạn',
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{formatDate(record.startDate)}</span>
                    <span className="admin-ui-entity-secondary">{record.endDate ? formatDate(record.endDate) : 'Không thời hạn'}</span>
                </div>
            ),
            hideOnMobile: true,
            minWidth: 180,
        },
        {
            key: 'remaining',
            title: 'Còn lại',
            render: (record) => (
                <span className={record.timeRemainingDisplay === 'Sắp gỡ' ? 'warnings-good-text' : 'warnings-danger-text'}>
                    {record.timeRemainingDisplay || '—'}
                </span>
            ),
            hideOnMobile: true,
            minWidth: 120,
        },
        {
            key: 'action',
            title: 'Hành động',
            align: 'right',
            render: (record) => (
                record.userId ? (
                    <Can permission="suspension.manage">
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-success warnings-action-button"
                        onClick={() => void handleUnsuspend(record.userId!, record.userName)}
                    >
                        Gỡ
                    </button>
                    </Can>
                ) : (
                    <span className="admin-ui-table-meta">—</span>
                )
            ),
            minWidth: 100,
        },
    ], [handleUnsuspend]);

    const warningColumns = useMemo<DataTableColumn<AdminWarningHistoryItem>[]>(() => [
        {
            key: 'level',
            title: 'Mức',
            render: (record) => (
                <StatusBadge variant={getWarningVariant(record.warningLevel)} shape="tag">
                    {record.warningLevelDisplay || `Mức ${record.warningLevel}`}
                </StatusBadge>
            ),
            minWidth: 120,
        },
        {
            key: 'reason',
            title: 'Lý do',
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{record.reason || '—'}</span>
                    {record.relatedBookingId && (
                        <span className="admin-ui-entity-secondary">Booking #{record.relatedBookingId}</span>
                    )}
                </div>
            ),
            minWidth: 260,
        },
        {
            key: 'createdAt',
            title: 'Thời gian',
            render: (record) => <span className="admin-ui-table-meta">{formatDate(record.createdAt)}</span>,
            hideOnMobile: true,
            minWidth: 160,
        },
        {
            key: 'issuedBy',
            title: 'Người cảnh báo',
            render: (record) => <span className="admin-ui-table-meta">{record.issuedByName || '—'}</span>,
            hideOnMobile: true,
            minWidth: 160,
        },
    ], []);

    return (
        <PageContainer
            eyebrow="Vận hành"
            title="Quản lý cảnh báo & đình chỉ"
            subtitle="Theo dõi đình chỉ đang hoạt động và tra cứu lịch sử cảnh báo theo user."
            maxWidth="wide"
            headerAction={
                <div className="admin-ui-actions">
                    <span className="admin-ui-code-chip">{suspensionsTotal.toLocaleString('vi-VN')} đình chỉ</span>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={() => void fetchSuspensions()}
                    >
                        <span className="material-symbols-outlined">refresh</span>
                        Làm mới
                    </button>
                </div>
            }
        >
            <SectionCard>
                <div className="admin-ui-toolbar warnings-tabs-toolbar">
                    <FilterTabs
                        tabs={tabs}
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as TabKey)}
                    />
                </div>
            </SectionCard>

            {activeTab === 'suspensions' && (
                <SectionCard
                    title="Đình chỉ đang hoạt động"
                    subtitle="Các tài khoản đang bị ẩn hồ sơ hoặc khóa do vi phạm chính sách."
                    footer={`Hiển thị ${suspensions.length} / ${suspensionsTotal.toLocaleString('vi-VN')} đình chỉ`}
                >
                    <DataTable<SuspensionListItem>
                        columns={suspensionColumns}
                        data={suspensions}
                        rowKey="suspensionId"
                        loading={suspensionsLoading}
                        loadingText="Đang tải danh sách đình chỉ..."
                        emptyText="Không có đình chỉ nào đang hoạt động"
                        emptyIcon={
                            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                                verified_user
                            </span>
                        }
                        pagination={{
                            current: currentPage,
                            pageSize,
                            total: suspensionsTotal,
                            onChange: setCurrentPage,
                        }}
                        minWidth={1080}
                        variant="embedded"
                        density="compact"
                        adaptive
                    />
                </SectionCard>
            )}

            {activeTab === 'lookup' && (
                <>
                    <SectionCard
                        title="Tra cứu cảnh báo"
                        subtitle="Nhập User ID để xem tổng quan cảnh báo, trạng thái đình chỉ và lịch sử vi phạm."
                    >
                        <div className="admin-ui-toolbar warnings-lookup-toolbar">
                            <div className="admin-ui-search warnings-lookup-search">
                                <span className="material-symbols-outlined admin-ui-search-icon">search</span>
                                <input
                                    className="admin-ui-search-input"
                                    placeholder="Nhập User ID để tra cứu..."
                                    type="search"
                                    value={searchUserId}
                                    onChange={(event) => setSearchUserId(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            void handleLookup();
                                        }
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-primary"
                                onClick={() => void handleLookup()}
                                disabled={lookupLoading}
                            >
                                {lookupLoading ? 'Đang tìm...' : 'Tra cứu'}
                            </button>
                        </div>
                    </SectionCard>

                    {lookupLoading && (
                        <SectionCard padded>
                            <div className="admin-ui-muted-state">Đang tra cứu cảnh báo...</div>
                        </SectionCard>
                    )}

                    {!lookupLoading && warningSummary && (
                        <>
                            <SectionCard
                                title={warningSummary.fullName || warningSummary.userId || 'Người dùng'}
                                subtitle={warningSummary.email || 'Không có email'}
                                headerAction={
                                    warningSummary.isSuspended ? (
                                        <StatusBadge variant="error" shape="tag">
                                            Đang đình chỉ {warningSummary.suspensionType ? `(${warningSummary.suspensionType})` : ''}
                                        </StatusBadge>
                                    ) : (
                                        <StatusBadge variant="success" shape="tag">Đang hoạt động</StatusBadge>
                                    )
                                }
                                padded
                            >
                                <div className="admin-ui-kpi-grid">
                                    <StatCard
                                        icon={<span className="material-symbols-outlined">warning</span>}
                                        value={warningSummary.totalWarnings}
                                        label="Tổng cảnh báo"
                                        badge={totalWarningsInResult > 0 ? 'Có lịch sử' : 'Sạch'}
                                        badgeVariant={totalWarningsInResult > 0 ? 'red' : 'green'}
                                    />
                                    <StatCard
                                        icon={<span className="material-symbols-outlined">priority_high</span>}
                                        value={warningSummary.level1Warnings}
                                        label="Mức 1"
                                        badgeVariant="orange"
                                    />
                                    <StatCard
                                        icon={<span className="material-symbols-outlined">report</span>}
                                        value={warningSummary.level2Warnings}
                                        label="Mức 2"
                                        badgeVariant="red"
                                    />
                                    <StatCard
                                        icon={<span className="material-symbols-outlined">calendar_month</span>}
                                        value={warningSummary.warningsLast30Days}
                                        label="30 ngày qua"
                                        badgeVariant="blue"
                                    />
                                </div>
                            </SectionCard>

                            <SectionCard
                                title="Lịch sử cảnh báo"
                                subtitle="Các cảnh báo đã phát hành cho user này."
                                footer={`Hiển thị ${warningSummary.warnings.length} cảnh báo`}
                            >
                                <DataTable<AdminWarningHistoryItem>
                                    columns={warningColumns}
                                    data={warningSummary.warnings}
                                    rowKey="warningId"
                                    emptyText="Người dùng này chưa có cảnh báo nào"
                                    emptyIcon={
                                        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                                            task_alt
                                        </span>
                                    }
                                    minWidth={760}
                                    variant="embedded"
                                    density="compact"
                                    adaptive
                                />
                            </SectionCard>
                        </>
                    )}

                    {!lookupLoading && !warningSummary && searchUserId && (
                        <SectionCard padded>
                            <div className="admin-ui-muted-state">Nhấn “Tra cứu” để tìm kiếm user.</div>
                        </SectionCard>
                    )}
                </>
            )}
        </PageContainer>
    );
};

export default AdminWarningsPage;
