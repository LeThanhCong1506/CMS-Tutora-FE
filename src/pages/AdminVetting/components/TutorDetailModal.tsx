import { useState } from 'react';
import type { PendingTutorFromAPI } from '../../../types/admin.types';
import '../../../styles/pages/admin-vetting.css';

interface TutorDetailModalProps {
  tutor: PendingTutorFromAPI | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (tutorId: string) => Promise<void>;
  onOpenReject: (tutorId: string) => void;
  actionLoading: string | null;
}

const TutorDetailModal: React.FC<TutorDetailModalProps> = ({
  tutor,
  isOpen,
  onClose,
  onApprove,
  onOpenReject,
  actionLoading,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (!isOpen || !tutor) return null;

  // Destructure sections for easy access
  const { sections } = tutor;
  const basicInfo = sections?.basicInfo;
  const introduction = sections?.introduction;
  const pricing = sections?.pricing;
  const video = sections?.video;
  const identityCard = sections?.identityCard;
  const certificates = sections?.certificates;

  const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount) return 'Chưa cập nhật';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatTeachingMode = (mode: string | null | undefined): string => {
    switch (mode) {
      case 'Online': return 'Trực tuyến';
      case 'Offline': return 'Tại nhà';
      case 'Both': return 'Trực tuyến & Tại nhà';
      default: return 'Chưa cập nhật';
    }
  };

  const formatGender = (gender: string | null): string => {
    switch (gender?.toUpperCase()) {
      case 'NAM': return 'Nam';
      case 'NU':
      case 'NỮ': return 'Nữ';
      default: return 'Khác';
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Chưa cập nhật';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const parseGradeLevels = (gradeLevels: string): string => {
    try {
      const parsed = JSON.parse(gradeLevels) as string[];
      return parsed.map(g => {
        const match = g.match(/grade_(\d+)/);
        return match ? `Lớp ${match[1]}` : g;
      }).join(', ');
    } catch {
      return gradeLevels;
    }
  };

  const parseTags = (tags: string): string[] => {
    try {
      return JSON.parse(tags) as string[];
    } catch {
      return [];
    }
  };

  const isLoading = actionLoading === tutor.userid;
  const isVerified = identityCard?.isVerified ?? false;

  return (
    <>
      {/* Detail Modal Overlay */}
      <div className="detail-modal-overlay" onClick={onClose}>
        <div className="detail-modal" onClick={(e) => e.stopPropagation()}>

          {/* Modal Header */}
          <div className="detail-modal-header">
            <div className="detail-modal-header-left">
              <div
                className="detail-modal-avatar"
                style={{ backgroundImage: `url(${tutor.avatarurl || basicInfo?.avatarUrl || ''})` }}
              />
              <div className="detail-modal-header-info">
                <h2 className="detail-modal-name">{tutor.fullname}</h2>
                <p className="detail-modal-email">{tutor.email}</p>
                <div className="detail-modal-badges">
                  <span className="detail-modal-status-badge pending">
                    <span className="detail-modal-status-dot"></span>
                    Chờ xem xét
                  </span>
                  {isVerified ? (
                    <span className="detail-modal-status-badge verified">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>
                      CCCD đã xác minh
                    </span>
                  ) : (
                    <span className="detail-modal-status-badge unverified">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>pending</span>
                      CCCD chưa xác minh
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="detail-modal-close" onClick={onClose}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="detail-modal-body">

            {/* Section 1: Personal Info */}
            <div className="detail-section">
              <h3 className="detail-section-title">
                <span className="material-symbols-outlined">person</span>
                Thông tin cá nhân
              </h3>
              <div className="detail-grid">
                <div className="detail-field">
                  <span className="detail-label">Họ và tên</span>
                  <span className="detail-value">{tutor.fullname}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{tutor.email}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Số điện thoại</span>
                  <span className="detail-value">{tutor.phone || 'Chưa cập nhật'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Giới tính</span>
                  <span className="detail-value">{formatGender(tutor.gender)}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Ngày sinh</span>
                  <span className="detail-value">{formatDate(tutor.birthdate)}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Địa chỉ</span>
                  <span className="detail-value">{tutor.address || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Identity Verification */}
            <div className="detail-section">
              <h3 className="detail-section-title">
                <span className="material-symbols-outlined">badge</span>
                Xác minh danh tính (CCCD)
                {isVerified ? (
                  <span className="detail-verified-tag">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                    Đã xác minh
                  </span>
                ) : (
                  <span className="detail-unverified-tag">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>pending</span>
                    Chưa xác minh
                  </span>
                )}
              </h3>
              <div className="detail-id-cards">
                <div className="detail-id-card">
                  <p className="detail-id-label">Mặt trước CCCD</p>
                  {identityCard?.frontImageUrl ? (
                    <img
                      src={identityCard.frontImageUrl}
                      alt="CCCD Mặt trước"
                      className="detail-id-img"
                      onClick={() => setImagePreview(identityCard.frontImageUrl)}
                    />
                  ) : (
                    <div className="detail-id-placeholder">
                      <span className="material-symbols-outlined">image_not_supported</span>
                      <p>Chưa tải lên</p>
                    </div>
                  )}
                </div>
                <div className="detail-id-card">
                  <p className="detail-id-label">Mặt sau CCCD</p>
                  {identityCard?.backImageUrl ? (
                    <img
                      src={identityCard.backImageUrl}
                      alt="CCCD Mặt sau"
                      className="detail-id-img"
                      onClick={() => setImagePreview(identityCard.backImageUrl)}
                    />
                  ) : (
                    <div className="detail-id-placeholder">
                      <span className="material-symbols-outlined">image_not_supported</span>
                      <p>Chưa tải lên</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Tutor Profile */}
            <div className="detail-section">
              <h3 className="detail-section-title">
                <span className="material-symbols-outlined">school</span>
                Thông tin gia sư
              </h3>
              <div className="detail-grid">
                <div className="detail-field full-width">
                  <span className="detail-label">Tiêu đề</span>
                  <span className="detail-value">{basicInfo?.headline || 'Chưa cập nhật'}</span>
                </div>
                <div className="detail-field full-width">
                  <span className="detail-label">Giới thiệu bản thân</span>
                  <span className="detail-value bio">{introduction?.bio || 'Chưa cập nhật'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Học vấn</span>
                  <span className="detail-value">{introduction?.education || 'Chưa cập nhật'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">GPA</span>
                  <span className="detail-value">
                    {introduction?.gpa ? `${introduction.gpa}/${introduction.gpaScale || 10}` : 'Chưa cập nhật'}
                  </span>
                </div>
                <div className="detail-field full-width">
                  <span className="detail-label">Kinh nghiệm</span>
                  <span className="detail-value">{introduction?.experience || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* Section 4: Teaching Info */}
            <div className="detail-section">
              <h3 className="detail-section-title">
                <span className="material-symbols-outlined">payments</span>
                Thông tin dạy học
              </h3>
              <div className="detail-grid">
                <div className="detail-field">
                  <span className="detail-label">Giá theo giờ</span>
                  <span className="detail-value price">{formatCurrency(pricing?.hourlyRate)}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Giá buổi học thử</span>
                  <span className="detail-value">{formatCurrency(pricing?.trialLessonPrice)}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Hình thức dạy</span>
                  <span className="detail-value">{formatTeachingMode(basicInfo?.teachingMode)}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Cho phép thương lượng giá</span>
                  <span className="detail-value">{pricing?.allowPriceNegotiation ? 'Có' : 'Không'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Khu vực dạy</span>
                  <span className="detail-value">
                    {basicInfo?.teachingAreaCity && basicInfo?.teachingAreaDistrict
                      ? `${basicInfo.teachingAreaDistrict}, ${basicInfo.teachingAreaCity}`
                      : 'Chưa cập nhật'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 5: Subjects */}
            {basicInfo?.subjects && basicInfo.subjects.length > 0 && (
              <div className="detail-section">
                <h3 className="detail-section-title">
                  <span className="material-symbols-outlined">menu_book</span>
                  Môn học giảng dạy
                </h3>
                <div className="detail-subjects-list">
                  {basicInfo.subjects.map((subject, index) => (
                    <div key={index} className="detail-subject-item">
                      <div className="detail-subject-header">
                        <span className="detail-subject-id">{subject.subjectName}</span>
                        <span className="detail-subject-levels">{parseGradeLevels(subject.gradeLevels)}</span>
                      </div>
                      {subject.tags && (
                        <div className="detail-subject-tags">
                          {parseTags(subject.tags).map((tag, i) => (
                            <span key={i} className="detail-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 6: Certificates */}
            {certificates && certificates.totalCount > 0 && (
              <div className="detail-section">
                <h3 className="detail-section-title">
                  <span className="material-symbols-outlined">workspace_premium</span>
                  Bằng cấp / Chứng chỉ
                  <span className="detail-count-tag">{certificates.totalCount}</span>
                </h3>
                <div className="detail-certificates-list">
                  {certificates.certificates.map((cert) => (
                    <div key={cert.certificateId} className="detail-cert-item">
                      <div className="detail-cert-header">
                        <div className="detail-cert-info">
                          <span className="detail-cert-name">{cert.certificateName}</span>
                          <span className="detail-cert-org">{cert.issuingOrganization} · {cert.yearIssued}</span>
                        </div>
                        <span className={`detail-cert-status ${cert.verificationStatus === 'pending_review' ? 'pending' : cert.verificationStatus}`}>
                          {cert.verificationStatus === 'pending_review' ? 'Chờ xác minh' : cert.verificationStatus}
                        </span>
                      </div>
                      {cert.verificationNote && (
                        <p className="detail-cert-note">{cert.verificationNote}</p>
                      )}
                      {cert.certificateFileUrl && (
                        <a href={cert.certificateFileUrl} target="_blank" rel="noopener noreferrer" className="detail-cert-link">
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                          Xem chứng chỉ
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 7: Video Introduction */}
            {video?.videoUrl && (
              <div className="detail-section">
                <h3 className="detail-section-title">
                  <span className="material-symbols-outlined">videocam</span>
                  Video giới thiệu
                </h3>
                <div className="detail-video-wrapper">
                  <video src={video.videoUrl} controls className="detail-video">
                    Trình duyệt không hỗ trợ video.
                  </video>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="detail-modal-footer">
            <button className="vetting-btn vetting-btn-outline" onClick={onClose}>
              Đóng
            </button>
            <div className="detail-modal-footer-actions">
              <button
                className="vetting-btn vetting-btn-reject"
                onClick={() => { onOpenReject(tutor.userid); onClose(); }}
                disabled={isLoading}
              >
                <span className="material-symbols-outlined">close</span>
                Từ chối
              </button>
              <button
                className="vetting-btn vetting-btn-approve"
                onClick={() => onApprove(tutor.userid)}
                disabled={isLoading}
              >
                {isLoading ? (
                  'Đang xử lý...'
                ) : (
                  <>
                    <span className="material-symbols-outlined">check</span>
                    Phê duyệt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Overlay */}
      {imagePreview && (
        <div className="detail-image-preview-overlay" onClick={() => setImagePreview(null)}>
          <div className="detail-image-preview-container">
            <button className="detail-image-preview-close" onClick={() => setImagePreview(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <img src={imagePreview} alt="Preview" className="detail-image-preview-img" />
          </div>
        </div>
      )}
    </>
  );
};

export default TutorDetailModal;
