import { useState, useEffect, useCallback } from 'react';
import { ConfigProvider, Pagination } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { toast } from 'react-toastify';
import { getPendingTutors, updateTutorApproval } from '../../services/admin.service';
import TutorDetailModal from './components/TutorDetailModal';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import type { PendingTutorFromAPI } from '../../types/admin.types';
import { getFallbackAvatar, cssBackgroundUrl } from '../../utils/avatar';
import '../../styles/pages/admin-vetting.css';

const PAGE_SIZE = 15;
const DEFAULT_ORDER = 'createdat_asc';

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

const AdminVettingPage = () => {
  const [tutors, setTutors] = useState<PendingTutorFromAPI[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
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

  const fetchPendingTutors = useCallback(async () => {
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
  }, [page, searchQuery, orderBy]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPendingTutors();
  }, [fetchPendingTutors]);

  // Keep an open detail modal in sync with refreshed list data: after a
  // per-certificate action, reflect the updated cert statuses, or close the
  // modal if the tutor left the pending queue (profile became Active).
  useEffect(() => {
    if (!selectedTutor) return;
    const fresh = tutors.find((t) => t.userid === selectedTutor.userid) ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fresh !== selectedTutor) setSelectedTutor(fresh);
  }, [tutors, selectedTutor]);

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

  return (
    <>
      <div className="certificate-vetting-page">
        <PageContainer title="Kiểm duyệt gia sư" maxWidth="wide">
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
              <div className="certificate-table-footer">
                <span>
                  {searchQuery
                    ? `Tìm thấy ${total} hồ sơ khớp với "${searchQuery}"`
                    : `Hiển thị ${visibleTutors.length} / ${total} hồ sơ chờ duyệt`}
                </span>
                {total > PAGE_SIZE && (
                  <ConfigProvider
                    locale={viVN}
                    theme={{
                      token: {
                        colorPrimary: '#1a2238',
                        borderRadius: 8,
                        fontFamily: "'IBM Plex Sans', sans-serif",
                      },
                      components: {
                        Pagination: {
                          itemActiveBg: '#1a2238',
                          itemActiveColor: '#ffffff',
                          itemActiveColorHover: '#ffffff',
                          itemBg: 'transparent',
                          itemLinkBg: 'transparent',
                        },
                      },
                    }}
                  >
                    <Pagination
                      current={page}
                      pageSize={PAGE_SIZE}
                      total={total}
                      onChange={(nextPage) => setPage(nextPage)}
                      showSizeChanger={false}
                      showLessItems
                      responsive
                    />
                  </ConfigProvider>
                )}
              </div>
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
                minWidth={900}
                variant="embedded"
              />
            )}
          </SectionCard>
        </PageContainer>
      </div>

      <TutorDetailModal
        tutor={selectedTutor}
        isOpen={selectedTutor !== null}
        onClose={() => setSelectedTutor(null)}
        onApprove={handleApprove}
        onOpenReject={handleOpenRejectModal}
        actionLoading={actionLoading}
      />

      {showRejectModal && (
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
    </>
  );
};

export default AdminVettingPage;
