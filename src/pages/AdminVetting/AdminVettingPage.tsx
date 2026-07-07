import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
    getPendingTutors,
    updateTutorApproval,
    getPendingProfileUpdateRequests,
    getProfileUpdateRequestDetail,
    reviewProfileUpdateRequest,
} from '../../services/admin.service';
import TutorDetailModal from './components/TutorDetailModal';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import type { PendingTutorFromAPI, ProfileUpdateRequestFromAPI } from '../../types/admin.types';
import '../../styles/pages/admin-vetting.css';

// Các cặp field (cũ/đề xuất) để vẽ diff cho tab "Yêu cầu cập nhật hồ sơ".
// proposed === null nghĩa là tutor không đụng tới field đó ở lần nộp này.
const PROFILE_UPDATE_DIFF_FIELDS: Array<{
    label: string;
    current: keyof ProfileUpdateRequestFromAPI;
    proposed: keyof ProfileUpdateRequestFromAPI;
}> = [
    { label: 'Tiêu đề', current: 'currentHeadline', proposed: 'proposedHeadline' },
    { label: 'Thành phố', current: 'currentTeachingAreaCity', proposed: 'proposedTeachingAreaCity' },
    { label: 'Quận/huyện', current: 'currentTeachingAreaDistrict', proposed: 'proposedTeachingAreaDistrict' },
    { label: 'Giới thiệu (Bio)', current: 'currentBio', proposed: 'proposedBio' },
    { label: 'Học vấn', current: 'currentEducation', proposed: 'proposedEducation' },
    { label: 'Kinh nghiệm', current: 'currentExperience', proposed: 'proposedExperience' },
    { label: 'Video giới thiệu', current: 'currentVideoIntroUrl', proposed: 'proposedVideoIntroUrl' },
];

// Field dùng để phát hiện "Tutor vừa nộp thêm thay đổi mới trong lúc Admin đang xem" — so bản
// đang hiển thị trên màn hình với bản mới nhất lấy lại từ server ngay trước khi Duyệt/Từ chối.
const PROFILE_UPDATE_COMPARE_KEYS: Array<keyof ProfileUpdateRequestFromAPI> = [
    ...PROFILE_UPDATE_DIFF_FIELDS.map((f) => f.proposed),
    'hasProposedSubjectGradePrices',
];

const hasProfileUpdateRequestChanged = (
    known: ProfileUpdateRequestFromAPI,
    fresh: ProfileUpdateRequestFromAPI
): boolean => PROFILE_UPDATE_COMPARE_KEYS.some((key) => known[key] !== fresh[key]);

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

    const [activeTab, setActiveTab] = useState<'new' | 'updates'>('new');
    const [updateRequests, setUpdateRequests] = useState<ProfileUpdateRequestFromAPI[]>([]);
    const [updateRequestsLoading, setUpdateRequestsLoading] = useState(true);
    const [updateRequestsError, setUpdateRequestsError] = useState<string | null>(null);
    const [updateActionLoading, setUpdateActionLoading] = useState<string | null>(null);
    const [updateRejectionNote, setUpdateRejectionNote] = useState('');
    const [showUpdateRejectModal, setShowUpdateRejectModal] = useState<string | null>(null);
    const [selectedUpdateRequest, setSelectedUpdateRequest] = useState<ProfileUpdateRequestFromAPI | null>(null);

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

    const fetchPendingUpdateRequests = useCallback(async () => {
        try {
            setUpdateRequestsLoading(true);
            setUpdateRequestsError(null);
            const response = await getPendingProfileUpdateRequests();
            setUpdateRequests(response.content || []);
        } catch (err: unknown) {
            console.error('Error fetching pending profile update requests:', err);
            setUpdateRequestsError(getVettingErrorMessage(err));
            setUpdateRequests([]);
        } finally {
            setUpdateRequestsLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchPendingUpdateRequests();
    }, [fetchPendingUpdateRequests]);

    /**
     * Gọi lại API lấy bản MỚI NHẤT của request trước khi thực sự Duyệt/Từ chối, vì danh sách
     * không tự cập nhật real-time — nếu Tutor vừa nộp thêm thay đổi trong lúc Admin đang xem,
     * ta phải phát hiện ra và đồng bộ lại UI thay vì để Admin duyệt nhầm nội dung chưa từng thấy.
     */
    const verifyProfileUpdateRequestFreshness = async (
        tutorId: string
    ): Promise<'fresh' | 'stale' | 'gone'> => {
        const fresh = await getProfileUpdateRequestDetail(tutorId);
        if (!fresh) return 'gone';

        const known = updateRequests.find((r) => r.tutorId === tutorId);
        const changed = known ? hasProfileUpdateRequestChanged(known, fresh) : false;

        // Đồng bộ lại UI với bản mới nhất trong mọi trường hợp (kể cả khi không đổi, để chắc
        // chắn dữ liệu hiển thị luôn khớp với server tại thời điểm vừa kiểm tra).
        setUpdateRequests((prev) => prev.map((r) => (r.tutorId === tutorId ? fresh : r)));
        setSelectedUpdateRequest((prev) => (prev && prev.tutorId === tutorId ? fresh : prev));

        return changed ? 'stale' : 'fresh';
    };

    const handleApproveUpdateRequest = async (tutorId: string) => {
        try {
            setUpdateActionLoading(tutorId);

            const freshness = await verifyProfileUpdateRequestFreshness(tutorId);
            if (freshness === 'gone') {
                toast.info('Yêu cầu này không còn tồn tại — có thể đã được xử lý trước đó. Danh sách đang được làm mới.');
                await fetchPendingUpdateRequests();
                return;
            }
            if (freshness === 'stale') {
                toast.warning('Tutor vừa nộp thêm thay đổi mới trong lúc bạn xem. Vui lòng xem lại nội dung mới rồi bấm Duyệt lại.');
                return;
            }

            const response = await reviewProfileUpdateRequest(tutorId, true);
            // BE có thể chèn thêm cảnh báo vào message (VD: tutor vừa nộp thêm thay đổi mới
            // ngay trong khoảng giữa lúc verifyProfileUpdateRequestFreshness và lúc PUT này chạy)
            // — luôn ưu tiên hiển thị message thật từ server thay vì text tĩnh.
            toast.success(response?.message || 'Duyệt cập nhật hồ sơ thành công. Marketplace đã hiển thị thông tin mới.');
            await fetchPendingUpdateRequests();
        } catch (err) {
            console.error('Error approving profile update request:', err);
            toast.error('Không thể duyệt yêu cầu. Vui lòng thử lại.');
        } finally {
            setUpdateActionLoading(null);
        }
    };

    const handleOpenUpdateRejectModal = (tutorId: string) => {
        setShowUpdateRejectModal(tutorId);
        setUpdateRejectionNote('');
    };

    const handleRejectUpdateRequest = async () => {
        if (!showUpdateRejectModal) return;
        if (updateRejectionNote.trim().length < 10) {
            toast.error('Lý do từ chối phải có ít nhất 10 ký tự.');
            return;
        }

        const tutorId = showUpdateRejectModal;

        try {
            setUpdateActionLoading(tutorId);

            const freshness = await verifyProfileUpdateRequestFreshness(tutorId);
            if (freshness === 'gone') {
                toast.info('Yêu cầu này không còn tồn tại — có thể đã được xử lý trước đó. Danh sách đang được làm mới.');
                setShowUpdateRejectModal(null);
                setUpdateRejectionNote('');
                await fetchPendingUpdateRequests();
                return;
            }
            if (freshness === 'stale') {
                toast.warning('Tutor vừa nộp thêm thay đổi mới trong lúc bạn xem. Vui lòng xem lại nội dung mới rồi từ chối lại nếu cần.');
                setShowUpdateRejectModal(null);
                setUpdateRejectionNote('');
                return;
            }

            const response = await reviewProfileUpdateRequest(tutorId, false, updateRejectionNote);
            toast.success(response?.message || 'Đã từ chối yêu cầu cập nhật hồ sơ.');
            setShowUpdateRejectModal(null);
            setUpdateRejectionNote('');
            await fetchPendingUpdateRequests();
        } catch (err) {
            console.error('Error rejecting profile update request:', err);
            toast.error('Không thể từ chối yêu cầu. Vui lòng thử lại.');
        } finally {
            setUpdateActionLoading(null);
        }
    };

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

    const updateRequestColumns: DataTableColumn<ProfileUpdateRequestFromAPI>[] = [
        {
            key: 'tutor',
            title: 'Thông tin gia sư',
            render: (req) => (
                <div className="vetting-tutor-info">
                    <div
                        className="vetting-tutor-avatar"
                        style={{ backgroundImage: `url(${req.tutorAvatarUrl || 'https://via.placeholder.com/40'})` }}
                    />
                    <div className="admin-ui-entity">
                        <span className="admin-ui-entity-primary">{req.tutorFullName || 'Chưa rõ tên'}</span>
                        <span className="admin-ui-entity-secondary">{req.tutorEmail}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'changes',
            title: 'Thay đổi',
            render: (req) => {
                const changedFields = PROFILE_UPDATE_DIFF_FIELDS.filter((f) => req[f.proposed] !== null);
                if (req.hasProposedSubjectGradePrices) changedFields.push({ label: 'Môn học & Bảng giá', current: 'currentHeadline', proposed: 'proposedHeadline' });
                return (
                    <span className="admin-ui-entity-secondary">
                        {changedFields.length > 0
                            ? changedFields.map((f) => f.label).join(', ')
                            : 'Không có thay đổi nào được ghi nhận'}
                    </span>
                );
            },
            hideOnMobile: true,
        },
        {
            key: 'date',
            title: 'Đã nộp',
            render: (req) => <span className="admin-ui-table-meta">{formatSubmittedAt(req.submittedAt)}</span>,
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
            render: (req) => (
                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-success"
                        onClick={() => handleApproveUpdateRequest(req.tutorId)}
                        disabled={updateActionLoading === req.tutorId}
                    >
                        <span className="material-symbols-outlined">check</span>
                        Duyệt
                    </button>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-danger"
                        onClick={() => handleOpenUpdateRejectModal(req.tutorId)}
                        disabled={updateActionLoading === req.tutorId}
                    >
                        Từ chối
                    </button>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={() => setSelectedUpdateRequest(req)}
                    >
                        Xem thay đổi
                    </button>
                </div>
            ),
            minWidth: 300,
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
                        <span className="admin-ui-code-chip">
                            {activeTab === 'new' ? tutors.length : updateRequests.length} đang chờ
                        </span>
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-secondary"
                            onClick={() => void (activeTab === 'new' ? fetchPendingTutors() : fetchPendingUpdateRequests())}
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
                <div className="admin-ui-actions" style={{ marginBottom: 16 }}>
                    <button
                        type="button"
                        className={`admin-ui-button ${activeTab === 'new' ? 'admin-ui-button-primary' : 'admin-ui-button-secondary'}`}
                        onClick={() => setActiveTab('new')}
                    >
                        Hồ sơ mới ({tutors.length})
                    </button>
                    <button
                        type="button"
                        className={`admin-ui-button ${activeTab === 'updates' ? 'admin-ui-button-primary' : 'admin-ui-button-secondary'}`}
                        onClick={() => setActiveTab('updates')}
                    >
                        Yêu cầu cập nhật hồ sơ ({updateRequests.length})
                    </button>
                </div>

                {activeTab === 'new' && (
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
                )}

                {activeTab === 'updates' && (
                    <SectionCard
                        title="Yêu cầu cập nhật hồ sơ"
                        subtitle="Tutor đã Active gửi chỉnh sửa hồ sơ — Marketplace vẫn hiển thị thông tin cũ cho đến khi duyệt ở đây."
                        footer={`Hiển thị ${updateRequests.length} yêu cầu`}
                    >
                        {updateRequestsError && !updateRequestsLoading ? (
                            <div className="vetting-error-state">
                                <span className="material-symbols-outlined vetting-state-icon">error</span>
                                <p>{updateRequestsError}</p>
                                <button
                                    type="button"
                                    className="admin-ui-button admin-ui-button-primary"
                                    onClick={() => void fetchPendingUpdateRequests()}
                                >
                                    Thử lại
                                </button>
                            </div>
                        ) : (
                            <DataTable<ProfileUpdateRequestFromAPI>
                                columns={updateRequestColumns}
                                data={updateRequests}
                                rowKey="tutorId"
                                loading={updateRequestsLoading}
                                loadingText="Đang tải danh sách yêu cầu cập nhật..."
                                emptyText="Không có yêu cầu cập nhật hồ sơ nào đang chờ duyệt"
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
                )}
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

            {selectedUpdateRequest && (
                <div className="vetting-modal-overlay" onClick={() => setSelectedUpdateRequest(null)}>
                    <div className="vetting-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vetting-modal-header">
                            <h3>Thay đổi hồ sơ đề xuất — {selectedUpdateRequest.tutorFullName || 'Chưa rõ tên'}</h3>
                            <button className="vetting-modal-close" onClick={() => setSelectedUpdateRequest(null)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="vetting-modal-body">
                            {PROFILE_UPDATE_DIFF_FIELDS.filter((f) => selectedUpdateRequest[f.proposed] !== null).map((f) => (
                                <div key={f.label} style={{ marginBottom: 14 }}>
                                    <strong>{f.label}</strong>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                        <div style={{ flex: 1, opacity: 0.6 }}>
                                            <div className="admin-ui-entity-secondary">Hiện tại</div>
                                            <div>{String(selectedUpdateRequest[f.current] ?? '—')}</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div className="admin-ui-entity-secondary">Đề xuất</div>
                                            <div>{String(selectedUpdateRequest[f.proposed] ?? '—')}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {selectedUpdateRequest.hasProposedSubjectGradePrices && (
                                <p className="vetting-modal-description">
                                    Tutor cũng đề xuất thay đổi Môn học &amp; Bảng giá — xem chi tiết bảng giá hiện tại của tutor
                                    trong hồ sơ đầy đủ trước khi duyệt.
                                </p>
                            )}
                            {PROFILE_UPDATE_DIFF_FIELDS.every((f) => selectedUpdateRequest[f.proposed] === null) &&
                                !selectedUpdateRequest.hasProposedSubjectGradePrices && (
                                    <p className="vetting-modal-description">Không có thay đổi nào được ghi nhận.</p>
                                )}
                        </div>
                        <div className="vetting-modal-footer">
                            <button className="vetting-btn vetting-btn-outline" onClick={() => setSelectedUpdateRequest(null)}>
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showUpdateRejectModal && (
                <div className="vetting-modal-overlay" onClick={() => setShowUpdateRejectModal(null)}>
                    <div className="vetting-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="vetting-modal-header">
                            <h3>Từ chối cập nhật hồ sơ</h3>
                            <button className="vetting-modal-close" onClick={() => setShowUpdateRejectModal(null)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="vetting-modal-body">
                            <p className="vetting-modal-description">
                                Vui lòng nhập lý do từ chối. Hồ sơ hiện tại của tutor trên Marketplace sẽ không bị ảnh hưởng.
                            </p>
                            <textarea
                                className="vetting-rejection-textarea"
                                placeholder="Nhập lý do từ chối (ít nhất 10 ký tự)..."
                                value={updateRejectionNote}
                                onChange={(e) => setUpdateRejectionNote(e.target.value)}
                                rows={4}
                            />
                            <p className="vetting-char-count">{updateRejectionNote.length}/10 ký tự tối thiểu</p>
                        </div>
                        <div className="vetting-modal-footer">
                            <button className="vetting-btn vetting-btn-outline" onClick={() => setShowUpdateRejectModal(null)}>
                                Hủy
                            </button>
                            <button
                                className="vetting-btn vetting-btn-reject"
                                onClick={handleRejectUpdateRequest}
                                disabled={updateRejectionNote.trim().length < 10 || updateActionLoading !== null}
                            >
                                {updateActionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminVettingPage;
