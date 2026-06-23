import { useState, useEffect, useCallback } from 'react';
import { ConfigProvider, Pagination } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { toast } from 'react-toastify';
import { getPendingCertificates, adminVerifyCertificate } from '../../services/admin.service';
import { DataTable, PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { DataTableColumn } from '../../components/shared';
import type { PendingCertificate } from '../../types/admin.types';
import { getFallbackAvatar, cssBackgroundUrl } from '../../utils/avatar';
import '../../styles/pages/admin-vetting.css';

const PAGE_SIZE = 15;

type ApiError = {
  response?: { status?: number };
  code?: string;
  message?: string;
};

const getVettingErrorMessage = (error: unknown) => {
  const err = error as ApiError;
  if (err?.response?.status === 401) return 'Bạn cần đăng nhập với quyền Admin để xem danh sách này.';
  if (err?.response?.status === 403) return 'Bạn không có quyền truy cập trang này.';
  if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout'))
    return 'Yêu cầu quá lâu. Vui lòng kiểm tra kết nối mạng.';
  if (err?.code === 'ERR_NETWORK') return 'Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.';
  return 'Không thể tải danh sách chứng chỉ. Vui lòng thử lại sau.';
};

const certStatusBadge = (status: string) => {
  switch (status) {
    case 'verified':
      return <StatusBadge variant="success">Đã xác minh</StatusBadge>;
    case 'rejected':
      return <StatusBadge variant="error">Đã từ chối</StatusBadge>;
    case 'pending_review':
      return <StatusBadge variant="warning">Chờ xác minh</StatusBadge>;
    default:
      return <StatusBadge variant="neutral">{status}</StatusBadge>;
  }
};

const formatSubmittedDate = (value: string | null) => {
  if (!value) return 'Chưa cập nhật';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

  const datePart = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('vi-VN', {
    minute: '2-digit',
    hour: '2-digit',
  }).format(date);

  return `${datePart} · ${timePart}`;
};

const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  ielts: 'Chứng chỉ IELTS',
  toeic: 'Chứng chỉ TOEIC',
  toefl: 'Chứng chỉ TOEFL',
  coursera: 'Chứng chỉ Coursera',
  education: 'Giáo dục',
  degree: 'Bằng cấp',
  bachelor_degree: 'Bằng cử nhân',
  university_degree: 'Bằng đại học',
  master_degree: 'Bằng thạc sĩ',
  doctorate_degree: 'Bằng tiến sĩ',
  academic_degree: 'Bằng cấp học thuật',
  professional_certificate: 'Chứng chỉ chuyên môn',
  teaching_certificate: 'Chứng chỉ nghiệp vụ sư phạm',
  language_certificate: 'Chứng chỉ ngoại ngữ',
  other: 'Khác',
};

const getCertificateTypeLabel = (value: string | null) => {
  if (!value?.trim()) return 'Chưa cập nhật';

  const normalizedValue = value.trim().toLowerCase();
  const knownLabel = CERTIFICATE_TYPE_LABELS[normalizedValue];
  if (knownLabel) return knownLabel;

  return value
    .trim()
    .replaceAll(/[_-]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(' ');
};

const isImageFile = (fileUrl: string) => {
  try {
    const pathname = new URL(fileUrl, 'https://local.invalid').pathname;
    return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(pathname);
  } catch {
    return /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:\?|#|$)/i.test(fileUrl);
  }
};

const AdminCertificateVettingPage = () => {
  const [certs, setCerts] = useState<PendingCertificate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // FIFO by default — oldest-waiting certificates surface first.
  const [orderBy, setOrderBy] = useState('createdat_asc');
  const [certActionLoading, setCertActionLoading] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<PendingCertificate | null>(null);
  // Reject flow: the cert awaiting a rejection reason + the note text.
  const [rejectingCert, setRejectingCert] = useState<PendingCertificate | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    if (!selectedCert && !rejectingCert) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedCert(null);
      setRejectingCert(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCert, rejectingCert]);

  const fetchCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPendingCertificates(page, PAGE_SIZE, {
        searchTerm: searchQuery || undefined,
        orderBy,
        status: 'pending_review',
      });
      const lastPage = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      // Step back if the current page emptied out (e.g. last row on the
      // page was just approved/rejected) so we don't strand the admin.
      if (response.content.length === 0 && page > 1) {
        setPage((prev) => prev - 1);
        return;
      }
      setCerts(response.content);
      setTotal(response.total);
    } catch (err: unknown) {
      console.error('Error fetching pending certificates:', err);
      setError(getVettingErrorMessage(err));
      setCerts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, orderBy]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCertificates();
  }, [fetchCertificates]);

  const commitSearch = () => {
    const next = searchInput.trim();
    if (next === searchQuery) return;
    setSearchQuery(next);
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

  const verifyCert = async (row: PendingCertificate, isApproved: boolean, note?: string) => {
    try {
      setCertActionLoading(row.certificateId);
      const result = await adminVerifyCertificate(row.tutorId, row.certificateId, isApproved, note);
      toast.success(isApproved ? 'Đã duyệt chứng chỉ.' : 'Đã từ chối chứng chỉ.');
      if (result.isProfileActivated) {
        toast.info(`Hồ sơ của ${row.tutorName} đã đủ điều kiện và được kích hoạt.`);
      }
      await fetchCertificates();
      return true;
    } catch (err) {
      console.error('Error verifying certificate:', err);
      toast.error('Không thể cập nhật chứng chỉ. Vui lòng thử lại.');
      return false;
    } finally {
      setCertActionLoading(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingCert) return;
    if (rejectNote.trim().length === 0) {
      toast.error('Vui lòng nhập lý do từ chối.');
      return;
    }
    const success = await verifyCert(rejectingCert, false, rejectNote.trim());
    if (success) {
      setRejectingCert(null);
      setRejectNote('');
    }
  };

  const openRejectModal = (row: PendingCertificate) => {
    setSelectedCert(null);
    setRejectingCert(row);
    setRejectNote('');
  };

  const approveFromDetail = async () => {
    if (!selectedCert) return;
    const success = await verifyCert(selectedCert, true);
    if (success) setSelectedCert(null);
  };

  // The current endpoint may return the complete list without an X-Pagination
  // header. Slice locally in that case; keep server-side slices untouched.
  const visibleCerts =
    total > PAGE_SIZE && total === certs.length ? certs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : certs;

  const columns: DataTableColumn<PendingCertificate>[] = [
    {
      key: 'tutor',
      title: 'Gia sư',
      render: (row) => (
        <div className="vetting-tutor-info">
          <div
            className="vetting-tutor-avatar"
            style={{ backgroundImage: cssBackgroundUrl(row.tutorAvatarUrl || getFallbackAvatar(row.tutorName)) }}
          />
          <div className="admin-ui-entity">
            <span className="admin-ui-entity-primary">{row.tutorName || 'Chưa rõ'}</span>
            <span className="admin-ui-entity-secondary">{row.tutorEmail}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'certificate',
      title: 'Chứng chỉ',
      render: (row) => (
        <div className="admin-ui-entity">
          <span className="admin-ui-entity-primary">{row.certificateName}</span>
          <span className="admin-ui-entity-secondary">
            {row.issuingOrganization}
            {row.yearIssued ? ` · ${row.yearIssued}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'submittedAt',
      title: 'Ngày gửi',
      render: (row) => <span className="certificate-submitted-date">{formatSubmittedDate(row.createdAt)}</span>,
      hideOnMobile: true,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => certStatusBadge(row.verificationStatus),
    },
    {
      key: 'actions',
      title: 'Hành động',
      align: 'right',
      // Decisions (duyệt/từ chối) are made from the detail modal — the list only
      // offers "Chi tiết" so the admin reviews the document before deciding.
      render: (row) => (
        <div className="certificate-row-actions">
          <button
            type="button"
            className="admin-ui-button admin-ui-button-secondary"
            onClick={() => setSelectedCert(row)}
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
    <div className="certificate-vetting-page">
      <PageContainer title="Kiểm duyệt chứng chỉ" maxWidth="wide">
        <SectionCard
          title="Chứng chỉ chờ duyệt"
          headerAction={
            <button
              type="button"
              className="vetting-refresh-button"
              onClick={() => void fetchCertificates()}
              disabled={loading}
              aria-label="Làm mới danh sách chứng chỉ chờ duyệt"
            >
              <span className={`material-symbols-outlined ${loading ? 'vetting-spinning' : ''}`}>refresh</span>
              Làm mới
            </button>
          }
          footer={
            <div className="certificate-table-footer">
              <span>
                {searchQuery
                  ? `Tìm thấy ${total} chứng chỉ khớp với "${searchQuery}"`
                  : `Hiển thị ${visibleCerts.length} / ${total} chứng chỉ chờ duyệt`}
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
                  type="search"
                  className="admin-ui-search-input"
                  placeholder="Tìm theo tên, email gia sư..."
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
                onClick={() => void fetchCertificates()}
              >
                Thử lại
              </button>
            </div>
          ) : (
            <DataTable<PendingCertificate>
              columns={columns}
              data={visibleCerts}
              rowKey="certificateId"
              loading={loading}
              loadingText="Đang tải danh sách chứng chỉ..."
              emptyText={searchQuery ? 'Không tìm thấy chứng chỉ phù hợp' : 'Không có chứng chỉ nào đang chờ xác minh'}
              emptyIcon={
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
                  workspace_premium
                </span>
              }
              minWidth={900}
              variant="embedded"
            />
          )}
        </SectionCard>
      </PageContainer>

      {selectedCert && (
        <div className="certificate-modal-overlay" onMouseDown={() => setSelectedCert(null)}>
          <section
            className="certificate-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="certificate-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="certificate-detail-header">
              <div className="certificate-detail-heading">
                <span className="certificate-detail-icon material-symbols-outlined">workspace_premium</span>
                <div>
                  <div className="certificate-detail-kicker">
                    {certStatusBadge(selectedCert.verificationStatus)}
                    <span>Hồ sơ chứng chỉ</span>
                  </div>
                  <h2 id="certificate-detail-title">{selectedCert.certificateName || 'Chứng chỉ chưa có tên'}</h2>
                  <p>{selectedCert.issuingOrganization || 'Chưa cập nhật đơn vị cấp'}</p>
                </div>
              </div>
              <button
                type="button"
                className="certificate-modal-close"
                onClick={() => setSelectedCert(null)}
                aria-label="Đóng chi tiết chứng chỉ"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="certificate-detail-content">
              <div className="certificate-document-panel">
                <div className="certificate-panel-title">
                  <span className="material-symbols-outlined">description</span>
                  Tài liệu chứng chỉ
                </div>
                {selectedCert.certificateFileUrl ? (
                  <>
                    {isImageFile(selectedCert.certificateFileUrl) ? (
                      <div className="certificate-image-viewport">
                        <img
                          className="certificate-document-image"
                          src={selectedCert.certificateFileUrl}
                          alt={`Chứng chỉ ${selectedCert.certificateName}`}
                        />
                      </div>
                    ) : (
                      <iframe
                        className="certificate-document-frame"
                        src={selectedCert.certificateFileUrl}
                        title={`Tài liệu ${selectedCert.certificateName}`}
                      />
                    )}
                    <a
                      href={selectedCert.certificateFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="certificate-document-link"
                    >
                      <span className="material-symbols-outlined">open_in_new</span>
                      Mở tài liệu ở tab mới
                    </a>
                  </>
                ) : (
                  <div className="certificate-document-empty">
                    <span className="material-symbols-outlined">scan_delete</span>
                    <p>Gia sư chưa đính kèm tài liệu chứng chỉ.</p>
                  </div>
                )}
              </div>

              <div className="certificate-information-panel">
                <div className="certificate-tutor-card">
                  <div
                    className="vetting-tutor-avatar certificate-detail-avatar"
                    style={{
                      backgroundImage: cssBackgroundUrl(
                        selectedCert.tutorAvatarUrl || getFallbackAvatar(selectedCert.tutorName),
                      ),
                    }}
                  />
                  <div>
                    <span>Gia sư gửi chứng chỉ</span>
                    <strong>{selectedCert.tutorName || 'Chưa cập nhật'}</strong>
                    <a href={`mailto:${selectedCert.tutorEmail}`}>{selectedCert.tutorEmail || 'Chưa cập nhật email'}</a>
                  </div>
                </div>

                <div className="certificate-info-section">
                  <h3>Thông tin chứng chỉ</h3>
                  <dl className="certificate-info-grid">
                    <div>
                      <dt>Loại chứng chỉ</dt>
                      <dd>{getCertificateTypeLabel(selectedCert.certificateType)}</dd>
                    </div>
                    <div>
                      <dt>Năm cấp</dt>
                      <dd>{selectedCert.yearIssued || 'Chưa cập nhật'}</dd>
                    </div>
                    <div>
                      <dt>Đơn vị cấp</dt>
                      <dd>{selectedCert.issuingOrganization || 'Chưa cập nhật'}</dd>
                    </div>
                    <div>
                      <dt>Mã chứng nhận</dt>
                      <dd>{selectedCert.credentialId || 'Không có'}</dd>
                    </div>
                    <div className="certificate-info-wide">
                      <dt>Thời gian gửi</dt>
                      <dd>{formatSubmittedDate(selectedCert.createdAt)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="certificate-verification-card">
                  <div>
                    <span className="material-symbols-outlined">verified_user</span>
                    <div>
                      <strong>Đối chiếu thông tin</strong>
                      <p>Kiểm tra tài liệu, đơn vị cấp và mã chứng nhận trước khi duyệt.</p>
                    </div>
                  </div>
                  {selectedCert.credentialUrl ? (
                    <a href={selectedCert.credentialUrl} target="_blank" rel="noopener noreferrer">
                      Xác minh trên trang cấp
                      <span className="material-symbols-outlined">open_in_new</span>
                    </a>
                  ) : (
                    <span className="certificate-no-credential">Không có đường dẫn xác minh</span>
                  )}
                </div>
              </div>
            </div>

            <footer className="certificate-detail-footer">
              <button
                type="button"
                className="admin-ui-button admin-ui-button-secondary"
                onClick={() => setSelectedCert(null)}
              >
                Đóng
              </button>
              <div className="certificate-detail-decisions">
                <button
                  type="button"
                  className="admin-ui-button admin-ui-button-danger"
                  onClick={() => openRejectModal(selectedCert)}
                  disabled={certActionLoading === selectedCert.certificateId}
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  className="admin-ui-button admin-ui-button-success"
                  onClick={() => void approveFromDetail()}
                  disabled={certActionLoading === selectedCert.certificateId}
                >
                  <span className="material-symbols-outlined">check</span>
                  {certActionLoading === selectedCert.certificateId ? 'Đang xử lý...' : 'Duyệt chứng chỉ'}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {rejectingCert && (
        <div className="certificate-modal-overlay" onMouseDown={() => setRejectingCert(null)}>
          <div
            className="certificate-reject-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="certificate-reject-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="certificate-reject-header">
              <div>
                <span className="material-symbols-outlined">report</span>
                <h3 id="certificate-reject-title">Từ chối chứng chỉ</h3>
              </div>
              <button
                type="button"
                className="certificate-modal-close"
                onClick={() => setRejectingCert(null)}
                aria-label="Đóng hộp thoại từ chối"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="certificate-reject-body">
              <p>
                Từ chối chứng chỉ <strong>{rejectingCert.certificateName}</strong> của{' '}
                <strong>{rejectingCert.tutorName || 'gia sư này'}</strong>. Lý do sẽ được lưu vào ghi chú xác minh.
              </p>
              <textarea
                className="vetting-rejection-textarea"
                placeholder="Nhập lý do từ chối..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={4}
              />
            </div>
            <div className="certificate-reject-footer">
              <button
                type="button"
                className="admin-ui-button admin-ui-button-secondary"
                onClick={() => setRejectingCert(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="admin-ui-button admin-ui-button-danger"
                onClick={handleConfirmReject}
                disabled={rejectNote.trim().length === 0 || certActionLoading !== null}
              >
                {certActionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificateVettingPage;
