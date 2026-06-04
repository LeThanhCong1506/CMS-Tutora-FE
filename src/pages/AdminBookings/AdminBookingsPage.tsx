import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import { getAdminBookings } from '../../services/adminBooking.service';
import type {
    AdminBookingListItem,
    AdminBookingListParams,
} from '../../types/adminBooking.types';
import { formatDateTime } from '../../utils/formatters';
import {
    getBookingStatusDisplay,
    getTeachingModeLabel,
    formatVND,
} from './bookingDisplay';
import BookingFilterBar from './BookingFilterBar';

const PAGE_SIZE = 20;

/**
 * Admin Booking list page — gọi GET /api/admin/bookings với filter đa chiều.
 *
 * Pattern theo `UserManagementPage`:
 *  - `searchInput` (live keystroke) vs `searchQuery` (committed) → tránh API call
 *    mỗi keystroke
 *  - AbortController cho race condition khi filter đổi nhanh
 */
export default function AdminBookingsPage() {
    const navigate = useNavigate();

    // Data state
    const [bookings, setBookings] = useState<AdminBookingListItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    // Filters
    const [status, setStatus] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // AbortController giữa các fetch — tránh response cũ ghi đè response mới
    const fetchAbortRef = useRef<AbortController | null>(null);

    const fetchBookings = useCallback(async () => {
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        setLoading(true);
        try {
            const params: AdminBookingListParams = { page, pageSize: PAGE_SIZE };
            if (status) params.status = status;
            if (from) params.from = from;
            if (to) params.to = to;
            if (searchQuery) params.search = searchQuery;

            const res = await getAdminBookings(params, controller.signal);

            if (controller.signal.aborted) return; // dropped: newer request started

            setBookings(res.content?.items ?? []);
            setTotalCount(res.content?.totalCount ?? 0);
        } catch (err: unknown) {
            // Bỏ qua nếu request bị abort (user đổi filter quá nhanh)
            if (controller.signal.aborted) return;
            const e = err as { code?: string; name?: string; message?: string };
            if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError') return;
            console.error('getAdminBookings failed:', err);
            toast.error('Không thể tải danh sách booking. Vui lòng thử lại.', {
                toastId: 'admin-bookings-load-error',
            });
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, [from, page, searchQuery, status, to]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchBookings();
        return () => fetchAbortRef.current?.abort();
    }, [fetchBookings]);

    const resetFilters = () => {
        setStatus('');
        setFrom('');
        setTo('');
        setSearchInput('');
        setSearchQuery('');
        setPage(1);
    };

    // Bất cứ filter nào đổi → reset về trang 1 (trừ pagination change)
    const handleStatusChange = (v: string) => {
        setStatus(v);
        setPage(1);
    };
    const handleDateRangeChange = (newFrom: string, newTo: string) => {
        setFrom(newFrom);
        setTo(newTo);
        setPage(1);
    };
    const handleSearchSubmit = () => {
        setSearchQuery(searchInput.trim());
        setPage(1);
    };

    const columns: DataTableColumn<AdminBookingListItem>[] = [
        {
            key: 'bookingId',
            title: 'Mã booking',
            dataIndex: 'bookingId',
            width: 100,
            render: (record) => <span className="admin-ui-code-chip">#{record.bookingId}</span>,
        },
        {
            key: 'student',
            title: 'Học sinh',
            minWidth: 160,
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{record.studentName ?? '—'}</span>
                    {record.gradeLevel && (
                        <span className="admin-ui-entity-secondary">{record.gradeLevel}</span>
                    )}
                </div>
            ),
        },
        {
            key: 'tutor',
            title: 'Gia sư',
            minWidth: 160,
            render: (record) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{record.tutorName ?? '—'}</span>
                </div>
            ),
        },
        {
            key: 'subject',
            title: 'Môn học',
            dataIndex: 'subjectName',
            minWidth: 110,
            render: (record) => record.subjectName ?? '—',
            hideOnMobile: true,
        },
        {
            key: 'createdAt',
            title: 'Ngày tạo',
            minWidth: 130,
            render: (record) => (
                <span className="admin-ui-table-meta">
                    {record.createdAt ? formatDateTime(record.createdAt) : '—'}
                </span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            minWidth: 150,
            render: (record) => {
                const { label, variant } = getBookingStatusDisplay(record.status);
                return <StatusBadge variant={variant}>{label}</StatusBadge>;
            },
        },
        {
            key: 'teachingMode',
            title: 'Hình thức',
            minWidth: 100,
            render: (record) => getTeachingModeLabel(record.teachingMode),
            hideOnMobile: true,
        },
        {
            key: 'finalPrice',
            title: 'Tổng tiền',
            align: 'right',
            minWidth: 130,
            render: (record) => (
                <span className="admin-ui-amount">{formatVND(record.finalPrice ?? record.price)}</span>
            ),
        },
        {
            key: 'action',
            title: '',
            width: 90,
            align: 'right',
            render: (record) => (
                <button
                    type="button"
                    className="admin-ui-button admin-ui-button-secondary"
                    onClick={() => navigate(`/admin-portal/bookings/${record.bookingId}`)}
                >
                    Chi tiết
                </button>
            ),
        },
    ];

    return (
        <PageContainer
            eyebrow="Vận hành"
            title="Quản lý booking"
            subtitle="Toàn bộ booking trên hệ thống: giám sát tiến độ, tranh chấp và hỗ trợ vận hành."
            maxWidth="wide"
            headerAction={
                <div className="admin-ui-actions">
                    <span className="admin-ui-code-chip">Tổng {totalCount.toLocaleString('vi-VN')}</span>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={() => void fetchBookings()}
                    >
                        <span className="material-symbols-outlined">refresh</span>
                        Làm mới
                    </button>
                </div>
            }
        >
            <SectionCard
                title="Danh sách booking"
                subtitle="Lọc theo trạng thái, khoảng ngày hoặc tên học sinh/gia sư để xử lý nhanh."
                footer={`Hiển thị ${bookings.length} / ${totalCount.toLocaleString('vi-VN')} booking`}
            >
                <BookingFilterBar
                    status={status}
                    onStatusChange={handleStatusChange}
                    from={from}
                    to={to}
                    onDateRangeChange={handleDateRangeChange}
                    searchInput={searchInput}
                    onSearchInputChange={setSearchInput}
                    onSearchSubmit={handleSearchSubmit}
                    onReset={resetFilters}
                />

                <DataTable<AdminBookingListItem>
                    columns={columns}
                    data={bookings}
                    rowKey="bookingId"
                    loading={loading}
                    pagination={{
                        current: page,
                        pageSize: PAGE_SIZE,
                        total: totalCount,
                        onChange: setPage,
                    }}
                    emptyText="Không có booking nào khớp bộ lọc."
                    variant="embedded"
                />
            </SectionCard>
        </PageContainer>
    );
}
