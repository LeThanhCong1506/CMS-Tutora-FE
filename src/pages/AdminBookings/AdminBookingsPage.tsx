import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import { getAdminBookings } from '../../services/adminBooking.service';
import type { AdminBookingListItem, AdminBookingListParams } from '../../types/adminBooking.types';
import { formatDateTime } from '../../utils/formatters';
import { formatVND, getBookingStatusDisplay, getTeachingModeLabel } from './bookingDisplay';
import BookingFilterBar from './BookingFilterBar';
import styles from './AdminBookings.module.css';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export default function AdminBookingsPage() {
    const navigate = useNavigate();

    const [bookings, setBookings] = useState<AdminBookingListItem[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

    const [status, setStatus] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchAbortRef = useRef<AbortController | null>(null);

    const fetchBookings = useCallback(async () => {
        fetchAbortRef.current?.abort();
        const controller = new AbortController();
        fetchAbortRef.current = controller;

        setLoading(true);
        try {
            const params: AdminBookingListParams = { page, pageSize };
            if (status) params.status = status;
            if (from) params.from = from;
            if (to) params.to = to;
            if (searchQuery) params.search = searchQuery;

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
    }, [from, page, pageSize, searchQuery, status, to]);

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

    const handleStatusChange = (value: string) => {
        setStatus(value);
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

    const handlePageSizeChange = (newPageSize: number) => {
        setPageSize(newPageSize);
        setPage(1);
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
                    onSearchSubmit={handleSearchSubmit}
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
                        onChange: setPage,
                    }}
                    onRowClick={openDetails}
                    emptyText="Không có lịch đặt nào phù hợp với bộ lọc."
                    variant="embedded"
                    minWidth={900}
                />
            </SectionCard>
        </PageContainer>
    );
}
