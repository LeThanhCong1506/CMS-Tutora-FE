import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PendingTutorFromAPI } from '../../../types/admin.types';
import { getFallbackAvatar, cssBackgroundUrl } from '../../../utils/avatar';
import { getYouTubeEmbedUrl } from '../../../utils/youtube';
import { Can } from '../../../contexts/AccessContext';
import '../../../styles/pages/admin-vetting.css';

interface TutorDetailModalProps {
  tutor: PendingTutorFromAPI | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (tutorId: string) => Promise<void>;
  onOpenReject: (tutorId: string) => void;
  actionLoading: string | null;
}

const PROFILE_STATUS_LABELS: Record<string, string> = {
  pending_approval: 'Chờ phê duyệt',
  pending_review: 'Chờ xem xét',
  approved: 'Đã phê duyệt',
  rejected: 'Đã từ chối',
};

const SECTION_STATUS_LABELS: Record<string, string> = {
  updated: 'Đã cập nhật',
  completed: 'Đã hoàn tất',
  verified: 'Đã xác minh',
  pending_review: 'Chờ xem xét',
  in_progress: 'Chưa hoàn tất',
  rejected: 'Cần cập nhật lại',
};

const formatSectionStatus = (status?: string | null) => {
  if (!status) return 'Chưa cập nhật';
  return SECTION_STATUS_LABELS[status.toLowerCase()] || status.replaceAll('_', ' ');
};

const getStatusTone = (status?: string | null) => {
  const normalized = status?.toLowerCase();
  if (normalized === 'updated' || normalized === 'completed' || normalized === 'verified') return 'success';
  if (normalized === 'rejected') return 'error';
  return 'warning';
};

const formatGender = (gender?: string | null) => {
  switch (gender?.trim().toLowerCase()) {
    case 'female':
    case 'nữ':
    case 'nu':
      return 'Nữ';
    case 'male':
    case 'nam':
      return 'Nam';
    default:
      return gender || 'Chưa cập nhật';
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatTeachingMode = (mode?: string | null) => {
  switch (mode?.trim().toLowerCase()) {
    case 'online':
      return 'Trực tuyến';
    case 'offline':
      return 'Trực tiếp';
    case 'both':
      return 'Trực tuyến và trực tiếp';
    default:
      return mode || 'Chưa cập nhật';
  }
};

const InfoItem = ({ label, value, wide = false }: { label: string; value: React.ReactNode; wide?: boolean }) => (
  <div className={wide ? 'profile-detail-info-item profile-detail-info-wide' : 'profile-detail-info-item'}>
    <dt>{label}</dt>
    <dd>{value || 'Chưa cập nhật'}</dd>
  </div>
);

const ProgressItem = ({ icon, label, status }: { icon: string; label: string; status?: string | null }) => (
  <li>
    <span className="material-symbols-outlined">{icon}</span>
    <div>
      <strong>{label}</strong>
      <span className={`profile-section-status ${getStatusTone(status)}`}>{formatSectionStatus(status)}</span>
    </div>
  </li>
);

const TutorDetailModal: React.FC<TutorDetailModalProps> = ({
  tutor,
  isOpen,
  onClose,
  onApprove,
  onOpenReject,
  actionLoading,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (imagePreview) setImagePreview(null);
      else onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [imagePreview, isOpen, onClose]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImagePreview(null);
    setImagePreviewError(false);
  }, [tutor?.userid]);

  if (!isOpen || !tutor) return null;

  const { sections } = tutor;
  const basicInfo = sections?.basicInfo;
  const introduction = sections?.introduction;
  const identityCard = sections?.identityCard;
  const video = sections?.video;
  // Video giới thiệu là link YouTube (BE validate khi tutor cập nhật) — phải nhúng iframe, thẻ <video> không phát được.
  const introVideoEmbedUrl = getYouTubeEmbedUrl(video?.videoUrl);
  const certificates = sections?.certificates;
  const isLoading = actionLoading === tutor.userid;
  const avatarUrl = tutor.avatarurl || basicInfo?.avatarUrl || getFallbackAvatar(tutor.fullname);
  const teachingArea = [basicInfo?.teachingAreaDistrict, basicInfo?.teachingAreaCity].filter(Boolean).join(', ');
  const profileStatus = PROFILE_STATUS_LABELS[tutor.profileStatus] || tutor.profileStatus.replaceAll('_', ' ');

  return (
    <>
      <div className="certificate-modal-overlay" onMouseDown={onClose}>
        <section
          className="profile-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-detail-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="profile-detail-header">
            <div className="profile-detail-identity">
              <div className="profile-detail-avatar" style={{ backgroundImage: cssBackgroundUrl(avatarUrl) }} />
              <div>
                <div className="profile-detail-kicker">
                  <span className="profile-detail-status">{profileStatus}</span>
                  <span>Hồ sơ gia sư</span>
                </div>
                <h2 id="profile-detail-title">{tutor.fullname}</h2>
                <p>{tutor.email}</p>
              </div>
            </div>
            <button
              type="button"
              className="certificate-modal-close"
              onClick={onClose}
              aria-label="Đóng chi tiết hồ sơ"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </header>

          <div className="profile-detail-content">
            <aside className="profile-detail-sidebar">
              <div className="profile-progress-card">
                <h3>Tiến độ hồ sơ</h3>
                <ul>
                  <ProgressItem icon="person" label="Thông tin cơ bản" status={basicInfo?.status} />
                  <ProgressItem icon="notes" label="Giới thiệu" status={introduction?.status} />
                  <ProgressItem icon="badge" label="Danh tính" status={identityCard?.status} />
                  <ProgressItem icon="videocam" label="Video giới thiệu" status={video?.status} />
                  <ProgressItem icon="workspace_premium" label="Chứng chỉ" status={certificates?.status} />
                </ul>
              </div>

              <div className="profile-certificate-summary">
                <div>
                  <span className="material-symbols-outlined">workspace_premium</span>
                  <div>
                    <strong>{certificates?.totalCount ?? 0} chứng chỉ</strong>
                    <span>{formatSectionStatus(certificates?.status)}</span>
                  </div>
                </div>
                <p>Chứng chỉ được kiểm duyệt riêng để tránh tạo hai nơi ra quyết định.</p>
                <Can permission="certificate.view">
                  <Link to="/admin-portal/vetting/certificates" onClick={onClose}>
                    Đến trang kiểm duyệt chứng chỉ
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Link>
                </Can>
              </div>
            </aside>

            <main className="profile-detail-main">
              <section className="profile-detail-section">
                <div className="profile-detail-section-heading">
                  <span className="material-symbols-outlined">account_circle</span>
                  <div>
                    <h3>Thông tin cá nhân</h3>
                  </div>
                </div>
                <dl className="profile-detail-info-grid">
                  <InfoItem label="Họ và tên" value={tutor.fullname} />
                  <InfoItem label="Tên đăng nhập" value={tutor.username} />
                  <InfoItem label="Email" value={tutor.email} />
                  <InfoItem label="Số điện thoại" value={tutor.phone} />
                  <InfoItem label="Ngày sinh" value={formatDate(tutor.birthdate)} />
                  <InfoItem label="Giới tính" value={formatGender(tutor.gender)} />
                  <InfoItem label="Địa chỉ" value={tutor.address || 'Chưa cập nhật'} wide />
                  <InfoItem label="Thời gian gửi hồ sơ" value={formatDateTime(tutor.profileCreatedAt)} />
                  <InfoItem label="Cập nhật gần nhất" value={formatDateTime(tutor.profileUpdatedAt)} />
                </dl>
              </section>

              <section className="profile-detail-section">
                <div className="profile-detail-section-heading">
                  <span className="material-symbols-outlined">school</span>
                  <div>
                    <h3>Thông tin giảng dạy</h3>
                  </div>
                </div>
                <dl className="profile-detail-info-grid">
                  <InfoItem label="Tiêu đề hồ sơ" value={basicInfo?.headline} wide />
                  <InfoItem label="Hình thức dạy" value={formatTeachingMode(basicInfo?.teachingMode)} />
                  <InfoItem label="Khu vực dạy" value={teachingArea || 'Chưa cập nhật'} />
                </dl>
              </section>

              <section className="profile-detail-section">
                <div className="profile-detail-section-heading">
                  <span className="material-symbols-outlined">subject</span>
                  <div>
                    <h3>Giới thiệu chuyên môn</h3>
                  </div>
                </div>
                <div className="profile-detail-copy-grid">
                  <article>
                    <span>Giới thiệu bản thân</span>
                    <p>{introduction?.bio || 'Chưa cập nhật'}</p>
                  </article>
                  <article>
                    <span>Học vấn</span>
                    <p>{introduction?.education || 'Chưa cập nhật'}</p>
                  </article>
                  <article>
                    <span>Kinh nghiệm</span>
                    <p>{introduction?.experience || 'Chưa cập nhật'}</p>
                  </article>
                  {introduction?.gpa !== null && introduction?.gpa !== undefined && (
                    <article>
                      <span>GPA</span>
                      <p>
                        {introduction.gpa}
                        {introduction.gpaScale ? ` / ${introduction.gpaScale}` : ''}
                      </p>
                    </article>
                  )}
                </div>
              </section>

              <section className="profile-detail-section">
                <div className="profile-detail-section-heading">
                  <span className="material-symbols-outlined">verified_user</span>
                  <div>
                    <h3>Thông tin danh tính</h3>
                  </div>
                  <span className={`profile-identity-badge ${identityCard?.isVerified ? 'verified' : 'pending'}`}>
                    {identityCard?.isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                  </span>
                </div>
                <div className="profile-identity-layout">
                  {identityCard?.portraitImageUrl && (
                    <button
                      type="button"
                      className="profile-portrait-button"
                      onClick={() => {
                        setImagePreviewError(false);
                        setImagePreview(identityCard.portraitImageUrl || null);
                      }}
                      aria-label="Xem ảnh chân dung"
                    >
                      <img src={identityCard.portraitImageUrl} alt="Ảnh chân dung gia sư" />
                      <span>Xem ảnh</span>
                    </button>
                  )}
                  <dl className="profile-detail-info-grid">
                    <InfoItem label="Họ tên trên giấy tờ" value={identityCard?.fullName} />
                    <InfoItem label="Số giấy tờ" value={identityCard?.identityNumberMasked} />
                    <InfoItem label="Ngày sinh" value={formatDate(identityCard?.dateOfBirth)} />
                    <InfoItem label="Giới tính" value={formatGender(identityCard?.gender)} />
                    <InfoItem
                      label="Địa chỉ thường trú"
                      value={identityCard?.permanentAddress || 'Chưa cập nhật'}
                      wide
                    />
                  </dl>
                </div>
              </section>

              {video?.videoUrl && (
                <section className="profile-detail-section">
                  <div className="profile-detail-section-heading">
                    <span className="material-symbols-outlined">play_circle</span>
                    <div>
                      <h3>Video giới thiệu</h3>
                      <p>Video do gia sư tải lên trong quá trình hoàn thiện hồ sơ.</p>
                    </div>
                  </div>
                  {introVideoEmbedUrl ? (
                    <iframe
                      className="profile-intro-video"
                      src={introVideoEmbedUrl}
                      title="Video giới thiệu của gia sư"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video className="profile-intro-video" src={video.videoUrl} controls>
                      Trình duyệt không hỗ trợ video.
                    </video>
                  )}
                </section>
              )}
            </main>
          </div>

          <footer className="profile-detail-footer">
            <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={onClose}>
              Đóng
            </button>
            <div>
              <Can permission="tutor_approval.decide">
              <button
                type="button"
                className="admin-ui-button admin-ui-button-danger"
                onClick={() => {
                  onOpenReject(tutor.userid);
                  onClose();
                }}
                disabled={isLoading}
              >
                Từ chối hồ sơ
              </button>
              <button
                type="button"
                className="admin-ui-button admin-ui-button-success"
                onClick={() => void onApprove(tutor.userid)}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined">check</span>
                {isLoading ? 'Đang xử lý...' : 'Phê duyệt hồ sơ'}
              </button>
              </Can>
            </div>
          </footer>
        </section>
      </div>

      {imagePreview && (
        <div
          className="detail-image-preview-overlay"
          onMouseDown={() => {
            setImagePreview(null);
            setImagePreviewError(false);
          }}
        >
          <div className="detail-image-preview-container" onMouseDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="detail-image-preview-close"
              onClick={() => {
                setImagePreview(null);
                setImagePreviewError(false);
              }}
              aria-label="Đóng ảnh xem trước"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            {imagePreviewError ? (
              <div className="detail-image-preview-error">
                <span className="material-symbols-outlined">broken_image</span>
                <strong>Không thể tải ảnh xem trước</strong>
                <a href={imagePreview} target="_blank" rel="noopener noreferrer">
                  Mở ảnh ở tab mới
                  <span className="material-symbols-outlined">open_in_new</span>
                </a>
              </div>
            ) : (
              <img
                src={imagePreview}
                alt="Ảnh chân dung xem trước"
                className="detail-image-preview-img"
                onError={() => setImagePreviewError(true)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TutorDetailModal;
