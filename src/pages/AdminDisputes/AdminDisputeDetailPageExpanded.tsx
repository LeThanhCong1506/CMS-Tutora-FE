import { useState, useEffect, useCallback } from 'react';
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
    getDisputeRecording,
    issueWarning,
    suspendTutor,
    lockAccount,
    getDisputeThread,
    sendDisputeThreadMessage,
} from '../../services/admin.service';
import type { DisputeRecordingDto, DisputeMessageDto } from '../../services/admin.service';
import { signalRService } from '../../services/signalr.service';
import type { DisputeDetail, ResolutionType } from '../../types/admin.types';
import { PageContainer, SectionCard, StatusBadge } from '../../components/shared';
import type { StatusVariant } from '../../components/shared';
import { formatCurrency, formatDateTime, formatRelativeTime, formatDisputeType } from '../../utils/formatters';
import { Can } from '../../contexts/AccessContext';

import '../../styles/pages/admin-dashboard.css';
import '../../styles/pages/admin-dispute-detail.css';

type DisputeChatMessage = {
    senderName?: string | null;
    senderId?: string | number | null;
    sentAt?: string | null;
    content?: string | null;
    message?: string | null;
};

const getDisputeStatusVariant = (status?: string | null): StatusVariant => {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'investigating':
            return 'info';
        case 'resolved':
            return 'success';
        case 'closed':
            return 'neutral';
        default:
            return 'dark';
    }
};

const getDisputeStatusLabel = (status?: string | null) => {
    switch (status) {
        case 'pending':
            return 'Cần xử lý';
        case 'investigating':
            return 'Đang điều tra';
        case 'resolved':
            return 'Đã giải quyết';
        case 'closed':
            return 'Đã đóng';
        default:
            return status || 'N/A';
    }
};

const AdminDisputeDetailPageExpanded = () => {
    // Route là `disputes/:id` (App.tsx) → param tên `id`, KHÔNG phải `disputeId`.
    const { id: disputeId } = useParams<{ id: string }>();

    // State management
    const [disputeDetail, setDisputeDetail] = useState<DisputeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Tab states
    const [activeTab, setActiveTab] = useState('evidence');
    const [verdict, setVerdict] = useState<ResolutionType>('refund_100');
    const [adminNotes, setAdminNotes] = useState('');

    // Chat history
    const [chatMessages, setChatMessages] = useState<DisputeChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Recording state
    const [recording, setRecording] = useState<DisputeRecordingDto | null>(null);
    const [recordingLoading, setRecordingLoading] = useState(false);

    // Private dispute chat threads (admin<->tutor, admin<->parent/student)
    const [tutorThread, setTutorThread] = useState<DisputeMessageDto[]>([]);
    const [tutorThreadLoading, setTutorThreadLoading] = useState(false);
    const [tutorThreadInput, setTutorThreadInput] = useState('');
    const [tutorThreadSending, setTutorThreadSending] = useState(false);

    const [parentThread, setParentThread] = useState<DisputeMessageDto[]>([]);
    const [parentThreadLoading, setParentThreadLoading] = useState(false);
    const [parentThreadInput, setParentThreadInput] = useState('');
    const [parentThreadSending, setParentThreadSending] = useState(false);

    // Warning state for resolve
    const [createWarning, setCreateWarning] = useState(false);
    const [warningLevel, setWarningLevel] = useState<1 | 2>(1);

    // Modal states
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);

    // Submitting state
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchDisputeDetail = useCallback(async (id: string) => {
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
    }, []);

    // Fetch dispute detail
    useEffect(() => {
        if (disputeId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void fetchDisputeDetail(disputeId);
        }
    }, [disputeId, fetchDisputeDetail]);

    // Fetch chat history when switching to chat tab
    const fetchChatHistory = useCallback(async () => {
        if (!disputeId) return;
        try {
            setChatLoading(true);
            const data = await getDisputeChatHistory(disputeId);
            setChatMessages(data as DisputeChatMessage[]);
        } catch (err) {
            console.error('Error fetching chat history:', err);
            setChatMessages([]);
        } finally {
            setChatLoading(false);
        }
    }, [disputeId]);

    useEffect(() => {
        if (activeTab === 'chat' && chatMessages.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void fetchChatHistory();
        }
    }, [activeTab, chatMessages.length, fetchChatHistory]);

    // Fetch recording when switching to recording tab
    const fetchRecording = useCallback(async () => {
        if (!disputeId) return;
        try {
            setRecordingLoading(true);
            const data = await getDisputeRecording(disputeId);
            setRecording(data);
        } catch (err) {
            console.error('Error fetching recording:', err);
            setRecording(null);
        } finally {
            setRecordingLoading(false);
        }
    }, [disputeId]);

    useEffect(() => {
        if (activeTab === 'recording' && !recording) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void fetchRecording();
        }
    }, [activeTab, recording, fetchRecording]);

    // Private threads: fetch when switching to either chat tab
    const fetchTutorThread = useCallback(async () => {
        if (!disputeId) return;
        try {
            setTutorThreadLoading(true);
            setTutorThread(await getDisputeThread(disputeId, 'tutor'));
        } catch (err) {
            console.error('Error fetching tutor thread:', err);
        } finally {
            setTutorThreadLoading(false);
        }
    }, [disputeId]);

    const fetchParentThread = useCallback(async () => {
        if (!disputeId) return;
        try {
            setParentThreadLoading(true);
            setParentThread(await getDisputeThread(disputeId, 'parent'));
        } catch (err) {
            console.error('Error fetching parent thread:', err);
        } finally {
            setParentThreadLoading(false);
        }
    }, [disputeId]);

    useEffect(() => {
        if (activeTab === 'chat-tutor') void fetchTutorThread();
        if (activeTab === 'chat-parent') void fetchParentThread();
    }, [activeTab, fetchTutorThread, fetchParentThread]);

    // Real-time: chèn tin nhắn mới trực tiếp vào đúng thread thay vì phải refetch.
    useEffect(() => {
        if (!disputeDetail) return;
        const unsubscribe = signalRService.subscribeToDisputeMessages((message: DisputeMessageDto) => {
            if (message.disputeId !== disputeDetail.disputeId) return;
            const setter = message.threadType === 'tutor' ? setTutorThread : setParentThread;
            setter((prev) => (prev.some((m) => m.disputeMessageId === message.disputeMessageId) ? prev : [...prev, message]));
            toast.info(`${message.senderName || (message.threadType === 'tutor' ? 'Gia sư' : 'Phụ huynh/Học sinh')}: ${message.message}`);
        });
        return unsubscribe;
    }, [disputeDetail]);

    const handleSendTutorThreadMessage = async () => {
        if (!disputeId || tutorThreadInput.trim().length === 0) return;
        try {
            setTutorThreadSending(true);
            await sendDisputeThreadMessage(disputeId, 'tutor', tutorThreadInput.trim());
            setTutorThreadInput('');
            await fetchTutorThread();
        } catch (err) {
            console.error('Error sending tutor thread message:', err);
            toast.error('Không thể gửi tin nhắn');
        } finally {
            setTutorThreadSending(false);
        }
    };

    const handleSendParentThreadMessage = async () => {
        if (!disputeId || parentThreadInput.trim().length === 0) return;
        try {
            setParentThreadSending(true);
            await sendDisputeThreadMessage(disputeId, 'parent', parentThreadInput.trim());
            setParentThreadInput('');
            await fetchParentThread();
        } catch (err) {
            console.error('Error sending parent thread message:', err);
            toast.error('Không thể gửi tin nhắn');
        } finally {
            setParentThreadSending(false);
        }
    };

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
                createTutorWarning: createWarning,
                warningLevel: createWarning ? warningLevel : undefined,
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

        const deadline = disputeDetail.tutorResponseDeadline ? new Date(disputeDetail.tutorResponseDeadline) : null;
        const beforeDeadline = deadline ? Date.now() < deadline.getTime() : false;
        if (beforeDeadline) {
            const confirmed = window.confirm(
                `Gia sư còn thời gian đến ${deadline!.toLocaleString('vi-VN')} để phản hồi trước khi bị điều tra. Bạn có chắc muốn bắt đầu điều tra sớm không?`,
            );
            if (!confirmed) return;
        }

        try {
            setIsSubmitting(true);
            await investigateDispute(disputeDetail.disputeId, beforeDeadline);
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
            <PageContainer
                eyebrow="Vận hành"
                title="Chi tiết khiếu nại"
                subtitle="Đang tải hồ sơ tranh chấp."
                maxWidth="wide"
            >
                <SectionCard padded>
                    <div className="admin-ui-muted-state">Đang tải chi tiết khiếu nại...</div>
                </SectionCard>
            </PageContainer>
        );
    }

    if (error || !disputeDetail) {
        return (
            <PageContainer
                eyebrow="Vận hành"
                title="Không tìm thấy khiếu nại"
                subtitle={error || 'Không có dữ liệu hồ sơ để hiển thị.'}
                maxWidth="wide"
            >
                <SectionCard padded>
                    <div className="admin-ui-muted-state">{error || 'Không tìm thấy khiếu nại'}</div>
                </SectionCard>
            </PageContainer>
        );
    }

    // Evidence from backend (string array of URLs)
    const evidenceUrls = disputeDetail.evidence || [];
    const classSession = disputeDetail.classSession;
    const tutor = disputeDetail.tutor;
    const createdBy = disputeDetail.createdBy;
    const classSessionPrice = classSession?.classSessionPrice || 0;

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
                                    <StatusBadge variant={getDisputeStatusVariant(disputeDetail.status)} shape="tag">
                                        {getDisputeStatusLabel(disputeDetail.status)}
                                    </StatusBadge>
                                </div>
                            </div>
                            <div className="dispute-detail-actions">
                                <div className="dispute-live-status">
                                    <div className="dispute-pulse-dot"></div>
                                    Đang xem xét trực tiếp
                                </div>
                                <div className="dispute-escrow-badge">
                                    Số tiền: {formatCurrency(classSessionPrice)}
                                </div>
                            </div>
                        </div>

                        {/* Admin Action Buttons — chỉ hành động cấp-dispute ở đây. 3 nút xử lý gia sư
                            (cảnh báo/đình chỉ/khóa) đã chuyển xuống card "Bị đơn (Gia sư)" bên dưới
                            để rõ đối tượng tác động, tránh nhầm là áp dụng cho nguyên đơn. */}
                        <div className="admin-ui-actions dispute-admin-actions">
                            {disputeDetail.status === 'pending' && (
                                <Can permission="dispute.investigate">
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    <button
                                        type="button"
                                        className="admin-ui-button admin-ui-button-secondary"
                                        onClick={handleInvestigate}
                                        disabled={isSubmitting}
                                    >
                                        <span className="material-symbols-outlined">search</span>
                                        Bắt đầu điều tra
                                    </button>
                                    {disputeDetail.tutorResponseDeadline && new Date(disputeDetail.tutorResponseDeadline).getTime() > Date.now() && (
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            Gia sư còn hạn phản hồi đến {new Date(disputeDetail.tutorResponseDeadline).toLocaleString('vi-VN')}
                                        </span>
                                    )}
                                </div>
                                </Can>
                            )}
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

                                    {/* Hành động với gia sư — đặt ngay trong card này để rõ đối tượng
                                        tác động là gia sư, không phải nguyên đơn (parent/student). */}
                                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                                        <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                            Hành động với gia sư
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            <Can permission="warning.create">
                                            <button
                                                type="button"
                                                className="admin-ui-button admin-ui-button-secondary"
                                                onClick={() => setIsWarningModalOpen(true)}
                                            >
                                                <span className="material-symbols-outlined">warning</span>
                                                Cảnh báo gia sư
                                            </button>
                                            </Can>
                                            <Can permission="suspension.manage">
                                            <button
                                                type="button"
                                                className="admin-ui-button admin-ui-button-secondary"
                                                onClick={() => setIsSuspendModalOpen(true)}
                                            >
                                                <span className="material-symbols-outlined">block</span>
                                                Đình chỉ gia sư
                                            </button>
                                            </Can>
                                            <Can permission="user.deactivate">
                                            <button
                                                type="button"
                                                className="admin-ui-button admin-ui-button-danger"
                                                onClick={() => setIsLockModalOpen(true)}
                                            >
                                                <span className="material-symbols-outlined">lock</span>
                                                Khóa TK gia sư
                                            </button>
                                            </Can>
                                        </div>
                                    </div>
                                </div>

                                {/* Class Session Info Section */}
                                {classSession && (
                                    <div className="dispute-party-card" style={{ marginTop: '24px' }}>
                                        <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--color-navy)' }}>
                                            🎓 Thông tin buổi học
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Mã buổi học</span>
                                                <span className="dispute-stat-bold">{classSession.classSessionId}</span>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Thời gian dự kiến</span>
                                                <span className="dispute-stat-bold" style={{ fontSize: '13px' }}>
                                                    {formatDateTime(classSession.scheduledStart)} - {formatDateTime(classSession.scheduledEnd)}
                                                </span>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Trạng thái</span>
                                                <StatusBadge variant="info" shape="tag">{classSession.status || 'N/A'}</StatusBadge>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Điểm danh gia sư</span>
                                                <span style={{ color: classSession.isTutorPresent ? '#166534' : '#dc2626', fontWeight: 600 }}>
                                                    {classSession.isTutorPresent === null ? 'Không xác định' : classSession.isTutorPresent ? '✓ Có mặt' : '✗ Vắng mặt'}
                                                </span>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Điểm danh học viên</span>
                                                <span style={{ color: classSession.isStudentPresent ? '#166534' : '#dc2626', fontWeight: 600 }}>
                                                    {classSession.isStudentPresent === null ? 'Không xác định' : classSession.isStudentPresent ? '✓ Có mặt' : '✗ Vắng mặt'}
                                                </span>
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Học phí</span>
                                                <span className="dispute-stat-bold" style={{ color: 'var(--color-gold)' }}>
                                                    {formatCurrency(classSession.classSessionPrice || 0)}
                                                </span>
                                            </div>
                                            {classSession.classSessionContent && (
                                                <div className="dispute-stat-row">
                                                    <span style={{ color: '#81786a' }}>Nội dung</span>
                                                    <span className="dispute-stat-bold">{classSession.classSessionContent}</span>
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
                                    <button
                                        className={`dispute-evidence-tab ${activeTab === 'recording' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('recording')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">videocam</span>
                                        Ghi hình buổi học
                                    </button>
                                    <button
                                        className={`dispute-evidence-tab ${activeTab === 'chat-tutor' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('chat-tutor')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">support_agent</span>
                                        Chat với gia sư
                                    </button>
                                    <button
                                        className={`dispute-evidence-tab ${activeTab === 'chat-parent' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('chat-parent')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">support_agent</span>
                                        Chat với phụ huynh/HS
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

                                        {/* Tutor rebuttal */}
                                        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginBottom: '12px' }}>
                                                Phản hồi từ gia sư
                                            </h4>
                                            {disputeDetail.tutorResponse ? (
                                                <div style={{ padding: '14px 16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                                    <p style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--color-navy)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                                        {disputeDetail.tutorResponse}
                                                    </p>
                                                    {disputeDetail.tutorRespondedAt && (
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                                            Gửi lúc {formatRelativeTime(disputeDetail.tutorRespondedAt)}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Gia sư chưa phản hồi khiếu nại này.</p>
                                            )}

                                            {disputeDetail.additionalEvidence && disputeDetail.additionalEvidence.length > 0 && (
                                                <div style={{ marginTop: '16px' }}>
                                                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', marginBottom: '12px' }}>
                                                        Bằng chứng bổ sung ({disputeDetail.additionalEvidence.length})
                                                    </h4>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                                        {disputeDetail.additionalEvidence.map((item) => {
                                                            const url = item.fileUrl || '';
                                                            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                                            return isImage ? (
                                                                <div key={item.disputeEvidenceId} style={{ position: 'relative', paddingBottom: '75%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #bfdbfe' }}>
                                                                    <img
                                                                        src={url}
                                                                        alt={`Tutor evidence ${item.disputeEvidenceId}`}
                                                                        style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                                                                        onClick={() => window.open(url, '_blank')}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    key={item.disputeEvidenceId}
                                                                    style={{
                                                                        padding: '16px',
                                                                        background: '#eff6ff',
                                                                        borderRadius: '8px',
                                                                        border: '1px solid #bfdbfe',
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
                                                                            Tệp bằng chứng
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
                                            )}
                                        </div>
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

                                {/* Recording Tab */}
                                {activeTab === 'recording' && (
                                    <div className="dispute-chat-area">
                                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 20px' }}>
                                            🎥 Ghi hình buổi học
                                        </h3>
                                        {recordingLoading ? (
                                            <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                Đang tải thông tin ghi hình...
                                            </p>
                                        ) : !recording ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                                                    videocam_off
                                                </span>
                                                <p>Không có thông tin ghi hình</p>
                                            </div>
                                        ) : recording.status === 'available' && recording.recordingUrl ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                <div style={{
                                                    padding: '16px 20px',
                                                    background: '#f0fdf4',
                                                    borderRadius: '10px',
                                                    border: '1px solid #bbf7d0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                }}>
                                                    <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: '24px' }}>check_circle</span>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ margin: 0, fontWeight: 600, color: '#166534', fontSize: '14px' }}>Video buổi học đã sẵn sàng</p>
                                                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#15803d' }}>Buổi học #{recording.classSessionId}</p>
                                                    </div>
                                                    <a
                                                        href={recording.recordingUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            padding: '10px 20px',
                                                            background: '#16a34a',
                                                            color: '#fff',
                                                            borderRadius: '8px',
                                                            textDecoration: 'none',
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>play_arrow</span>
                                                        Xem video
                                                    </a>
                                                </div>
                                            </div>
                                        ) : recording.status === 'processing' || recording.status === 'recording' ? (
                                            <div style={{
                                                textAlign: 'center', padding: '40px',
                                                background: '#fffbeb', borderRadius: '10px', border: '1px solid #fed7aa',
                                            }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#f59e0b', marginBottom: '12px', display: 'block' }}>
                                                    hourglass_top
                                                </span>
                                                <p style={{ color: '#92400e', fontWeight: 600 }}>
                                                    {recording.status === 'recording' ? 'Đang ghi hình...' : 'Video đang được xử lý'}
                                                </p>
                                                <p style={{ color: '#b45309', fontSize: '13px' }}>Vui lòng kiểm tra lại sau.</p>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                                                    videocam_off
                                                </span>
                                                <p>Không có ghi hình cho buổi học này</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Private chat with tutor */}
                                {activeTab === 'chat-tutor' && (
                                    <div className="dispute-chat-area">
                                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 8px' }}>
                                            🛡️ Chat riêng với gia sư
                                        </h3>
                                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px' }}>
                                            Chỉ admin và gia sư thấy được cuộc trò chuyện này.
                                        </p>
                                        {tutorThreadLoading ? (
                                            <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải...</p>
                                        ) : tutorThread.length === 0 ? (
                                            <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có tin nhắn nào</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                                {tutorThread.map((msg) => (
                                                    <div
                                                        key={msg.disputeMessageId}
                                                        style={{
                                                            alignSelf: msg.senderRole === 'admin' ? 'flex-end' : 'flex-start',
                                                            maxWidth: '75%',
                                                            padding: '10px 14px',
                                                            borderRadius: '10px',
                                                            background: msg.senderRole === 'admin' ? 'var(--color-navy)' : '#f1f5f9',
                                                            color: msg.senderRole === 'admin' ? '#fff' : 'var(--color-navy)',
                                                        }}
                                                    >
                                                        <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, opacity: 0.8 }}>
                                                            {msg.senderName || (msg.senderRole === 'admin' ? 'Admin' : 'Gia sư')}
                                                        </p>
                                                        <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <textarea
                                                value={tutorThreadInput}
                                                onChange={(e) => setTutorThreadInput(e.target.value)}
                                                placeholder="Nhắn cho gia sư..."
                                                rows={2}
                                                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: '14px' }}
                                            />
                                            <button
                                                type="button"
                                                className="admin-ui-button admin-ui-button-secondary"
                                                disabled={tutorThreadSending || tutorThreadInput.trim().length === 0}
                                                onClick={() => void handleSendTutorThreadMessage()}
                                            >
                                                Gửi
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Private chat with parent/student */}
                                {activeTab === 'chat-parent' && (
                                    <div className="dispute-chat-area">
                                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 8px' }}>
                                            🛡️ Chat riêng với phụ huynh/học sinh
                                        </h3>
                                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px' }}>
                                            Chỉ admin và phụ huynh/học sinh thấy được cuộc trò chuyện này.
                                        </p>
                                        {parentThreadLoading ? (
                                            <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải...</p>
                                        ) : parentThread.length === 0 ? (
                                            <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có tin nhắn nào</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                                {parentThread.map((msg) => (
                                                    <div
                                                        key={msg.disputeMessageId}
                                                        style={{
                                                            alignSelf: msg.senderRole === 'admin' ? 'flex-end' : 'flex-start',
                                                            maxWidth: '75%',
                                                            padding: '10px 14px',
                                                            borderRadius: '10px',
                                                            background: msg.senderRole === 'admin' ? 'var(--color-navy)' : '#f1f5f9',
                                                            color: msg.senderRole === 'admin' ? '#fff' : 'var(--color-navy)',
                                                        }}
                                                    >
                                                        <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 600, opacity: 0.8 }}>
                                                            {msg.senderName || (msg.senderRole === 'admin' ? 'Admin' : 'Phụ huynh/Học sinh')}
                                                        </p>
                                                        <p style={{ margin: 0, fontSize: '14px', whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <textarea
                                                value={parentThreadInput}
                                                onChange={(e) => setParentThreadInput(e.target.value)}
                                                placeholder="Nhắn cho phụ huynh/học sinh..."
                                                rows={2}
                                                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: '14px' }}
                                            />
                                            <button
                                                type="button"
                                                className="admin-ui-button admin-ui-button-secondary"
                                                disabled={parentThreadSending || parentThreadInput.trim().length === 0}
                                                onClick={() => void handleSendParentThreadMessage()}
                                            >
                                                Gửi
                                            </button>
                                        </div>
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
                                                        <span className="dispute-radio-desc">Hoàn lại {formatCurrency(classSessionPrice)} về nguồn</span>
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
                                                        <span className="dispute-radio-desc">Hoàn {formatCurrency(classSessionPrice / 2)}</span>
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
                                                        <span className="dispute-radio-desc">Chuyển {formatCurrency(classSessionPrice)} cho {tutor?.fullName || 'Gia sư'}</span>
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

                                            {/* Warning checkbox */}
                                            <div style={{ marginTop: '16px', padding: '14px 16px', background: '#fefce8', borderRadius: '10px', border: '1px solid #fef08a' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#854d0e' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={createWarning}
                                                        onChange={(e) => setCreateWarning(e.target.checked)}
                                                        style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }}
                                                    />
                                                    Gửi cảnh báo cho gia sư
                                                </label>
                                                {createWarning && (
                                                    <div style={{ marginTop: '12px', display: 'flex', gap: '12px', paddingLeft: '28px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#78716c' }}>
                                                            <input
                                                                type="radio"
                                                                name="warningLevel"
                                                                checked={warningLevel === 1}
                                                                onChange={() => setWarningLevel(1)}
                                                                style={{ accentColor: '#f59e0b' }}
                                                            />
                                                            Mức 1 (Nhẹ)
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#78716c' }}>
                                                            <input
                                                                type="radio"
                                                                name="warningLevel"
                                                                checked={warningLevel === 2}
                                                                onChange={() => setWarningLevel(2)}
                                                                style={{ accentColor: '#ef4444' }}
                                                            />
                                                            Mức 2 (Nghiêm trọng)
                                                        </label>
                                                    </div>
                                                )}
                                            </div>

                                            <Can permission="dispute.resolve">
                                            <button
                                                className="dispute-submit-btn"
                                                onClick={handleResolveDispute}
                                                disabled={isSubmitting || adminNotes.trim().length < 10}
                                                style={{ opacity: adminNotes.trim().length < 10 ? 0.5 : 1 }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontWeight: 'bold' }}>check_circle</span>
                                                {isSubmitting ? 'Đang xử lý...' : 'Thực thi quyết định'}
                                            </button>
                                            </Can>
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
