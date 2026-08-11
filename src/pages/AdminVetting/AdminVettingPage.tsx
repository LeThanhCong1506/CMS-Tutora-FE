import { useState, useEffect, useCallback } from 'react';
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
import { Can, useAccess } from '../../contexts/AccessContext';
import type { PendingTutorFromAPI, ProfileUpdateRequestFromAPI } from '../../types/admin.types';
import { getFallbackAvatar, cssBackgroundUrl } from '../../utils/avatar';
import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import { useTabParam } from '../../hooks/useTabParam';
import '../../styles/pages/admin-vetting.css';

const PAGE_SIZE = ADMIN_PAGE_SIZE;
const DEFAULT_ORDER = 'createdat_asc';

const VETTING_TABS = ['new', 'updates'] as const;
type VettingTab = (typeof VETTING_TABS)[number];

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
  fresh: ProfileUpdateRequestFromAPI,
): boolean => PROFILE_UPDATE_COMPARE_KEYS.some((key) => known[key] !== fresh[key]);

type ApiError = {
  response?: { status?: number };
  code?: string;
  message?: string;
};

const getVettingErrorMessage = (error: unknown) => {
  const err = error as ApiError;

  if (err?.response?.status === 401) {
    return 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
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

const AdminVettingPage = () => {
  const { can } = useAccess();
  const canViewNew = can('tutor_approval.view');
  const canViewUpdates = can('tutor_profile_update.view');
  const [tutors, setTutors] = useState<PendingTutorFromAPI[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(canViewNew);
  const [error, setError] = useState<string | null>(null);
  // searchInput: live text-box value; searchQuery: committed term sent to BE
  // (only on Enter / button click) so we don't hit the API on every keystroke.
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // FIFO by default — oldest-waiting profiles surface first for review.
  const [orderBy, setOrderBy] = useState(DEFAULT_ORDER);
  const [selectedTutor, setSelectedTutor] = useState<PendingTutorFromAPI | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Tab nằm trên URL (?tab=new|updates) — vừa cho deep-link từ thông báo "Yêu cầu cập nhật
  // hồ sơ gia sư" ở NotificationDropdown, vừa giữ đúng tab khi reload.
  // Quyền xem từng tab được clamp lại ở effect bên dưới.
  const [activeTab, setActiveTab] = useTabParam<VettingTab>(VETTING_TABS, canViewNew ? 'new' : 'updates');
  const [updateRequests, setUpdateRequests] = useState<ProfileUpdateRequestFromAPI[]>([]);
  const [updateRequestsLoading, setUpdateRequestsLoading] = useState(canViewUpdates);
  const [updateRequestsError, setUpdateRequestsError] = useState<string | null>(null);
  const [updateActionLoading, setUpdateActionLoading] = useState<string | null>(null);
  const [updateRejectionNote, setUpdateRejectionNote] = useState('');
  const [showUpdateRejectModal, setShowUpdateRejectModal] = useState<string | null>(null);
  const [selectedUpdateRequest, setSelectedUpdateRequest] = useState<ProfileUpdateRequestFromAPI | null>(null);

  const fetchPendingTutors = useCallback(async () => {
    if (!canViewNew) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getPendingTutors(page, PAGE_SIZE, {
        searchTerm: searchQuery || undefined,
        orderBy,
      });
      const lastPage = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      // If the current page emptied out (e.g. the last row was just
      // approved/rejected), step back so the admin isn't stranded on a
      // blank page beyond the new end of the list.
      if (response.content.length === 0 && page > 1) {
        setPage((prev) => prev - 1);
        return;
      }
      setTutors(response.content);
      setTotal(response.total);
    } catch (err: unknown) {
      console.error('Error fetching pending tutors:', err);
      const apiError = err as ApiError;

      if (apiError?.response?.status === 404) {
        setError(null);
        setTutors([]);
        setTotal(0);
      } else {
        setError(getVettingErrorMessage(err));
        setTutors([]);
        setTotal(0);
      }
    } finally {
      setLoading(false);
    }
  }, [canViewNew, page, searchQuery, orderBy]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canViewNew) void fetchPendingTutors();
  }, [canViewNew, fetchPendingTutors]);

  // Keep an open detail modal in sync with refreshed list data: after a
  // per-certificate action, reflect the updated cert statuses, or close the
  // modal if the tutor left the pending queue (profile became Active).
  useEffect(() => {
    if (!selectedTutor) return;
    const fresh = tutors.find((t) => t.userid === selectedTutor.userid) ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fresh !== selectedTutor) setSelectedTutor(fresh);
  }, [tutors, selectedTutor]);

  const fetchPendingUpdateRequests = useCallback(async () => {
    if (!canViewUpdates) return;

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
  }, [canViewUpdates]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (canViewUpdates) void fetchPendingUpdateRequests();
  }, [canViewUpdates, fetchPendingUpdateRequests]);

  useEffect(() => {
    if (activeTab === 'new' && !canViewNew && canViewUpdates) {
      setActiveTab('updates');
    } else if (activeTab === 'updates' && !canViewUpdates && canViewNew) {
      setActiveTab('new');
    }
  }, [activeTab, canViewNew, canViewUpdates, setActiveTab]);

  /**
   * Gọi lại API lấy bản MỚI NHẤT của request trước khi thực sự Duyệt/Từ chối, vì danh sách
   * không tự cập nhật real-time — nếu Tutor vừa nộp thêm thay đổi trong lúc Admin đang xem,
   * ta phải phát hiện ra và đồng bộ lại UI thay vì để Admin duyệt nhầm nội dung chưa từng thấy.
   */
  const verifyProfileUpdateRequestFreshness = async (tutorId: string): Promise<'fresh' | 'stale' | 'gone'> => {
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

  // Commit the live input as the search term (Enter or the search button).
  const commitSearch = () => {
    const next = searchInput.trim();
    if (next !== searchQuery) setSearchQuery(next);
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitSearch();
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

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

  // Some environments return the full queue without X-Pagination. Paginate
  // that response locally while preserving server-side page slices.
  const visibleTutors =
    total > PAGE_SIZE && total === tutors.length ? tutors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : tutors;

  const vettingColumns: DataTableColumn<PendingTutorFromAPI>[] = [
    {
      key: 'tutor',
      title: 'Gia sư',
      minWidth: 220,
      render: (tutor) => (
        <div className="vetting-tutor-info">
          <div
            className="vetting-tutor-avatar"
            style={{ backgroundImage: cssBackgroundUrl(tutor.avatarurl || getFallbackAvatar(tutor.fullname)) }}
          />
          <div className="vetting-profile-cell">
            <span className="vetting-profile-name">{tutor.fullname}</span>
            <span className="vetting-profile-email">{tutor.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'headline',
      title: 'Hồ sơ',
      minWidth: 190,
      render: (tutor) => (
        <div className="vetting-profile-cell">
          <span className="vetting-profile-name vetting-headline-text">
            {tutor.sections?.basicInfo?.headline || 'Chưa cập nhật'}
          </span>
          <span className="vetting-profile-email">{tutor.phone || 'Chưa có số điện thoại'}</span>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: 'date',
      title: 'Đã nộp',
      render: (tutor) => <span className="vetting-submitted-at">{formatSubmittedAt(tutor.profileCreatedAt)}</span>,
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
        <div className="certificate-row-actions">
          <button
            type="button"
            className="admin-ui-button admin-ui-button-secondary"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedTutor(tutor);
            }}
            aria-label={`Xem chi tiết hồ sơ của ${tutor.fullname}`}
          >
            <span className="material-symbols-outlined">visibility</span>
            Chi tiết
          </button>
        </div>
      ),
      minWidth: 140,
    },
  ];

  const updateRequestColumns: DataTableColumn<ProfileUpdateRequestFromAPI>[] = [
    {
      key: 'tutor',
      title: 'Gia sư',
      minWidth: 220,
      render: (req) => (
        <div className="vetting-tutor-info">
          <div
            className="vetting-tutor-avatar"
            style={{ backgroundImage: cssBackgroundUrl(req.tutorAvatarUrl || getFallbackAvatar(req.tutorFullName)) }}
          />
          <div className="vetting-profile-cell">
            <span className="vetting-profile-name">{req.tutorFullName || 'Chưa rõ tên'}</span>
            <span className="vetting-profile-email">{req.tutorEmail}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'changes',
      title: 'Thay đổi',
      minWidth: 190,
      render: (req) => {
        const changedLabels = PROFILE_UPDATE_DIFF_FIELDS.filter((f) => req[f.proposed] !== null).map((f) => f.label);
        if (req.hasProposedSubjectGradePrices) changedLabels.push('Môn học & Bảng giá');
        return (
          <span className="admin-ui-entity-secondary">
            {changedLabels.length > 0 ? changedLabels.join(', ') : 'Không có thay đổi nào được ghi nhận'}
          </span>
        );
      },
      hideOnMobile: true,
    },
    {
      key: 'date',
      title: 'Đã nộp',
      render: (req) => <span className="vetting-submitted-at">{formatSubmittedAt(req.submittedAt)}</span>,
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
        <div className="certificate-row-actions">
          <Can permission="tutor_profile_update.decide">
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
          </Can>
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
      <div className="certificate-vetting-page">
        <PageContainer title="Kiểm duyệt gia sư" maxWidth="wide">
          <div className="admin-ui-actions" style={{ marginBottom: 16 }}>
            {canViewNew && (
              <button
                type="button"
                className={`admin-ui-button ${activeTab === 'new' ? 'admin-ui-button-primary' : 'admin-ui-button-secondary'}`}
                onClick={() => setActiveTab('new')}
              >
                Hồ sơ mới ({total})
              </button>
            )}
            {canViewUpdates && (
              <button
                type="button"
                className={`admin-ui-button ${activeTab === 'updates' ? 'admin-ui-button-primary' : 'admin-ui-button-secondary'}`}
                onClick={() => setActiveTab('updates')}
              >
                Yêu cầu cập nhật hồ sơ ({updateRequests.length})
              </button>
            )}
          </div>

          {activeTab === 'new' && canViewNew && (
            <SectionCard
              title="Hồ sơ chờ duyệt"
              headerAction={
                <button
                  type="button"
                  className="vetting-refresh-button"
                  onClick={() => void fetchPendingTutors()}
                  disabled={loading}
                  aria-label="Làm mới danh sách hồ sơ chờ duyệt"
                >
                  <span className={`material-symbols-outlined ${loading ? 'vetting-spinning' : ''}`}>refresh</span>
                  Làm mới
                </button>
              }
              footer={
                searchQuery
                  ? `Tìm thấy ${total} hồ sơ khớp với "${searchQuery}"`
                  : `Hiển thị ${visibleTutors.length} / ${total} hồ sơ chờ duyệt`
              }
            >
              <div className="certificate-vetting-toolbar">
                <div className="certificate-search-group">
                  <div className="admin-ui-search">
                    <span className="material-symbols-outlined admin-ui-search-icon">search</span>
                    <input
                      id="vetting-search"
                      type="search"
                      className="admin-ui-search-input"
                      placeholder="Tìm theo tên, email, số điện thoại..."
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      onKeyDown={handleSearchKeyDown}
                    />
                  </div>
                  <button
                    type="button"
                    className="admin-ui-button admin-ui-button-primary"
                    onClick={commitSearch}
                    disabled={loading}
                  >
                    Tìm kiếm
                  </button>
                  {searchQuery && (
                    <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={clearSearch}>
                      Xóa tìm kiếm
                    </button>
                  )}
                </div>
                <label className="certificate-sort-control">
                  <span>Sắp xếp</span>
                  <select
                    id="vetting-sort"
                    className="admin-ui-search-input vetting-sort-select"
                    value={orderBy}
                    onChange={(event) => {
                      setOrderBy(event.target.value);
                      setPage(1);
                    }}
                    aria-label="Sắp xếp"
                  >
                    <option value="createdat_asc">Cũ nhất trước (FIFO)</option>
                    <option value="createdat_desc">Mới nhất trước</option>
                    <option value="tutorname_asc">Tên gia sư A→Z</option>
                    <option value="tutorname_desc">Tên gia sư Z→A</option>
                  </select>
                </label>
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
                  data={visibleTutors}
                  rowKey="userid"
                  loading={loading}
                  loadingText="Đang tải danh sách gia sư..."
                  emptyText={searchQuery ? 'Không tìm thấy hồ sơ phù hợp' : 'Không có gia sư nào đang chờ duyệt'}
                  emptyIcon={
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                      check_circle
                    </span>
                  }
                  onRowClick={(tutor) => setSelectedTutor(tutor)}
                  tableLabel="Hồ sơ gia sư chờ duyệt"
                  pagination={{
                    current: page,
                    pageSize: PAGE_SIZE,
                    total,
                    onChange: setPage,
                  }}
                  minWidth={900}
                  variant="embedded"
                  density="compact"
                  adaptive
                />
              )}
            </SectionCard>
          )}

          {activeTab === 'updates' && canViewUpdates && (
            <SectionCard
              title="Yêu cầu cập nhật hồ sơ"
              subtitle="Tutor đã Active gửi chỉnh sửa hồ sơ — Marketplace vẫn hiển thị thông tin cũ cho đến khi duyệt ở đây."
              headerAction={
                <button
                  type="button"
                  className="vetting-refresh-button"
                  onClick={() => void fetchPendingUpdateRequests()}
                  disabled={updateRequestsLoading}
                  aria-label="Làm mới danh sách yêu cầu cập nhật hồ sơ"
                >
                  <span className={`material-symbols-outlined ${updateRequestsLoading ? 'vetting-spinning' : ''}`}>
                    refresh
                  </span>
                  Làm mới
                </button>
              }
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
                  tableLabel="Yêu cầu cập nhật hồ sơ"
                  minWidth={920}
                  variant="embedded"
                  density="compact"
                  adaptive
                />
              )}
            </SectionCard>
          )}
        </PageContainer>
      </div>

      <TutorDetailModal
        tutor={canViewNew ? selectedTutor : null}
        isOpen={canViewNew && selectedTutor !== null}
        onClose={() => setSelectedTutor(null)}
        onApprove={handleApprove}
        onOpenReject={handleOpenRejectModal}
        actionLoading={actionLoading}
      />

      {canViewNew && showRejectModal && (
        <div className="certificate-modal-overlay" onMouseDown={() => setShowRejectModal(null)}>
          <div
            className="certificate-reject-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-reject-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="certificate-reject-header">
              <div>
                <span className="material-symbols-outlined">report</span>
                <h3 id="profile-reject-title">Từ chối hồ sơ gia sư</h3>
              </div>
              <button
                type="button"
                className="certificate-modal-close"
                onClick={() => setShowRejectModal(null)}
                aria-label="Đóng hộp thoại từ chối"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="certificate-reject-body">
              <p>Vui lòng nhập lý do từ chối hồ sơ. Lý do này sẽ được gửi đến gia sư để họ có thể cải thiện hồ sơ.</p>
              <textarea
                className="vetting-rejection-textarea"
                placeholder="Nhập lý do từ chối (ít nhất 20 ký tự)..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={4}
              />
              <p className="vetting-char-count">{rejectionNote.length}/20 ký tự tối thiểu</p>
            </div>
            <div className="certificate-reject-footer">
              <button
                type="button"
                className="admin-ui-button admin-ui-button-secondary"
                onClick={() => setShowRejectModal(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-ui-button admin-ui-button-danger"
                onClick={handleReject}
                disabled={rejectionNote.trim().length < 20 || actionLoading !== null}
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {canViewUpdates && selectedUpdateRequest && (
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
                  Tutor cũng đề xuất thay đổi Môn học &amp; Bảng giá — xem chi tiết bảng giá hiện tại của tutor trong hồ
                  sơ đầy đủ trước khi duyệt.
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

      {canViewUpdates && showUpdateRejectModal && (
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
