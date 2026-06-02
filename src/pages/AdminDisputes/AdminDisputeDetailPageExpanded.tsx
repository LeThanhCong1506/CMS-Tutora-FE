import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import IssueWarningModal from './components/IssueWarningModal';
import SuspendTutorModal from './components/SuspendTutorModal';
import LockAccountConfirmDialog from './components/LockAccountConfirmDialog';
import {
    getDisputeDetail,
    resolveDispute,
    investigateDispute,
    getDisputeChatHistory,
    issueWarning,
    suspendTutor,
    lockAccount,
} from '../../services/admin.service';
import type { DisputeDetail, ResolutionType } from '../../types/admin.types';
import { formatCurrency, formatDateTime, formatRelativeTime, formatDisputeType } from '../../utils/formatters';

import '../../styles/pages/admin-dashboard.css';
import '../../styles/pages/admin-dispute-detail.css';

const AdminDisputeDetailPageExpanded = () => {
    const { disputeId } = useParams<{ disputeId: string }>();

    // State management
    const [disputeDetail, setDisputeDetail] = useState<DisputeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Tab states
    const [activeTab, setActiveTab] = useState('evidence');
    const [verdict, setVerdict] = useState<ResolutionType>('refund_100');
    const [adminNotes, setAdminNotes] = useState('');

    // Chat history
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Modal states
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);

    // Submitting state
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch dispute detail
    useEffect(() => {
        if (disputeId) {
            fetchDisputeDetail(disputeId);
        }
    }, [disputeId]);

    const fetchDisputeDetail = async (id: string) => {
        try {
            setLoading(true);
            setError(null);
            const data = await getDisputeDetail(id);
            setDisputeDetail(data);
        } catch (err) {
            console.error('Error fetching dispute detail:', err);
            setError('Không thể tải chi tiết khiếu nại');
        } finally {
            setLoading(false);
        }
    };

    // Fetch chat history when switching to chat tab
    const fetchChatHistory = async () => {
        if (!disputeId) return;
        try {
            setChatLoading(true);
            const data = await getDisputeChatHistory(disputeId);
            setChatMessages(data);
        } catch (err) {
            console.error('Error fetching chat history:', err);
            setChatMessages([]);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'chat' && chatMessages.length === 0) {
            fetchChatHistory();
        }
    }, [activeTab]);

    const handleResolveDispute = async () => {
        if (!disputeDetail || !disputeId) return;

        if (adminNotes.trim().length < 10) {
            toast.error('Ghi chú phải có ít nhất 10 ký tự');
            return;
        }

        try {
            setIsSubmitting(true);
            await resolveDispute(disputeDetail.disputeId, {
                resolutionType: verdict,
                resolutionNote: adminNotes,
            });
            toast.success('Đã giải quyết khiếu nại thành công!');
            // Refresh data
            await fetchDisputeDetail(disputeId);
        } catch (err) {
            console.error('Error resolving dispute:', err);
            toast.error('Không thể giải quyết khiếu nại');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInvestigate = async () => {
        if (!disputeDetail || !disputeId) return;
        try {
            setIsSubmitting(true);
            await investigateDispute(disputeDetail.disputeId);
            toast.success('Đã bắt đầu điều tra khiếu nại');
            await fetchDisputeDetail(disputeId);
        } catch (err) {
            console.error('Error investigating dispute:', err);
            toast.error('Không thể bắt đầu điều tra');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Wrapper functions for modal callbacks
    const handleIssueWarning = async (_disputeId: string, _tutorId: string, reason: string, severity: 'low' | 'medium' | 'high') => {
        const warninglevel = severity === 'high' ? 2 : 1;
        await issueWarning({
            userid: _tutorId,
            reason,
            warninglevel,
            relatedbookingid: _disputeId,
        });
    };

    const handleSuspendTutor = async (tutorId: string, reason: string, durationDays: number) => {
        await suspendTutor({
            userid: tutorId,
            reason,
            suspensiontype: durationDays > 30 ? 'account_locked' : 'hidden_1_week',
            durationDays,
        });
    };

    const handleLockAccount = async (userId: string, reason: string) => {
        await lockAccount(userId, reason);
    };

    if (loading) {
        return (
            <main className="admin-main">
                <div className="dispute-detail-content">
                    <p>Đang tải chi tiết khiếu nại...</p>
                </div>
            </main>
        );
    }

    if (error || !disputeDetail) {
        return (
            <main className="admin-main">
                <div className="dispute-detail-content">
                    <p style={{ color: '#dc2626' }}>{error || 'Không tìm thấy khiếu nại'}</p>
                </div>
            </main>
        );
    }

    // Evidence from backend (string array of URLs)
    const evidenceUrls = disputeDetail.evidence || [];
    const lesson = disputeDetail.lesson;
    const tutor = disputeDetail.tutor;
    const createdBy = disputeDetail.createdBy;
    const lessonPrice = lesson?.lessonPrice || 0;

    return (
        <>
            <main className="admin-main">
                {/* Header */}
                <header className="dispute-detail-header">
                    <div className="dispute-detail-header-inner">
                        <div className="dispute-detail-top-row">
                            <div className="dispute-header-content">
                                <div className="dispute-breadcrumbs">
                                    <span className="dispute-breadcrumb-item">Giải quyết khiếu nại</span>
                                    <span style={{ color: '#81786a' }}>•</span>
                                    <span className="dispute-breadcrumb-item">Hồ sơ #{disputeDetail.disputeId}</span>
                                </div>
                                <h1 className="dispute-detail-title">
                                    Hồ sơ #{disputeDetail.disputeId}: {formatDisputeType(disputeDetail.disputeType || '')}
                                </h1>
                                <div className="dispute-detail-meta">
                                    <span>{disputeDetail.timeSinceCreation || (disputeDetail.createdAt ? `Tạo ${formatRelativeTime(disputeDetail.createdAt)}` : 'N/A')}</span>
                                    <span>•</span>
                                    <span className="dispute-action-required">
                                        {disputeDetail.status === 'pending' ? 'Cần xử lý' : disputeDetail.status === 'investigating' ? 'Đang điều tra' : 'Đã giải quyết'}
                                    </span>
                                </div>
                            </div>
                            <div className="dispute-detail-actions">
                                <div className="dispute-live-status">
                                    <div className="dispute-pulse-dot"></div>
                                    Đang xem xét trực tiếp
                                </div>
                                <div className="dispute-escrow-badge">
                                    Số tiền: {formatCurrency(lessonPrice)}
                                </div>
                            </div>
                        </div>

                        {/* Admin Action Buttons */}
                        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                            {disputeDetail.status === 'pending' && (
                                <button
                                    className="vetting-btn vetting-btn-secondary"
                                    onClick={handleInvestigate}
                                    disabled={isSubmitting}
                                    style={{ fontSize: '13px', padding: '8px 16px' }}
                                >
                                    🔍 Bắt đầu điều tra
                                </button>
                            )}
                            <button
                                className="vetting-btn vetting-btn-secondary"
                                onClick={() => setIsWarningModalOpen(true)}
                                style={{ fontSize: '13px', padding: '8px 16px' }}
                            >
                                ⚠️ Gửi cảnh báo
                            </button>
                            <button
                                className="vetting-btn vetting-btn-secondary"
                                onClick={() => setIsSuspendModalOpen(true)}
                                style={{ fontSize: '13px', padding: '8px 16px' }}
                            >
                                🚫 Đình chỉ hồ sơ
                            </button>
                            <button
                                className="vetting-btn vetting-btn-danger"
                                onClick={() => setIsLockModalOpen(true)}
                                style={{ fontSize: '13px', padding: '8px 16px' }}
                            >
                                🔒 Khóa tài khoản
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="dispute-detail-content">
                    <div className="dispute-detail-container">
                        <div className="dispute-grid">
                            {/* LEFT COLUMN: Parties + Lesson Info */}
                            <div className="dispute-col-left">
                                {/* Plaintiff Card (Created By) */}
                                <div className="dispute-party-card">
                                    <div className="dispute-border-indicator dispute-indicator-blue"></div>
                                    <div className="dispute-party-header">
                                        <span className="dispute-role-badge dispute-role-plaintiff">Nguyên đơn</span>
                                        <span className="material-symbols-outlined dispute-party-icon dispute-icon-blue">person</span>
                                    </div>
                                    <div className="dispute-party-info">
                                        <div
                                            className="dispute-party-avatar"
                                            style={{ backgroundImage: createdBy?.avatarUrl ? `url('${createdBy.avatarUrl}')` : undefined, backgroundColor: '#e2e8f0' }}
                                        ></div>
                                        <div>
                                            <h3 className="dispute-party-name">{createdBy?.fullName || 'N/A'}</h3>
                                            <p className="dispute-party-id">{createdBy?.email || ''}</p>
                                        </div>
                                    </div>
                                    {createdBy?.phone && (
                                        <div className="dispute-party-stats" style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                                            SĐT: {createdBy.phone}
                                        </div>
                                    )}
                                </div>

                                {/* Arrow Connector */}
                                <div className="dispute-connector">
                                    <span className="material-symbols-outlined dispute-connector-icon">arrow_downward</span>
                                </div>

                                {/* Defendant Card (Tutor) */}
                                <div className="dispute-party-card">
                                    <div className="dispute-border-indicator dispute-indicator-orange"></div>
                                    <div className="dispute-party-header">
                                        <span className="dispute-role-badge dispute-role-defendant">Bị đơn (Gia sư)</span>
                                        <span className="material-symbols-outlined dispute-party-icon dispute-icon-orange">school</span>
                                    </div>
                                    <div className="dispute-party-info">
                                        <div
                                            className="dispute-party-avatar"
                                            style={{ backgroundColor: '#e2e8f0' }}
                                        ></div>
                                        <div>
                                            <h3 className="dispute-party-name">{tutor?.fullName || 'N/A'}</h3>
                                            <p className="dispute-party-id">{tutor?.email || ''}</p>
                                        </div>
                                    </div>
                                    <div className="dispute-party-details">
                                        <div className="dispute-stat-row">
                                            <span style={{ color: '#81786a' }}>Đánh giá</span>
                                            <span className="dispute-stat-green">⭐ {tutor?.averageRating?.toFixed(1) || 'N/A'}</span>
                                        </div>
                                        <div className="dispute-stat-row">
                                            <span style={{ color: '#81786a' }}>Cảnh báo</span>
                                            <span className="dispute-stat-bold" style={{ color: (tutor?.warningCount || 0) > 0 ? '#dc2626' : '#10b981' }}>
                                                {tutor?.warningCount || 0} lần
                                            </span>
                                        </div>
                                        {tutor?.phone && (
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>SĐT</span>
                                                <span className="dispute-stat-bold">{tutor.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Lesson Info Section */}
                                {lesson && (
                                    <div className="dispute-party-card" style={{ marginTop: '24px' }}>
                                        <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--color-navy)' }}>
                                            🎓 Thông tin buổi học
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Mã buổi học</span>
                                                <span className="dispute-stat-bold">{lesson.lessonId}</span>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Thời gian dự kiến</span>
                                                <span className="dispute-stat-bold" style={{ fontSize: '13px' }}>
                                                    {formatDateTime(lesson.scheduledStart)} - {formatDateTime(lesson.scheduledEnd)}
                                                </span>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Trạng thái</span>
                                                <span className="vetting-badge pending">{lesson.status || 'N/A'}</span>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Điểm danh gia sư</span>
                                                <span style={{ color: lesson.isTutorPresent ? '#166534' : '#dc2626', fontWeight: 600 }}>
                                                    {lesson.isTutorPresent === null ? 'Không xác định' : lesson.isTutorPresent ? '✓ Có mặt' : '✗ Vắng mặt'}
                                                </span>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Điểm danh học viên</span>
                                                <span style={{ color: lesson.isStudentPresent ? '#166534' : '#dc2626', fontWeight: 600 }}>
                                                    {lesson.isStudentPresent === null ? 'Không xác định' : lesson.isStudentPresent ? '✓ Có mặt' : '✗ Vắng mặt'}
                                                </span>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Học phí</span>
                                                <span className="dispute-stat-bold" style={{ color: 'var(--color-gold)' }}>
                                                    {formatCurrency(lesson.lessonPrice || 0)}
                                                </span>
                                            </div>
                                            {lesson.lessonContent && (
                                                <div className="dispute-stat-row">
                                                    <span style={{ color: '#81786a' }}>Nội dung</span>
                                                    <span className="dispute-stat-bold">{lesson.lessonContent}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Claim Summary */}
                                {disputeDetail.reason && (
                                    <div className="dispute-claim-summary">
                                        <h4 className="dispute-claim-label">Nội dung khiếu nại</h4>
                                        <p className="dispute-claim-text">"{disputeDetail.reason}"</p>
                                    </div>
                                )}

                                {/* Resolution info if resolved */}
                                {disputeDetail.status === 'resolved' && disputeDetail.resolutionNote && (
                                    <div className="dispute-party-card" style={{ marginTop: '24px', borderLeft: '4px solid #10b981' }}>
                                        <h4 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700, color: '#10b981' }}>
                                            ✅ Đã giải quyết
                                        </h4>
                                        <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#1e293b' }}>
                                            {disputeDetail.resolutionNote}
                                        </p>
                                        {disputeDetail.refundAmount !== null && disputeDetail.refundAmount !== undefined && (
                                            <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                                                Hoàn tiền: {formatCurrency(disputeDetail.refundAmount)}
                                                {disputeDetail.refundPercentage !== null && ` (${disputeDetail.refundPercentage}%)`}
                                            </p>
                                        )}
                                        {disputeDetail.resolvedBy && (
                                            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b' }}>
                                                Bởi: {disputeDetail.resolvedBy.fullName}
                                                {disputeDetail.resolvedAt && ` • ${formatRelativeTime(disputeDetail.resolvedAt)}`}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* CENTER COLUMN: Evidence & Chat */}
                            <div className="dispute-col-center">
                                {/* Tabs */}
                                <div className="dispute-evidence-tabs">
                                    <button
                                        className={`dispute-evidence-tab ${activeTab === 'evidence' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('evidence')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">folder</span>
                                        Bằng chứng ({evidenceUrls.length})
                                    </button>
                                    <button
                                        className={`dispute-evidence-tab ${activeTab === 'chat' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('chat')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">chat</span>
                                        Nhật ký chat
                                    </button>
                                </div>

                                {/* Evidence Gallery */}
                                {activeTab === 'evidence' && (
                                    <div className="dispute-chat-area">
                                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 20px' }}>
                                            📂 Tài liệu bằng chứng
                                        </h3>

                                        {evidenceUrls.length > 0 ? (
                                            <div>
                                                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginBottom: '12px' }}>
                                                    Tệp tin ({evidenceUrls.length})
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                                    {evidenceUrls.map((url, idx) => {
                                                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                                        return isImage ? (
                                                            <div key={idx} style={{ position: 'relative', paddingBottom: '75%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                                                                <img
                                                                    src={url}
                                                                    alt={`Evidence ${idx + 1}`}
                                                                    style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                                    onClick={() => window.open(url, '_blank')}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                key={idx}
                                                                style={{
                                                                    padding: '16px',
                                                                    background: '#f8fafc',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #e2e8f0',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '12px',
                                                                }}
                                                            >
                                                                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#64748b' }}>
                                                                    description
                                                                </span>
                                                                <div style={{ flex: 1 }}>
                                                                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-navy)', fontSize: '13px' }}>
                                                                        Tệp {idx + 1}
                                                                    </p>
                                                                </div>
                                                                <a
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        padding: '8px 16px',
                                                                        background: 'var(--color-gold)',
                                                                        color: 'var(--color-navy)',
                                                                        borderRadius: '6px',
                                                                        textDecoration: 'none',
                                                                        fontSize: '13px',
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    Xem
                                                                </a>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                                                    folder_off
                                                </span>
                                                <p>Không có bằng chứng nào được gửi</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Chat Log */}
                                {activeTab === 'chat' && (
                                    <div className="dispute-chat-area">
                                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 20px' }}>
                                            💬 Nhật ký chat
                                        </h3>
                                        {chatLoading ? (
                                            <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                Đang tải lịch sử chat...
                                            </p>
                                        ) : chatMessages.length === 0 ? (
                                            <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                Không có tin nhắn chat nào
                                            </p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                                                {chatMessages.map((msg, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            padding: '12px 16px',
                                                            background: '#f8fafc',
                                                            borderRadius: '8px',
                                                            border: '1px solid #e2e8f0',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--color-navy)', fontSize: '13px' }}>
                                                                {msg.senderName || msg.senderId || 'Unknown'}
                                                            </span>
                                                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                                {msg.sentAt ? formatDateTime(msg.sentAt) : ''}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>
                                                            {msg.content || msg.message || ''}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Verdict */}
                            <div className="dispute-col-right">
                                <div className="dispute-verdict-card">
                                    <div className="dispute-verdict-header">
                                        <h2 className="dispute-verdict-title">
                                            <span className="material-symbols-outlined">gavel</span>
                                            Phán quyết của Quản trị viên
                                        </h2>
                                        <p className="dispute-verdict-subtitle">Xem xét bằng chứng và đưa ra quyết định cuối cùng.</p>
                                    </div>

                                    {disputeDetail.status === 'resolved' ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#10b981' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                                                check_circle
                                            </span>
                                            <p style={{ fontWeight: 700, fontSize: '16px' }}>Khiếu nại đã được giải quyết</p>
                                        </div>
                                    ) : (
                                        <div className="dispute-verdict-form">
                                            <div className="dispute-options-group">
                                                {/* 3 Resolution Options matching backend */}
                                                <label className="dispute-radio-label">
                                                    <input
                                                        type="radio"
                                                        name="verdict"
                                                        className="dispute-radio-input"
                                                        checked={verdict === 'refund_100'}
                                                        onChange={() => setVerdict('refund_100')}
                                                    />
                                                    <div className="dispute-radio-content">
                                                        <span className="dispute-radio-title">Hoàn tiền 100% cho Học viên</span>
                                                        <span className="dispute-radio-desc">Hoàn lại {formatCurrency(lessonPrice)} về nguồn</span>
                                                    </div>
                                                </label>

                                                <label className="dispute-radio-label">
                                                    <input
                                                        type="radio"
                                                        name="verdict"
                                                        className="dispute-radio-input"
                                                        checked={verdict === 'refund_50'}
                                                        onChange={() => setVerdict('refund_50')}
                                                    />
                                                    <div className="dispute-radio-content">
                                                        <span className="dispute-radio-title">Hoàn tiền 50% cho Học viên</span>
                                                        <span className="dispute-radio-desc">Hoàn {formatCurrency(lessonPrice / 2)}</span>
                                                    </div>
                                                </label>

                                                <label className="dispute-radio-label">
                                                    <input
                                                        type="radio"
                                                        name="verdict"
                                                        className="dispute-radio-input"
                                                        checked={verdict === 'release'}
                                                        onChange={() => setVerdict('release')}
                                                    />
                                                    <div className="dispute-radio-content">
                                                        <span className="dispute-radio-title">Chuyển tiền cho Gia sư</span>
                                                        <span className="dispute-radio-desc">Chuyển {formatCurrency(lessonPrice)} cho {tutor?.fullName || 'Gia sư'}</span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="dispute-reasoning-group">
                                                <span className="dispute-label">Ghi chú của Admin (tối thiểu 10 ký tự)</span>
                                                <textarea
                                                    className="dispute-textarea"
                                                    placeholder="Vui lòng trích dẫn bằng chứng cụ thể và giải thích quyết định..."
                                                    value={adminNotes}
                                                    onChange={(e) => setAdminNotes(e.target.value)}
                                                    rows={5}
                                                ></textarea>
                                            </div>

                                            <button
                                                className="dispute-submit-btn"
                                                onClick={handleResolveDispute}
                                                disabled={isSubmitting || adminNotes.trim().length < 10}
                                                style={{ opacity: adminNotes.trim().length < 10 ? 0.5 : 1 }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontWeight: 'bold' }}>check_circle</span>
                                                {isSubmitting ? 'Đang xử lý...' : 'Thực thi quyết định'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Admin Action Modals */}
            <IssueWarningModal
                isOpen={isWarningModalOpen}
                onClose={() => setIsWarningModalOpen(false)}
                tutorId={tutor?.tutorId || ''}
                tutorName={tutor?.fullName || ''}
                disputeId={String(disputeDetail.disputeId)}
                onIssueWarning={handleIssueWarning}
            />

            <SuspendTutorModal
                isOpen={isSuspendModalOpen}
                onClose={() => setIsSuspendModalOpen(false)}
                tutorId={tutor?.tutorId || ''}
                tutorName={tutor?.fullName || ''}
                onSuspend={handleSuspendTutor}
            />

            <LockAccountConfirmDialog
                isOpen={isLockModalOpen}
                onClose={() => setIsLockModalOpen(false)}
                userId={tutor?.tutorId || ''}
                userName={tutor?.fullName || ''}
                onLockAccount={handleLockAccount}
            />
        </>
    );
};

export default AdminDisputeDetailPageExpanded;
