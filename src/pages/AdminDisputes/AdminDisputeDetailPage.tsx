import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import TutorWarningModal from '../AdminUserManagement/components/IssueWarningModal';
import TutorSuspensionModal from '../AdminUserManagement/components/SuspendUserModal';
import TutorAccessModal from '../AdminUserManagement/components/BlockUserModal';
import CloseDisputeModal from './components/CloseDisputeModal';
import type { FlatUserDetail } from '../AdminUserManagement/userTypes';
import {
    getDisputeDetail,
    resolveDispute,
    closeDispute,
    investigateDispute,
    confirmTutorNoShow,
    getDisputeChatHistory,
    getDisputeRecording,
    resolveRecordingStreamUrl,
    issueWarning,
    suspendTutor,
    deactivateUser,
    getDisputeThread,
    sendDisputeThreadMessage,
    getRefundPreview,
    type DisputeRecording,
} from '../../services/admin.service';
import type {
    DisputeDetail,
    DisputeEvidenceItemDto,
    ResolutionType,
    CloseDisputeOutcome,
    SessionLogSummary,
} from '../../types/admin.types';
import {
    PageContainer,
    SectionCard,
    SessionLogPanel,
    StatusBadge,
    TutorReliabilityCard,
} from '../../components/shared';
import type { DisputeMessageDto, RefundPreviewDto } from '../../services/admin.service';
import { signalRService } from '../../services/signalr.service';
import { formatCurrency, formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { Can } from '../../contexts/AccessContext';
import { useTabParam } from '../../hooks/useTabParam';
import {
    getDisputeStatusLabel,
    getDisputeStatusVariant,
    getPriorityMeta,
    getSuspensionTypeForDuration,
    getVerdictSuggestion,
    getWarningLevelFromSeverity,
    isBeforeTutorResponseDeadline,
    isImageEvidence,
    TUTOR_ACTION_PERMISSIONS,
    validateResolution,
} from './disputeWorkflow';

import '../../styles/pages/admin-dashboard.css';
import '../../styles/pages/admin-dispute-detail.css';
import { getLessonStatusDisplay } from '../AdminBookings/bookingDisplay';

type DisputeChatMessage = {
    senderName?: string | null;
    senderId?: string | number | null;
    sentAt?: string | null;
    /** BE `ChatMessageResponse.CreatedAt` — trường thật sự trả về cho "Chat buổi học" (sentAt không tồn tại ở BE). */
    createdAt?: string | null;
    content?: string | null;
    message?: string | null;
};

const EVIDENCE_TABS = ['evidence', 'sessionLog', 'recordings', 'communication', 'reliability'] as const;
/** Chỉ còn 2 kênh riêng: chat buổi học đã tách ra cột trái nên luôn hiển thị, không cần tab. */
const COMMUNICATION_TABS = ['tutor', 'parent'] as const;
type EvidenceTab = (typeof EVIDENCE_TABS)[number];
type CommunicationTab = (typeof COMMUNICATION_TABS)[number];

type EvidenceFileCardProps = {
    url: string;
    label: string;
    description?: string | null;
    tone: 'learner' | 'tutor';
};

const EvidenceFileCard = ({ url, label, description, tone }: EvidenceFileCardProps) => {
    if (isImageEvidence(url)) {
        return (
            <a
                className={`dispute-evidence-file dispute-evidence-file--${tone}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Mở ${label}`}
            >
                <img src={url} alt={description || label} />
                <span className="dispute-evidence-file__overlay">
                    <span className="material-symbols-outlined">open_in_new</span>
                    Mở ảnh
                </span>
            </a>
        );
    }

    return (
        <a
            className={`dispute-evidence-file dispute-evidence-file--document dispute-evidence-file--${tone}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
        >
            <span className="material-symbols-outlined">description</span>
            <span className="dispute-evidence-file__text">
                <strong>{description || label}</strong>
                <small>Mở trong thẻ mới</small>
            </span>
            <span className="material-symbols-outlined dispute-evidence-file__open">open_in_new</span>
        </a>
    );
};

/** Điểm danh: icon Material Symbols thay cho ký tự ✓/✗, giữ nguyên quy ước màu cũ. */
const AttendanceValue = ({ present }: { present: boolean | null | undefined }) => (
    <span className="dispute-stat-icon" style={{ color: present ? '#166534' : '#dc2626', fontWeight: 600 }}>
        {present !== null && present !== undefined && (
            <span className="material-symbols-outlined" aria-hidden="true">
                {present ? 'check_circle' : 'cancel'}
            </span>
        )}
        {present === null || present === undefined ? 'Không xác định' : present ? 'Có mặt' : 'Vắng mặt'}
    </span>
);

const AdminDisputeDetailPage = () => {
    const navigate = useNavigate();
    // Route là `disputes/:id` (App.tsx) → param tên `id`, KHÔNG phải `disputeId`.
    const { id: disputeId } = useParams<{ id: string }>();

    // State management
    const [disputeDetail, setDisputeDetail] = useState<DisputeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Tab states — cả hai nhóm tab nằm trên URL (`?tab=`, `?chat=`) để reload hoặc
    // gửi link cho admin khác vẫn mở đúng bằng chứng đang xem.
    const [activeTab, setActiveTab] = useTabParam<EvidenceTab>(EVIDENCE_TABS, 'evidence');
    const [communicationTab, setCommunicationTab] = useTabParam<CommunicationTab>(COMMUNICATION_TABS, 'tutor', {
        paramKey: 'chat',
    });
    const [verdict, setVerdict] = useState<ResolutionType>('refund_100');
    const [adminNotes, setAdminNotes] = useState('');
    const [customPercentage, setCustomPercentage] = useState(50);
    const [refundPreview, setRefundPreview] = useState<RefundPreviewDto | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    /**
     * Latest attendance summary from the session log panel. Only used to offer a starting point for
     * the verdict — it never changes the selection on its own, because the decision is the admin's.
     */
    const [sessionLogSummary, setSessionLogSummary] = useState<SessionLogSummary | null>(null);

    // Chat history
    const [chatMessages, setChatMessages] = useState<DisputeChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Recording (video buổi học)
    const [recording, setRecording] = useState<DisputeRecording | null>(null);
    const [recordingLoading, setRecordingLoading] = useState(false);
    const [recordingError, setRecordingError] = useState(false);

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
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

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
            setError('Không thể tải chi tiết phản ánh');
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

    // Preview parent refund / tutor payout amounts as admin adjusts the custom percentage
    useEffect(() => {
        if (verdict !== 'custom' || !disputeId) return;
        const timer = setTimeout(() => {
            setPreviewLoading(true);
            setRefundPreview(null);
            getRefundPreview(disputeId, customPercentage)
                .then((data) => setRefundPreview(data))
                .catch((err) => {
                    console.error('Error fetching refund preview:', err);
                    setRefundPreview(null);
                    toast.error('Không thể tính toán số tiền hoàn (kiểm tra lại backend đã cập nhật endpoint /refund-preview chưa)');
                })
                .finally(() => setPreviewLoading(false));
        }, 400);
        return () => clearTimeout(timer);
    }, [verdict, customPercentage, disputeId]);

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
        // Chat buổi học nằm ở cột trái của tab "Trao đổi" nên chỉ phụ thuộc activeTab.
        if (activeTab === 'communication' && chatMessages.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void fetchChatHistory();
        }
    }, [activeTab, chatMessages.length, fetchChatHistory]);

    // Fetch recording info when switching to the recordings tab — token ngắn hạn nên
    // luôn gọi lại (không cache) mỗi lần vào lại tab, giống cách "recordings" không
    // đọc lại được sau khi vào tab khác rồi quay lại.
    const fetchRecording = useCallback(async () => {
        if (!disputeId) return;
        try {
            setRecordingLoading(true);
            setRecordingError(false);
            const data = await getDisputeRecording(disputeId);
            setRecording(data);
        } catch (err) {
            console.error('Error fetching dispute recording:', err);
            setRecording(null);
            setRecordingError(true);
        } finally {
            setRecordingLoading(false);
        }
    }, [disputeId]);

    useEffect(() => {
        // KHÔNG gate theo recordingLoading: nó tự chuyển true→false khi fetch xong (kể cả
        // lỗi), nằm trong dependency sẽ khiến effect tự chạy lại liên tục nếu API cứ lỗi
        // (vòng lặp gọi vô hạn, không có backoff). Gate theo recordingError thay vào đó —
        // khớp với cách tab "chat" bên trên xử lý (không tự retry khi đã có lỗi/dữ liệu).
        if (activeTab === 'recordings' && !recording && !recordingError) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            void fetchRecording();
        }
    }, [activeTab, recording, recordingError, fetchRecording]);

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

    /* eslint-disable react-hooks/set-state-in-effect -- tab changes intentionally trigger lazy thread loading */
    useEffect(() => {
        if (activeTab !== 'communication') return;
        if (communicationTab === 'tutor') void fetchTutorThread();
        if (communicationTab === 'parent') void fetchParentThread();
    }, [activeTab, communicationTab, fetchTutorThread, fetchParentThread]);
    /* eslint-enable react-hooks/set-state-in-effect */

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

        const validation = validateResolution({ verdict, notes: adminNotes, customPercentage });
        if (!validation.ok) {
            toast.error(validation.message);
            return;
        }

        try {
            setIsSubmitting(true);
            await resolveDispute(disputeDetail.disputeId, {
                resolutionType: verdict,
                resolutionNote: adminNotes,
                createTutorWarning: createWarning,
                warningLevel: createWarning ? warningLevel : undefined,
                customRefundPercentage: verdict === 'custom' ? customPercentage : undefined,
            });
            toast.success('Đã hoàn tất xử lý hồ sơ.');
            // Refresh data
            await fetchDisputeDetail(disputeId);
        } catch (err) {
            console.error('Error resolving dispute:', err);
            toast.error('Không thể hoàn tất xử lý hồ sơ');
        } finally {
            setIsSubmitting(false);
        }
    };

    /** Đóng phản ánh do hai bên hoà giải — không phân xử, không hoàn tiền. Modal tự hiện toast/đóng. */
    const handleCloseDispute = async (outcome: CloseDisputeOutcome, note: string) => {
        if (!disputeDetail || !disputeId) return;
        await closeDispute(disputeDetail.disputeId, { classSessionOutcome: outcome, note });
        await fetchDisputeDetail(disputeId);
    };

    const handleInvestigate = async () => {
        if (!disputeDetail || !disputeId) return;

        const beforeDeadline = isBeforeTutorResponseDeadline(disputeDetail.tutorResponseDeadline, Date.now());
        if (beforeDeadline) {
            const confirmed = window.confirm(
                `Gia sư còn thời gian đến ${formatDateTime(disputeDetail.tutorResponseDeadline)} để phản hồi. Bạn có muốn chuyển hồ sơ sang bước xem xét sớm không?`,
            );
            if (!confirmed) return;
        }

        try {
            setIsSubmitting(true);
            await investigateDispute(disputeDetail.disputeId, beforeDeadline);
            toast.success('Đã chuyển hồ sơ sang bước xem xét');
            await fetchDisputeDetail(disputeId);
        } catch (err) {
            console.error('Error investigating dispute:', err);
            toast.error('Không thể bắt đầu xem xét hồ sơ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmNoShow = async () => {
        if (!disputeDetail || !disputeId) return;
        const confirmed = window.confirm(
            'Xác nhận gia sư thực sự vắng mặt? Sau bước này, phụ huynh/học sinh có thể tự chọn phương án hoàn tiền, học bù hoặc hủy khóa học.',
        );
        if (!confirmed) return;

        try {
            setIsSubmitting(true);
            await confirmTutorNoShow(disputeDetail.disputeId);
            toast.success('Đã xác nhận gia sư vắng mặt. Người học có thể chọn phương án xử lý.');
            await fetchDisputeDetail(disputeId);
        } catch (err) {
            console.error('Error confirming tutor no-show:', err);
            toast.error('Không thể xác nhận vắng mặt');
        } finally {
            setIsSubmitting(false);
        }
    };
    // Wrapper functions for modal callbacks
    const handleIssueWarning = async (tutorId: string, reason: string, severity: string, relatedBookingId?: string) => {
        if (!disputeId) return;

        await issueWarning({
            userid: tutorId,
            reason,
            warninglevel: getWarningLevelFromSeverity(severity),
            relatedbookingid: relatedBookingId,
        });
        await fetchDisputeDetail(disputeId);
    };

    const handleSuspendTutor = async (tutorId: string, reason: string, durationDays: number) => {
        if (!disputeId) return;

        await suspendTutor({
            userid: tutorId,
            reason,
            suspensiontype: getSuspensionTypeForDuration(durationDays),
            durationDays,
        });
        await fetchDisputeDetail(disputeId);
    };

    const handleDeactivateTutor = async (userId: string, reason: string) => {
        if (!disputeId) return;

        // The tutor-management page uses this same endpoint. It does not persist a reason yet,
        // but the shared modal still collects one consistently for the admin's confirmation flow.
        void reason;
        await deactivateUser(userId);
        await fetchDisputeDetail(disputeId);
    };

    if (loading) {
        return (
            <PageContainer
                eyebrow="Vận hành"
                title="Chi tiết phản ánh"
                subtitle="Đang tải thông tin hồ sơ."
                maxWidth="wide"
            >
                <SectionCard padded>
                    <div className="admin-ui-muted-state">Đang tải chi tiết phản ánh...</div>
                </SectionCard>
            </PageContainer>
        );
    }

    if (error || !disputeDetail) {
        return (
            <PageContainer
                eyebrow="Vận hành"
                title="Không tìm thấy phản ánh"
                subtitle={error || 'Không có dữ liệu hồ sơ để hiển thị.'}
                maxWidth="wide"
            >
                <SectionCard padded>
                    <div className="admin-ui-muted-state">{error || 'Không tìm thấy phản ánh'}</div>
                </SectionCard>
            </PageContainer>
        );
    }

    // Evidence from backend (string array of URLs) — thuộc về bên nào phụ thuộc ai TẠO dispute
    // này (gia sư giờ cũng tạo được), không còn mặc định luôn là "người học" như trước.
    const evidenceUrls = disputeDetail.evidence || [];
    const createdByTutor = Boolean(disputeDetail.createdBy?.userId) && disputeDetail.createdBy?.userId === disputeDetail.tutor?.tutorId;
    const learnerInitialEvidence = createdByTutor ? [] : evidenceUrls;
    const tutorInitialEvidence = createdByTutor ? evidenceUrls : [];
    const additionalEvidence: DisputeEvidenceItemDto[] = disputeDetail.additionalEvidence || [];
    const learnerAdditionalEvidence = additionalEvidence.filter((item) => item.source === 'learner');
    // `unknown` keeps compatibility while FE/BE deployments overlap. The updated API classifies
    // every persisted row from uploadedBy, including historical records.
    const tutorEvidence = additionalEvidence.filter((item) => item.source !== 'learner');
    const learnerEvidenceCount = learnerInitialEvidence.length + learnerAdditionalEvidence.length;
    const tutorEvidenceCount = tutorInitialEvidence.length + tutorEvidence.length;
    const totalEvidenceCount = learnerEvidenceCount + tutorEvidenceCount;
    const classSession = disputeDetail.classSession;
    const tutor = disputeDetail.tutor;
    const createdBy = disputeDetail.createdBy;
    const managementTutor: FlatUserDetail | null = tutor?.tutorId ? {
        userid: tutor.tutorId,
        fullname: tutor.fullName || 'Gia sư',
        email: tutor.email || '',
        phone: tutor.phone || '',
        avatarurl: tutor.avatarUrl || '',
        primaryrole: 'tutor',
        accountstatus: 'active',
        isidentityverified: false,
        createdat: disputeDetail.createdAt || '',
        lastloginat: '',
        warningcount: tutor.warningCount || 0,
        suspensioncount: 0,
    } : null;
    const suggestion = getVerdictSuggestion(sessionLogSummary);
    const priorityMeta = getPriorityMeta(disputeDetail.priority, disputeDetail.priorityDisplay);
    const hasHeaderActions = ['pending', 'investigating', 'confirmed_no_show']
        .includes(disputeDetail.status || '');

    return (
        <>
            <main className="dispute-detail-page">
                {/* Header */}
                <header className="dispute-detail-header">
                    <div className="dispute-detail-header-inner">
                        <div className="dispute-detail-top-row">
                            <div className="dispute-header-content">
                                <button
                                    type="button"
                                    className="dispute-back-button"
                                    onClick={() => navigate(-1)}
                                >
                                    <span className="material-symbols-outlined">arrow_back</span>
                                    Danh sách phản ánh
                                </button>
                                <h1 className="dispute-detail-title">
                                    Phản ánh #{disputeDetail.disputeId}
                                </h1>
                                <div className="dispute-detail-meta">
                                    <StatusBadge variant={getDisputeStatusVariant(disputeDetail.status)} shape="tag">
                                        {getDisputeStatusLabel(disputeDetail.status)}
                                    </StatusBadge>
                                    <span title={disputeDetail.priorityReason || undefined}>
                                        <StatusBadge variant={priorityMeta.variant} shape="tag">
                                            <span className="material-symbols-outlined" aria-hidden="true">{priorityMeta.icon}</span>
                                            {priorityMeta.label}
                                        </StatusBadge>
                                    </span>
                                    <span className="dispute-detail-created">
                                        {disputeDetail.timeSinceCreation
                                            || (disputeDetail.createdAt ? `Tạo ${formatRelativeTime(disputeDetail.createdAt)}` : 'Chưa có thời gian')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {hasHeaderActions && (
                        <div className="admin-ui-actions dispute-admin-actions">
                            {disputeDetail.status === 'pending' && (
                                <Can permission="dispute.investigate">
                                <div className="dispute-investigate-action">
                                    <button
                                        type="button"
                                        className="admin-ui-button admin-ui-button-primary"
                                        onClick={handleInvestigate}
                                        disabled={isSubmitting}
                                    >
                                        <span className="material-symbols-outlined">search</span>
                                        Bắt đầu xem xét
                                    </button>
                                    {disputeDetail.tutorResponseDeadline && (
                                        <span className="dispute-action-helper">
                                            Hạn phản hồi: {formatDateTime(disputeDetail.tutorResponseDeadline)}
                                        </span>
                                    )}
                                </div>
                                </Can>
                            )}
                            {disputeDetail.disputeType === 'no_show'
                                && classSession?.status === 'no_show'
                                && ['pending', 'investigating'].includes(disputeDetail.status || '') && (
                                <Can permission="dispute.resolve">
                                    <button
                                        type="button"
                                        className="admin-ui-button admin-ui-button-primary"
                                        onClick={handleConfirmNoShow}
                                        disabled={isSubmitting}
                                    >
                                        <span className="material-symbols-outlined">verified</span>
                                        Xác nhận gia sư vắng mặt
                                    </button>
                                </Can>
                            )}
                            {disputeDetail.status === 'confirmed_no_show' && (
                                <div style={{ maxWidth: '320px', padding: '10px 14px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', fontSize: '12px', fontWeight: 600 }}>
                                    Đã xác nhận no-show. Đang chờ phụ huynh/học sinh chọn phương án xử lý.
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </header>

                {/* Main Content */}
                <div className="dispute-detail-content">
                    <div className="dispute-detail-container">
                        <div className="dispute-grid">
                            {/* Context summary */}
                            <div className="dispute-col-left">
                                {/* Claim Summary */}
                                {disputeDetail.reason && (
                                    <div className="dispute-claim-summary">
                                        <span className="material-symbols-outlined" aria-hidden="true">format_quote</span>
                                        <div>
                                            <h2 className="dispute-claim-label">Nội dung phản ánh</h2>
                                            <p className="dispute-claim-text">{disputeDetail.reason}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Plaintiff Card (Created By) */}
                                <div className="dispute-party-card dispute-party-card--complainant">
                                    <div className="dispute-border-indicator dispute-indicator-blue"></div>
                                    <div className="dispute-party-header">
                                        <span className="dispute-role-badge dispute-role-plaintiff">Người gửi phản ánh</span>
                                        <span className="material-symbols-outlined dispute-party-icon dispute-icon-blue">person</span>
                                    </div>
                                    <div className="dispute-party-info">
                                        <div
                                            className="dispute-party-avatar"
                                            style={{ backgroundImage: createdBy?.avatarUrl ? `url('${createdBy.avatarUrl}')` : undefined, backgroundColor: '#e2e8f0' }}
                                        ></div>
                                        <div>
                                            <h3 className="dispute-party-name">{createdBy?.fullName || 'Chưa xác định'}</h3>
                                            <p className="dispute-party-id">Người gửi hồ sơ</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Defendant Card (Tutor) */}
                                <div className="dispute-party-card dispute-party-card--tutor">
                                    <div className="dispute-border-indicator dispute-indicator-orange"></div>
                                    <div className="dispute-party-header">
                                        <span className="dispute-role-badge dispute-role-defendant">Gia sư liên quan</span>
                                        <span className="material-symbols-outlined dispute-party-icon dispute-icon-orange">school</span>
                                    </div>
                                    <div className="dispute-party-info">
                                        <div
                                            className="dispute-party-avatar"
                                            style={{
                                                backgroundImage: tutor?.avatarUrl ? `url('${tutor.avatarUrl}')` : undefined,
                                                backgroundColor: '#e2e8f0',
                                            }}
                                        ></div>
                                        <div>
                                            <h3 className="dispute-party-name">{tutor?.fullName || 'Chưa xác định'}</h3>
                                            <p className="dispute-party-id">Gia sư của buổi học</p>
                                        </div>
                                    </div>
                                    <div className="dispute-party-details">
                                        <div className="dispute-stat-row">
                                            <span style={{ color: '#81786a' }}>Đánh giá</span>
                                            <span className="dispute-stat-green dispute-stat-icon">
                                                <span className="material-symbols-outlined" aria-hidden="true">star</span>
                                                {tutor?.averageRating?.toFixed(1) || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="dispute-stat-row">
                                            <span style={{ color: '#81786a' }}>Lần nhắc nhở</span>
                                            <span className="dispute-stat-bold" style={{ color: (tutor?.warningCount || 0) > 0 ? '#dc2626' : '#10b981' }}>
                                                {tutor?.warningCount || 0} lần
                                            </span>
                                        </div>
                                    </div>

                                    {/* Công cụ quản lý gia sư được đặt ngay trong card để làm rõ đối tượng áp dụng. */}
                                    <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                                        <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                            Hỗ trợ quản lý gia sư
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            <Can permission={TUTOR_ACTION_PERMISSIONS.reminder}>
                                            <button
                                                type="button"
                                                className="admin-ui-button admin-ui-button-secondary"
                                                onClick={() => setIsWarningModalOpen(true)}
                                            >
                                                <span className="material-symbols-outlined">warning</span>
                                                Gửi nhắc nhở
                                            </button>
                                            </Can>
                                            <Can permission={TUTOR_ACTION_PERMISSIONS.suspension}>
                                            <button
                                                type="button"
                                                className="admin-ui-button admin-ui-button-secondary"
                                                onClick={() => setIsSuspendModalOpen(true)}
                                            >
                                                <span className="material-symbols-outlined">block</span>
                                                Tạm ngưng hoạt động
                                            </button>
                                            </Can>
                                            <Can permission={TUTOR_ACTION_PERMISSIONS.accessRemoval}>
                                            <button
                                                type="button"
                                                className="admin-ui-button admin-ui-button-danger"
                                                onClick={() => setIsLockModalOpen(true)}
                                            >
                                                <span className="material-symbols-outlined">lock</span>
                                                Ngừng quyền truy cập
                                            </button>
                                            </Can>
                                        </div>
                                    </div>
                                </div>

                                {/* Class Session Info Section */}
                                {classSession && (
                                    <div className="dispute-party-card dispute-party-card--session">
                                        <div className="dispute-context-card-title">
                                            <span className="material-symbols-outlined">school</span>
                                            <h3>Buổi học #{classSession.classSessionId}</h3>
                                            <span className="admin-ui-amount">{formatCurrency(classSession.classSessionPrice || 0)}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Lịch học</span>
                                                <span className="dispute-stat-bold" style={{ fontSize: '13px' }}>
                                                    {formatDateTime(classSession.scheduledStart)} - {formatDateTime(classSession.scheduledEnd)}
                                                </span>
                                            </div>
                                            {classSession.scheduleChanges && classSession.scheduleChanges.length > 0 && (
                                                <div className="dispute-schedule-change-note">
                                                    <span className="material-symbols-outlined">history</span>
                                                    Có {classSession.scheduleChanges.length} lần điều chỉnh lịch đã được ghi nhận
                                                </div>
                                            )}                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Trạng thái</span>
                                                {(() => {
                                                    const sessionStatus = getLessonStatusDisplay(classSession.status);
                                                    return (
                                                        <StatusBadge variant={sessionStatus.variant} shape="tag">
                                                            {sessionStatus.label}
                                                        </StatusBadge>
                                                    );
                                                })()}
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Điểm danh gia sư</span>
                                                <AttendanceValue present={classSession.isTutorPresent} />
                                            </div>
                                            <div className="dispute-stat-row">
                                                <span style={{ color: '#81786a' }}>Điểm danh học viên</span>
                                                <AttendanceValue present={classSession.isStudentPresent} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* CENTER COLUMN: Evidence & Chat */}
                            <div className="dispute-col-center">
                                {/* Tabs */}
                                <div className="dispute-evidence-tabs">
                                    <button
                                        type="button"
                                        className={`dispute-evidence-tab ${activeTab === 'evidence' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('evidence')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">folder</span>
                                        Bằng chứng ({totalEvidenceCount})
                                    </button>
                                    <button
                                        type="button"
                                        className={`dispute-evidence-tab ${activeTab === 'sessionLog' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('sessionLog')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">satellite_alt</span>
                                        Dữ liệu buổi học
                                    </button>
                                    <button
                                        type="button"
                                        className={`dispute-evidence-tab ${activeTab === 'recordings' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('recordings')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">videocam</span>
                                        Ghi hình
                                    </button>
                                    <button
                                        type="button"
                                        className={`dispute-evidence-tab ${activeTab === 'communication' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('communication')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">forum</span>
                                        Trao đổi
                                    </button>
                                    <button
                                        type="button"
                                        className={`dispute-evidence-tab ${activeTab === 'reliability' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('reliability')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">query_stats</span>
                                        Lịch sử gia sư
                                    </button>
                                </div>

                                {/* The same evidence across this tutor's other lessons: one late arrival is an
                                    incident, a pattern of them is a different conversation. */}
                                {activeTab === 'reliability' && (
                                    <div className="dispute-chat-area">
                                        <TutorReliabilityCard tutorUserId={tutor?.tutorId} />
                                    </div>
                                )}

                                {/* Attendance evidence remains mounted so its refund suggestion is available
                                    without a refetch when an admin switches tabs. */}
                                <div
                                    className="dispute-chat-area"
                                    hidden={activeTab !== 'sessionLog'}
                                    style={activeTab === 'sessionLog' ? undefined : { display: 'none' }}
                                >
                                    <SessionLogPanel
                                        classSessionId={disputeDetail.classSessionId}
                                        onSummaryChange={setSessionLogSummary}
                                    />
                                </div>

                                {/* Evidence Gallery */}
                                {activeTab === 'evidence' && (
                                    <div className="dispute-chat-area">
                                        <div className="dispute-evidence-heading">
                                            <h3>Tài liệu bằng chứng</h3>
                                            <span className="dispute-evidence-total">{totalEvidenceCount} tệp</span>
                                        </div>

                                        <div className="dispute-evidence-groups">
                                            <section className="dispute-evidence-group dispute-evidence-group--learner">
                                                <header className="dispute-evidence-group__header">
                                                    <span className="dispute-evidence-group__icon">
                                                        <span className="material-symbols-outlined">family_restroom</span>
                                                    </span>
                                                    <h4>Phụ huynh / Học sinh</h4>
                                                    <span className="dispute-evidence-group__count">{learnerEvidenceCount}</span>
                                                </header>

                                                {disputeDetail.respondentResponse && (
                                                    <div className="dispute-evidence-response">
                                                        <span className="dispute-evidence-response__label">Phản hồi của phụ huynh/học sinh</span>
                                                        <p>{disputeDetail.respondentResponse}</p>
                                                        {disputeDetail.respondentRespondedAt && (
                                                            <small>Gửi {formatRelativeTime(disputeDetail.respondentRespondedAt)}</small>
                                                        )}
                                                    </div>
                                                )}

                                                {learnerEvidenceCount > 0 ? (
                                                    <div className="dispute-evidence-files">
                                                        {learnerInitialEvidence.map((url, index) => (
                                                            <EvidenceFileCard
                                                                key={`initial-${url}-${index}`}
                                                                url={url}
                                                                label={`Bằng chứng từ người học ${index + 1}`}
                                                                tone="learner"
                                                            />
                                                        ))}
                                                        {learnerAdditionalEvidence.map((item, index) => item.fileUrl && (
                                                            <EvidenceFileCard
                                                                key={item.disputeEvidenceId}
                                                                url={item.fileUrl}
                                                                label={`Bằng chứng bổ sung từ người học ${index + 1}`}
                                                                description={item.description}
                                                                tone="learner"
                                                            />
                                                        ))}
                                                    </div>
                                                ) : (
                                                    !disputeDetail.respondentResponse && (
                                                        <div className="dispute-evidence-empty">
                                                            <span className="material-symbols-outlined">folder_off</span>
                                                            <p>Phía người học chưa gửi bằng chứng.</p>
                                                        </div>
                                                    )
                                                )}
                                            </section>

                                            <section className="dispute-evidence-group dispute-evidence-group--tutor">
                                                <header className="dispute-evidence-group__header">
                                                    <span className="dispute-evidence-group__icon">
                                                        <span className="material-symbols-outlined">school</span>
                                                    </span>
                                                    <h4>Gia sư</h4>
                                                    <span className="dispute-evidence-group__count">{tutorEvidenceCount}</span>
                                                </header>

                                                {disputeDetail.tutorResponse && (
                                                    <div className="dispute-evidence-response">
                                                        <span className="dispute-evidence-response__label">Phản hồi của gia sư</span>
                                                        <p>{disputeDetail.tutorResponse}</p>
                                                        {disputeDetail.tutorRespondedAt && (
                                                            <small>Gửi {formatRelativeTime(disputeDetail.tutorRespondedAt)}</small>
                                                        )}
                                                    </div>
                                                )}

                                                {tutorEvidenceCount > 0 && (
                                                    <div className="dispute-evidence-files">
                                                        {tutorInitialEvidence.map((url, index) => (
                                                            <EvidenceFileCard
                                                                key={`initial-${url}-${index}`}
                                                                url={url}
                                                                label={`Bằng chứng từ gia sư ${index + 1}`}
                                                                tone="tutor"
                                                            />
                                                        ))}
                                                        {tutorEvidence.map((item, index) => item.fileUrl && (
                                                            <EvidenceFileCard
                                                                key={item.disputeEvidenceId}
                                                                url={item.fileUrl}
                                                                label={`Bằng chứng từ gia sư ${index + 1}`}
                                                                description={item.description}
                                                                tone="tutor"
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {!disputeDetail.tutorResponse && tutorEvidenceCount === 0 && (
                                                    <div className="dispute-evidence-empty">
                                                        <span className="material-symbols-outlined">folder_off</span>
                                                        <p>Gia sư chưa gửi phản hồi hoặc bằng chứng.</p>
                                                    </div>
                                                )}
                                            </section>
                                        </div>
                                    </div>
                                )}

                                {/* Trao đổi: chat buổi học nằm bên trái, chat riêng của admin bên phải.
                                    Admin luôn phải đối chiếu lời khai riêng với những gì đôi bên đã nói
                                    trong buổi học, nên hai luồng đặt cạnh nhau thay vì phải nhảy tab. */}
                                {activeTab === 'communication' && (
                                    <div className="dispute-communication-split">
                                        {/* Chat Log */}
                                        <section className="dispute-chat-area dispute-chat-panel">
                                            <h3 className="dispute-section-title" style={{ margin: '0 0 20px' }}>
                                                <span className="material-symbols-outlined" aria-hidden="true">forum</span>
                                                Chat buổi học
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
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
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
                                                                    {msg.sentAt || msg.createdAt ? formatDateTime((msg.sentAt || msg.createdAt)!) : ''}
                                                                </span>
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '14px', color: '#1e293b' }}>
                                                                {msg.content || msg.message || ''}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>

                                        {/* Private chats (admin<->tutor, admin<->parent/student) */}
                                        <section className="dispute-chat-area dispute-chat-panel">
                                            {/* Tiêu đề đứng trên thanh chọn kênh: nói rõ đang xem cuộc trò chuyện nào
                                                trước, rồi mới tới chỗ đổi sang bên còn lại. */}
                                            <h3 className="dispute-section-title" style={{ margin: '0 0 14px' }}>
                                                {communicationTab === 'tutor'
                                                    ? 'Chat riêng với gia sư'
                                                    : 'Chat riêng với phụ huynh/học sinh'}
                                            </h3>
                                            <div className="dispute-communication-tabs" role="tablist" aria-label="Kênh trao đổi riêng">
                                                <button
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={communicationTab === 'tutor'}
                                                    className={communicationTab === 'tutor' ? 'active' : ''}
                                                    onClick={() => setCommunicationTab('tutor')}
                                                >
                                                    Gia sư
                                                </button>
                                                <button
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={communicationTab === 'parent'}
                                                    className={communicationTab === 'parent' ? 'active' : ''}
                                                    onClick={() => setCommunicationTab('parent')}
                                                >
                                                    Người học
                                                </button>
                                            </div>

                                            {communicationTab === 'tutor' ? (
                                                <>
                                                    {tutorThreadLoading ? (
                                                        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải...</p>
                                                    ) : tutorThread.length === 0 ? (
                                                        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có tin nhắn nào</p>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: '16px' }}>
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
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                                        <textarea
                                                            value={tutorThreadInput}
                                                            onChange={(e) => setTutorThreadInput(e.target.value)}
                                                            placeholder="Nhắn cho gia sư..."
                                                            rows={2}
                                                            // Chặn Grammarly chèn nút overlay của nó vào giữa ô soạn tin.
                                                            data-gramm="false"
                                                            data-gramm_editor="false"
                                                            data-enable-grammarly="false"
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
                                                </>
                                            ) : (
                                                <>
                                                    {parentThreadLoading ? (
                                                        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải...</p>
                                                    ) : parentThread.length === 0 ? (
                                                        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Chưa có tin nhắn nào</p>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: '16px' }}>
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
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                                        <textarea
                                                            value={parentThreadInput}
                                                            onChange={(e) => setParentThreadInput(e.target.value)}
                                                            placeholder="Nhắn cho phụ huynh/học sinh..."
                                                            rows={2}
                                                            // Chặn Grammarly chèn nút overlay của nó vào giữa ô soạn tin.
                                                            data-gramm="false"
                                                            data-gramm_editor="false"
                                                            data-enable-grammarly="false"
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
                                                </>
                                            )}
                                        </section>
                                    </div>
                                )}

                                {/* Recording (video buổi học) */}
                                {activeTab === 'recordings' && (
                                    <div className="dispute-chat-area">
                                        <h3 className="dispute-section-title" style={{ margin: '0 0 20px' }}>
                                            <span className="material-symbols-outlined" aria-hidden="true">videocam</span>
                                            Ghi hình buổi học
                                        </h3>

                                        {recordingLoading ? (
                                            <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                Đang tải video...
                                            </p>
                                        ) : recordingError ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block', color: '#dc2626' }}>
                                                    error
                                                </span>
                                                <p>Không thể tải video. Đường truyền có thể đang gián đoạn.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => void fetchRecording()}
                                                    style={{
                                                        marginTop: '12px', padding: '8px 16px', background: 'var(--color-navy)',
                                                        color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px',
                                                        fontWeight: 600, cursor: 'pointer',
                                                    }}
                                                >
                                                    Thử lại
                                                </button>
                                            </div>
                                        ) : recording?.status === 'available' && recording.recordingUrl ? (
                                            <video
                                                src={resolveRecordingStreamUrl(recording.recordingUrl)}
                                                controls
                                                style={{ width: '100%', maxHeight: '480px', borderRadius: '12px', background: '#111827', display: 'block' }}
                                                // BE báo "available" theo dữ liệu ClassSession, nhưng file trên Drive có thể đã
                                                // hỏng/token hết hạn — không có onError thì video treo spinner mặc định mãi mãi.
                                                onError={() => setRecordingError(true)}
                                            />
                                        ) : recording?.status === 'recording' ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                                                    schedule
                                                </span>
                                                <p>Buổi học đang diễn ra — video sẽ có sau khi kết thúc.</p>
                                            </div>
                                        ) : recording?.status === 'failed' ? (
                                            // Đã ghi hình nhưng Agora không trả về file nào lúc đóng phòng: không có gì để
                                            // chờ thêm. Admin cần phân biệt với "chưa từng ghi hình" khi cân nhắc bằng chứng.
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block', color: '#dc2626' }}>
                                                    videocam_off
                                                </span>
                                                <p>Ghi hình không thành công — hệ thống đã bật ghi hình nhưng không tạo được file cho buổi này.</p>
                                            </div>
                                        ) : recording?.status === 'processing' ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                                                    schedule
                                                </span>
                                                <p>Video vừa ghi xong đang được xử lý, quay lại sau ít phút nhé.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => void fetchRecording()}
                                                    style={{
                                                        marginTop: '12px', padding: '8px 16px', background: 'var(--color-navy)',
                                                        color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px',
                                                        fontWeight: 600, cursor: 'pointer',
                                                    }}
                                                >
                                                    Kiểm tra lại
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                                                    videocam_off
                                                </span>
                                                <p>Buổi học này chưa được ghi hình.</p>
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
                                            <span className="material-symbols-outlined">fact_check</span>
                                            Phương án xử lý
                                        </h2>
                                    </div>

                                    {disputeDetail.status === 'resolved' ? (
                                        <div className="dispute-resolved-summary">
                                            <span className="material-symbols-outlined">
                                                check_circle
                                            </span>
                                            <h3>Đã hoàn tất</h3>
                                            <p>{disputeDetail.resolutionNote || 'Hồ sơ đã hoàn tất xử lý.'}</p>
                                            {disputeDetail.refundAmount !== null && disputeDetail.refundAmount !== undefined && (
                                                <div className="dispute-resolved-amount">
                                                    <span>Khoản hoàn</span>
                                                    <strong>
                                                        {formatCurrency(disputeDetail.refundAmount)}
                                                        {disputeDetail.refundPercentage !== null && ` · ${disputeDetail.refundPercentage}%`}
                                                    </strong>
                                                </div>
                                            )}
                                            {disputeDetail.resolvedBy && (
                                                <small>
                                                    {disputeDetail.resolvedBy.fullName}
                                                    {disputeDetail.resolvedAt && ` · ${formatRelativeTime(disputeDetail.resolvedAt)}`}
                                                </small>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="dispute-verdict-form">
                                            {suggestion && (
                                                <div className="dispute-suggestion">
                                                    <p className="dispute-suggestion__title">
                                                        Nhật ký buổi học gợi ý: {suggestion.label}
                                                    </p>
                                                    <p className="dispute-suggestion__detail">{suggestion.detail}</p>
                                                    <button
                                                        type="button"
                                                        className="dispute-suggestion__apply"
                                                        onClick={() => setVerdict(suggestion.resolution)}
                                                        disabled={verdict === suggestion.resolution}
                                                    >
                                                        {verdict === suggestion.resolution
                                                            ? 'Đã chọn mức gợi ý'
                                                            : 'Chọn mức gợi ý'}
                                                    </button>
                                                </div>
                                            )}

                                            <div className="dispute-options-group">
                                                <label className="dispute-radio-label">
                                                    <input
                                                        type="radio"
                                                        name="verdict"
                                                        className="dispute-radio-input"
                                                        checked={verdict === 'refund_100'}
                                                        onChange={() => setVerdict('refund_100')}
                                                    />
                                                    <div className="dispute-radio-content">
                                                        <span className="dispute-radio-title">Hoàn tiền cho Học viên</span>
                                                        <span className="dispute-radio-desc">Số tiền hoàn sẽ được tính dựa trên những buổi chưa học</span>
                                                    </div>
                                                </label>
                                            </div>

                                            {verdict === 'custom' && (
                                                <div style={{ marginTop: '4px', padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                                                        Phần trăm hoàn tiền cho học viên/phụ huynh (0-100%)
                                                    </label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={customPercentage}
                                                            onChange={(e) => {
                                                                const raw = Number(e.target.value);
                                                                const clamped = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(100, raw));
                                                                setCustomPercentage(clamped);
                                                            }}
                                                            style={{ width: '90px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                                                        />
                                                        <span style={{ fontSize: '14px', color: '#6b7280' }}>%</span>
                                                    </div>

                                                    {previewLoading && (
                                                        <p style={{ marginTop: '10px', fontSize: '13px', color: '#6b7280' }}>Đang tính toán số tiền hoàn...</p>
                                                    )}

                                                    {!previewLoading && refundPreview && (
                                                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                                <span style={{ color: '#374151' }}>Hoàn cho học viên/phụ huynh:</span>
                                                                <span style={{ fontWeight: 700, color: '#065f46' }}>{formatCurrency(refundPreview.parentRefundAmount)}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                                <span style={{ color: '#374151' }}>Chuyển cho gia sư:</span>
                                                                <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{formatCurrency(refundPreview.tutorPayoutAmount)}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                                <span style={{
                                                                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                                                                    background: refundPreview.isDepositPaid ? '#dcfce7' : '#f3f4f6',
                                                                    color: refundPreview.isDepositPaid ? '#166534' : '#6b7280',
                                                                }}>
                                                                    Đợt 1 (đặt cọc): {refundPreview.isDepositPaid ? 'Đã thu' : 'Chưa thu'}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                                                                    background: refundPreview.isRemainingPaid ? '#dcfce7' : '#f3f4f6',
                                                                    color: refundPreview.isRemainingPaid ? '#166534' : '#6b7280',
                                                                }}>
                                                                    Đợt 2 (còn lại): {refundPreview.isRemainingPaid ? 'Đã thu' : 'Chưa thu'}
                                                                </span>
                                                            </div>
                                                            {refundPreview.warnings.length > 0 && (
                                                                <div style={{ marginTop: '6px' }}>
                                                                    {refundPreview.warnings.map((w, i) => (
                                                                        <p key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309', fontSize: '12px', margin: '2px 0' }}>
                                                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span>
                                                                            {w}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="dispute-reasoning-group">
                                                <span className="dispute-label">Ghi chú của Admin (tối thiểu 10 ký tự)</span>
                                                <textarea
                                                    className="dispute-textarea"
                                                    placeholder="Ghi lại thông tin đã đối chiếu và lý do chọn phương án..."
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
                                                    Gửi nhắc nhở cho gia sư
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
                                                            Mức 1 (Nhắc nhở)
                                                        </label>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#78716c' }}>
                                                            <input
                                                                type="radio"
                                                                name="warningLevel"
                                                                checked={warningLevel === 2}
                                                                onChange={() => setWarningLevel(2)}
                                                                style={{ accentColor: '#ef4444' }}
                                                            />
                                                            Mức 2 (Cần theo dõi)
                                                        </label>
                                                    </div>
                                                )}
                                            </div>

                                            <Can permission="dispute.resolve">
                                            <button
                                                className="dispute-submit-btn"
                                                onClick={handleResolveDispute}
                                                disabled={isSubmitting || adminNotes.trim().length < 10 || (verdict === 'custom' && previewLoading)}
                                                style={{ opacity: adminNotes.trim().length < 10 ? 0.5 : 1 }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontWeight: 'bold' }}>check_circle</span>
                                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận phương án'}
                                            </button>
                                            </Can>

                                            {['pending', 'investigating'].includes(disputeDetail.status || '') && (
                                                <Can permission="dispute.resolve">
                                                    <button
                                                        type="button"
                                                        className="dispute-submit-btn dispute-submit-btn--mediation"
                                                        onClick={() => setIsCloseModalOpen(true)}
                                                        disabled={isSubmitting}
                                                        title="Hai bên đã tự dàn xếp và muốn học tiếp — đóng phản ánh mà không phân xử"
                                                    >
                                                        <span className="material-symbols-outlined">handshake</span>
                                                        Đóng do hoà giải
                                                    </button>
                                                </Can>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Admin Action Modals */}
            <CloseDisputeModal
                isOpen={isCloseModalOpen}
                onClose={() => setIsCloseModalOpen(false)}
                disputeId={disputeDetail.disputeId}
                onConfirm={handleCloseDispute}
            />
            <TutorWarningModal
                isOpen={isWarningModalOpen}
                onClose={() => setIsWarningModalOpen(false)}
                user={managementTutor}
                onIssue={handleIssueWarning}
                defaultRelatedBookingId={disputeDetail.bookingId ? String(disputeDetail.bookingId) : ''}
            />

            <TutorSuspensionModal
                isOpen={isSuspendModalOpen}
                onClose={() => setIsSuspendModalOpen(false)}
                user={managementTutor}
                onSuspend={handleSuspendTutor}
            />

            <TutorAccessModal
                isOpen={isLockModalOpen}
                onClose={() => setIsLockModalOpen(false)}
                user={managementTutor}
                onBlock={handleDeactivateTutor}
            />
        </>
    );
};

export default AdminDisputeDetailPage;
