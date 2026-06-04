import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { getPendingTutors, updateTutorApproval } from '../../services/admin.service';
import TutorDetailModal from './components/TutorDetailModal';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import type { PendingTutorFromAPI } from '../../types/admin.types';
import '../../styles/pages/admin-vetting.css';

type ApiError = {
    response?: { status?: number };
    code?: string;
    message?: string;
};

const getVettingErrorMessage = (error: unknown) => {
    const err = error as ApiError;

    if (err?.response?.status === 401) {
        return 'Bạn cần đăng nhập với quyền Admin để xem danh sách này.';
    }
    if (err?.response?.status === 403) {
        return 'Bạn không có quyền truy cập trang này.';
    }
    if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        return 'Yêu cầu quá lâu. Vui lòng kiểm tra kết nối mạng.';
    }
    if (err?.code === 'ERR_NETWORK') {
        return 'Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.';
    }
    return 'Không thể tải danh sách gia sư. Vui lòng thử lại sau.';
};

const formatSubmittedAt = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Vừa xong';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
};

const formatCurrency = (amount: number | null): string => {
    if (!amount) return '—';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
};

const AdminVettingPage = () => {
    const [tutors, setTutors] = useState<PendingTutorFromAPI[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTutor, setSelectedTutor] = useState<PendingTutorFromAPI | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectionNote, setRejectionNote] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

    const fetchPendingTutors = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getPendingTutors(1, 50);
            setTutors(response.content || []);
        } catch (err: unknown) {
            console.error('Error fetching pending tutors:', err);
            const apiError = err as ApiError;

            if (apiError?.response?.status === 404) {
                setError(null);
                setTutors([]);
            } else {
                setError(getVettingErrorMessage(err));
                setTutors([]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchPendingTutors();
    }, [fetchPendingTutors]);

    const filteredTutors = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return tutors;

        return tutors.filter((tutor) => {
            const searchableText = [
                tutor.fullname,
                tutor.email,
                tutor.phone,
                tutor.sections?.basicInfo?.headline,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchableText.includes(query);
        });
    }, [searchQuery, tutors]);

    const handleApprove = async (tutorId: string) => {
        try {
            setActionLoading(tutorId);
            await updateTutorApproval(tutorId, true);
            toast.success('Phê duyệt gia sư thành công!');
            setSelectedTutor(null);
            await fetchPendingTutors();
        } catch (err) {
            console.error('Error approving tutor:', err);
            toast.error('Không thể phê duyệt gia sư. Vui lòng thử lại.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleOpenRejectModal = (tutorId: string) => {
        setShowRejectModal(tutorId);
        setRejectionNote('');
    };

    const handleReject = async () => {
        if (!showRejectModal) return;
        if (rejectionNote.trim().length < 20) {
            toast.error('Lý do từ chối phải có ít nhất 20 ký tự.');
            return;
        }

        try {
            setActionLoading(showRejectModal);
            await updateTutorApproval(showRejectModal, false, rejectionNote);
            toast.success('Đã từ chối hồ sơ gia sư.');
            setShowRejectModal(null);
            setRejectionNote('');
            setSelectedTutor(null);
            await fetchPendingTutors();
        } catch (err) {
            console.error('Error rejecting tutor:', err);
            toast.error('Không thể từ chối hồ sơ. Vui lòng thử lại.');
        } finally {
            setActionLoading(null);
        }
    };

    const vettingColumns: DataTableColumn<PendingTutorFromAPI>[] = [
        {
            key: 'tutor',
            title: 'Thông tin gia sư',
            render: (tutor) => (
                <div className="vetting-tutor-info">
                    <div
                        className="vetting-tutor-avatar"
                        style={{ backgroundImage: `url(${tutor.avatarurl || 'https://via.placeholder.com/40'})` }}
                    />
                    <div className="admin-ui-entity">
                        <span className="admin-ui-entity-primary">{tutor.fullname}</span>
                        <span className="admin-ui-entity-secondary">{tutor.email}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'headline',
            title: 'Tiêu đề',
            render: (tutor) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">
                        {tutor.sections?.basicInfo?.headline || 'Chưa cập nhật'}
                    </span>
                </div>
            ),
            hideOnMobile: true,
        },
        {
            key: 'price',
            title: 'Giá/giờ',
            render: (tutor) => (
                <span className="admin-ui-amount">
                    {formatCurrency(tutor.sections?.pricing?.hourlyRate ?? null)}
                </span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'date',
            title: 'Đã nộp',
            render: (tutor) => (
                <span className="admin-ui-table-meta">{formatSubmittedAt(tutor.profileCreatedAt)}</span>
            ),
            hideOnMobile: true,
        },
        {
            key: 'status',
            title: 'Trạng thái',
            render: () => <StatusBadge variant="warning">Chờ xem xét</StatusBadge>,
        },
        {
            key: 'actions',
            title: 'Hành động',
            align: 'right',
            render: (tutor) => (
                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-success"
                        onClick={() => handleApprove(tutor.userid)}
                        disabled={actionLoading === tutor.userid}
                    >
                        <span className="material-symbols-outlined">check</span>
                        Duyệt
                    </button>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-danger"
                        onClick={() => handleOpenRejectModal(tutor.userid)}
                        disabled={actionLoading === tutor.userid}
                    >
                        Từ chối
                    </button>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={() => setSelectedTutor(tutor)}
                    >
                        Chi tiết
                    </button>
                </div>
            ),
            minWidth: 260,
        },
    ];

    return (
        <>
            <PageContainer
                eyebrow="Kiểm duyệt"
                title="Hàng đợi xác minh gia sư"
                subtitle="Xem xét hồ sơ đăng ký, định giá, thông tin xác minh và ra quyết định duyệt/từ chối."
                maxWidth="wide"
                headerAction={
                    <div className="admin-ui-actions">
                        <span className="admin-ui-code-chip">{tutors.length} đang chờ</span>
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-secondary"
                            onClick={() => void fetchPendingTutors()}
                        >
                            <span className="material-symbols-outlined">refresh</span>
                            Làm mới
                        </button>
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-primary"
                            onClick={() => toast.info('Chức năng xuất CSV sẽ có trong tương lai')}
                        >
                            <span className="material-symbols-outlined">download</span>
                            Xuất CSV
                        </button>
                    </div>
                }
            >
                <SectionCard
                    title="Hồ sơ chờ duyệt"
                    subtitle="Tìm theo tên, email, số điện thoại hoặc headline để xử lý nhanh từng hồ sơ."
                    footer={`Hiển thị ${filteredTutors.length} / ${tutors.length} hồ sơ`}
                >
                    <div className="admin-ui-toolbar">
                        <div className="admin-ui-search">
                            <span className="material-symbols-outlined admin-ui-search-icon">search</span>
                            <input
                                type="search"
                                className="admin-ui-search-input"
                                placeholder="Tìm kiếm yêu cầu..."
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                            />
                        </div>
                        {searchQuery && (
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary"
                                onClick={() => setSearchQuery('')}
                            >
                                Xóa tìm kiếm
                            </button>
                        )}
                    </div>

                    {error && !loading ? (
                        <div className="vetting-error-state">
                            <span className="material-symbols-outlined vetting-state-icon">error</span>
                            <p>{error}</p>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-primary"
                                onClick={() => void fetchPendingTutors()}
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : (
                        <DataTable<PendingTutorFromAPI>
                            columns={vettingColumns}
                            data={filteredTutors}
                            rowKey="userid"
                            loading={loading}
                            loadingText="Đang tải danh sách gia sư..."
                            emptyText={searchQuery ? 'Không tìm thấy hồ sơ phù hợp' : 'Không có gia sư nào đang chờ duyệt'}
                            emptyIcon={
                                <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                                    check_circle
                                </span>
                            }
                            minWidth={920}
                            variant="embedded"
                        />
                    )}
                </SectionCard>
            </PageContainer>

            <TutorDetailModal
                tutor={selectedTutor}
                isOpen={selectedTutor !== null}
                onClose={() => setSelectedTutor(null)}
                onApprove={handleApprove}
                onOpenReject={handleOpenRejectModal}
                actionLoading={actionLoading}
            />

            {showRejectModal && (
                <div className="vetting-modal-overlay" onClick={() => setShowRejectModal(null)}>
                    <div className="vetting-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vetting-modal-header">
                            <h3>Từ chối hồ sơ gia sư</h3>
                            <button
                                className="vetting-modal-close"
                                onClick={() => setShowRejectModal(null)}
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="vetting-modal-body">
                            <p className="vetting-modal-description">
                                Vui lòng nhập lý do từ chối hồ sơ. Lý do này sẽ được gửi đến gia sư để họ có thể cải thiện hồ sơ.
                            </p>
                            <textarea
                                className="vetting-rejection-textarea"
                                placeholder="Nhập lý do từ chối (ít nhất 20 ký tự)..."
                                value={rejectionNote}
                                onChange={(e) => setRejectionNote(e.target.value)}
                                rows={4}
                            />
                            <p className="vetting-char-count">
                                {rejectionNote.length}/20 ký tự tối thiểu
                            </p>
                        </div>
                        <div className="vetting-modal-footer">
                            <button
                                className="vetting-btn vetting-btn-outline"
                                onClick={() => setShowRejectModal(null)}
                            >
                                Hủy
                            </button>
                            <button
                                className="vetting-btn vetting-btn-reject"
                                onClick={handleReject}
                                disabled={rejectionNote.trim().length < 20 || actionLoading !== null}
                            >
                                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminVettingPage;
