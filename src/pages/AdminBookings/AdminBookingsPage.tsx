import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import { getAdminBookings } from '../../services/adminBooking.service';
import type { AdminBookingListItem, AdminBookingListParams } from '../../types/adminBooking.types';
import { formatDateTime } from '../../utils/formatters';
import { formatVND, getBookingStatusDisplay, getTeachingModeLabel } from './bookingDisplay';
import { parseIdFilter } from '../../utils/idFilter';
import type { ListSortDirection } from '../../types/admin.types';
import BookingFilterBar from './BookingFilterBar';
import styles from './AdminBookings.module.css';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export default function AdminBookingsPage() {
    const navigate = useNavigate();

    const [bookings, setBookings] = useState<AdminBookingListItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    // Trạng thái lọc + trang sống trong URL (không phải useState cục bộ) — để "Xem chi tiết"
    // rồi bấm back trả về đúng tab/trang đang xem, thay vì luôn reset về "Tất cả"/trang 1.
    const [searchParams, setSearchParams] = useSearchParams();
    const page = Number(searchParams.get('page')) || 1;
    const status = searchParams.get('status') || '';
    // Mặc định theo hằng số chung; ô chọn vẫn cho đổi sang 5 hoặc 20.
    const [pageSize, setPageSize] = useState<number>(ADMIN_PAGE_SIZE);

    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Ô nhập và giá trị đã áp dụng tách riêng cho các bộ lọc theo id: lọc chạy ở
    // server nên chỉ gọi API khi admin bấm Tìm kiếm / nhấn Enter, không phải mỗi
    // lần gõ thêm một chữ số.
    const [bookingIdInput, setBookingIdInput] = useState('');
    const [classSessionIdInput, setClassSessionIdInput] = useState('');
    const [bookingIdFilter, setBookingIdFilter] = useState<number | undefined>(undefined);
    const [classSessionIdFilter, setClassSessionIdFilter] = useState<number | undefined>(undefined);
    const [sortDirection, setSortDirection] = useState<ListSortDirection>('desc');

    const fetchAbortRef = useRef<AbortController | null>(null);

    const fetchBookings = useCallback(async () => {
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        setLoading(true);
        try {
            const params: AdminBookingListParams = { page, pageSize, sortDirection };
            if (status) params.status = status;
            if (from) params.from = from;
            if (to) params.to = to;
            if (searchQuery) params.search = searchQuery;
            if (bookingIdFilter !== undefined) params.bookingId = bookingIdFilter;
            if (classSessionIdFilter !== undefined) params.classSessionId = classSessionIdFilter;

            const res = await getAdminBookings(params, controller.signal);
            if (controller.signal.aborted) return;

            setBookings(res.content?.items ?? []);
            setTotalCount(res.content?.totalCount ?? 0);
        } catch (err: unknown) {
            if (controller.signal.aborted) return;
            const error = err as { code?: string; name?: string };
            if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') return;

            console.error('getAdminBookings failed:', err);
            toast.error('Không thể tải danh sách đặt lịch. Vui lòng thử lại.', {
                toastId: 'admin-bookings-load-error',
            });
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [bookingIdFilter, classSessionIdFilter, from, page, pageSize, searchQuery, sortDirection, status, to]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchBookings();
        return () => fetchAbortRef.current?.abort();
    }, [fetchBookings]);

    // Cập nhật status/page trong URL, giữ nguyên các tham số khác đang có.
    const updateQuery = (patch: { status?: string; page?: number }) => {
        const next = new URLSearchParams(searchParams);
        if (patch.status !== undefined) {
            if (patch.status) next.set('status', patch.status);
            else next.delete('status');
        }
        if (patch.page !== undefined) {
            if (patch.page > 1) next.set('page', String(patch.page));
            else next.delete('page');
        }
        setSearchParams(next);
    };

    const resetFilters = () => {
        setFrom('');
        setTo('');
        setSearchInput('');
        setSearchQuery('');
        setBookingIdInput('');
        setClassSessionIdInput('');
        setBookingIdFilter(undefined);
        setClassSessionIdFilter(undefined);
        updateQuery({ status: '', page: 1 });
    };

    const handleStatusChange = (value: string) => {
        updateQuery({ status: value, page: 1 });
    };

    const handlePageChange = (newPage: number) => {
        updateQuery({ page: newPage });
    };

    const handleDateRangeChange = (newFrom: string, newTo: string) => {
        setFrom(newFrom);
        setTo(newTo);
        updateQuery({ page: 1 });
    };

    const handleFiltersSubmit = () => {
        setSearchQuery(searchInput.trim());
        setBookingIdFilter(parseIdFilter(bookingIdInput));
        setClassSessionIdFilter(parseIdFilter(classSessionIdInput));
        updateQuery({ page: 1 });
    };

    const handleSortDirectionChange = (value: ListSortDirection) => {
        setSortDirection(value);
        // Trang 2 của thứ tự cũ không tương ứng gì với thứ tự mới.
        updateQuery({ page: 1 });
    };

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        updateQuery({ page: 1 });
    };

    const openDetails = (record: AdminBookingListItem) => {
        navigate(`/admin-portal/bookings/${record.bookingId}`);
    };

    const columns: DataTableColumn<AdminBookingListItem>[] = [
        {
            key: 'bookingId',
            title: 'Mã đặt lịch',
            width: 126,
            render: (record) => (
                <div className={styles.bookingMeta}>
                    <span className={styles.bookingCode}>#{record.bookingId}</span>
                    <span className={styles.bookingDate}>
                        {record.createdAt ? formatDateTime(record.createdAt) : 'Chưa có ngày'}
                    </span>
                </div>
            ),
        },
        {
            key: 'student',
            title: 'Học sinh',
            minWidth: 168,
            render: (record) => (
                <div className={styles.personCell}>
                    <span className={styles.personAvatar} aria-hidden="true">
                        {record.studentName?.trim().charAt(0).toUpperCase() || 'H'}
                    </span>
                    <span className={styles.cellStack}>
                        <span className={styles.cellPrimary}>{record.studentName ?? 'Chưa cập nhật'}</span>
                        <span className={styles.cellSecondary}>{record.gradeLevel ?? 'Chưa có khối lớp'}</span>
                    </span>
                </div>
            ),
        },
        {
            key: 'tutor',
            title: 'Gia sư',
            minWidth: 150,
            hideOnMobile: true,
            render: (record) => (
                <div className={styles.cellStack}>
                    <span className={styles.cellPrimary}>{record.tutorName ?? 'Chưa cập nhật'}</span>
                    <span className={styles.cellSecondary}>Người phụ trách</span>
                </div>
            ),
        },
        {
            key: 'classInfo',
            title: 'Môn học',
            minWidth: 128,
            hideOnMobile: true,
            render: (record) => (
                <div className={styles.cellStack}>
                    <span className={styles.cellPrimary}>{record.subjectName ?? 'Chưa cập nhật'}</span>
                    <span className={styles.cellSecondary}>{getTeachingModeLabel(record.teachingMode)}</span>
                </div>
            ),
        },
        {
            key: 'progress',
            title: 'Tiến độ',
            minWidth: 142,
            hideOnMobile: true,
            render: (record) => {
                const total = record.lessonsTotal || record.sessionCount || 0;
                const completed = Math.min(record.lessonsCompleted || 0, total);
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                    <div className={styles.progressCell}>
                        <span>{total > 0 ? `${completed}/${total} buổi` : 'Chưa có buổi học'}</span>
                        <span className={styles.progressTrack} aria-hidden="true">
                            <span className={styles.progressValue} style={{ width: `${percentage}%` }} />
                        </span>
                    </div>
                );
            },
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
            key: 'finalPrice',
            title: 'Tổng tiền',
            align: 'right',
            minWidth: 132,
            hideOnMobile: true,
            render: (record) => (
                <span className={styles.cellMoney}>{formatVND(record.finalPrice ?? record.price)}</span>
            ),
        },
        {
            key: 'action',
            title: '',
            width: 56,
            align: 'right',
            render: (record) => (
                <button
                    type="button"
                    className={styles.detailButton}
                    onClick={(event) => {
                        event.stopPropagation();
                        openDetails(record);
                    }}
                    aria-label={`Xem chi tiết đặt lịch số ${record.bookingId}`}
                    title="Xem chi tiết"
                >
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            ),
        },
    ];

    return (
        <PageContainer
            title="Quản lý đặt lịch"
            maxWidth="wide"
            headerAction={
                <div className={styles.headerActions}>
                    <div className={styles.totalSummary} aria-label={`${totalCount} lịch đặt`}>
                        <span className={`material-symbols-outlined ${styles.totalIcon}`}>calendar_month</span>
                        <span>
                            <strong>{totalCount.toLocaleString('vi-VN')}</strong>
                            <small>Tổng lịch đặt</small>
                        </span>
                    </div>
                    <button
                        type="button"
                        className={styles.refreshButton}
                        onClick={() => void fetchBookings()}
                        disabled={loading}
                    >
                        <span className={`material-symbols-outlined ${loading ? styles.spinning : ''}`}>refresh</span>
                        Làm mới
                    </button>
                </div>
            }
        >
            <SectionCard
                title="Danh sách đặt lịch"
                headerAction={
                    <label className={styles.pageSizeControl}>
                        <span>Số dòng</span>
                        <select
                            value={pageSize}
                            onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                            aria-label="Số dòng mỗi trang"
                        >
                            {PAGE_SIZE_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    </label>
                }
            >
                <BookingFilterBar
                    status={status}
                    onStatusChange={handleStatusChange}
                    from={from}
                    to={to}
                    onDateRangeChange={handleDateRangeChange}
                    searchInput={searchInput}
                    searchQuery={searchQuery}
                    onSearchInputChange={setSearchInput}
                    onFiltersSubmit={handleFiltersSubmit}
                    bookingIdInput={bookingIdInput}
                    onBookingIdInputChange={setBookingIdInput}
                    classSessionIdInput={classSessionIdInput}
                    onClassSessionIdInputChange={setClassSessionIdInput}
                    sortDirection={sortDirection}
                    onSortDirectionChange={handleSortDirectionChange}
                    hasAppliedIdFilters={bookingIdFilter !== undefined || classSessionIdFilter !== undefined}
                    onReset={resetFilters}
                />

                <DataTable<AdminBookingListItem>
                    columns={columns}
                    data={bookings}
                    rowKey="bookingId"
                    loading={loading}
                    loadingText="Đang tải danh sách đặt lịch..."
                    pagination={{
                        current: page,
                        pageSize,
                        total: totalCount,
                        onChange: handlePageChange,
                    }}
                    onRowClick={openDetails}
                    emptyText="Không có lịch đặt nào phù hợp với bộ lọc."
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={900}
                />
            </SectionCard>
        </PageContainer>
    );
}
