import { Fragment, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import SessionAllocationTable from './SessionAllocationTable';
import { computeAllocationTotals } from './sessionAllocationTotals';
import TutorWarningModal from '../AdminUserManagement/components/IssueWarningModal';
import TutorSuspensionModal from '../AdminUserManagement/components/SuspendUserModal';
import CloseDisputeModal from './components/CloseDisputeModal';
import type { FlatUserDetail } from '../AdminUserManagement/userTypes';
import {
    getDisputeDetail,
    resolveDispute,
    closeDispute,
    investigateDispute,
    getDisputeChatHistory,
    getDisputeRecording,
    resolveRecordingStreamUrl,
    issueWarning,
    suspendTutor,
    getDisputeThread,
    sendDisputeThreadMessage,
    getRefundPreview,
    getCancelCoursePreview,
    type DisputeRecording,
    type CourseCancelPreviewDto,
    type SessionAllocation,
} from '../../services/admin.service';
import type {
    DisputeDetail,
    DisputeEvidenceItemDto,
    ResolutionType,
    CloseDisputeOutcome,
    SessionLogSummary,
} from '../../types/admin.types';
import {
    ConfirmPopover,
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
    isDisputeSettled,
    getDisputeStatusVariant,
    getPriorityMeta,
    getVerdictSuggestion,
    getWarningLevelFromSeverity,
    isBeforeTutorResponseDeadline,
    isImageEvidence,
    TUTOR_ACTION_PERMISSIONS,
    validateResolution,
} from './disputeWorkflow';
import { apiErrorMessage } from '../../utils/apiError';

import '../../styles/pages/admin-dashboard.css';
import '../../styles/pages/admin-dispute-detail.css';
import { getLessonStatusDisplay } from '../AdminBookings/bookingDisplay';

type DisputeChatMessage = {
    messageId?: number;
    senderName?: string | null;
    senderId?: string | number | null;
    sentAt?: string | null;
    /** BE `ChatMessageResponse.CreatedAt` — trường thật sự trả về cho "Chat buổi học" (sentAt không tồn tại ở BE). */
    createdAt?: string | null;
    content?: string | null;
    message?: string | null;
    /** Cờ phạm vi do BE tính sẵn theo mốc booking/buổi học đang tranh chấp. */
    isBeforeBooking?: boolean;
    isWithinDisputedBooking?: boolean;
    isWithinDisputedSession?: boolean;
};

/**
 * Kênh chat là per cặp gia sư - phụ huynh/học sinh nên lịch sử luôn gồm cả booking khác của cùng
 * cặp đó — phần thương lượng trước khi đặt lớp thường là bằng chứng quan trọng nhất nên không cắt.
 * Thay vào đó nhóm theo phạm vi để admin thấy ngay đoạn nào thuộc tranh chấp đang xử lý.
 */
type ChatScope = 'before' | 'inBooking' | 'outside';

const CHAT_SCOPE_LABEL: Record<ChatScope, string> = {
    before: 'Trước khi đặt lớp đang tranh chấp',
    inBooking: 'Trong thời gian lớp đang tranh chấp',
    outside: 'Ngoài phạm vi lớp đang tranh chấp',
};

const chatScopeOf = (msg: DisputeChatMessage): ChatScope => {
    if (msg.isWithinDisputedBooking) return 'inBooking';
    if (msg.isBeforeBooking) return 'before';
    return 'outside';
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

/** Phương án duy nhất admin có thể chọn hiện nay. BE vẫn hỗ trợ đủ 5 mức. */
const ACTIVE_RESOLUTION = 'cancel_course' as ResolutionType;

const AdminDisputeDetailPage = () => {
    const navigate = useNavigate();
    // Route là `disputes/:id` (App.tsx) → param tên `id`, KHÔNG phải `disputeId`.
    const { id: disputeId } = useParams<{ id: string }>();

    // State management
    const [disputeDetail, setDisputeDetail] = useState<DisputeDetail | null>(null);
    /** Gia sư còn hạn giải trình → vào xem xét sớm là cắt ngang, phải hỏi lại. */
    const [investigateCutsResponseWindow, setInvestigateCutsResponseWindow] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Tab states — cả hai nhóm tab nằm trên URL (`?tab=`, `?chat=`) để reload hoặc
    // gửi link cho admin khác vẫn mở đúng bằng chứng đang xem.
    const [activeTab, setActiveTab] = useTabParam<EvidenceTab>(EVIDENCE_TABS, 'evidence');
    const [communicationTab, setCommunicationTab] = useTabParam<CommunicationTab>(COMMUNICATION_TABS, 'tutor', {
        paramKey: 'chat',
    });
    // UI chỉ còn MỘT phương án nên đây là hằng số, không phải state: nhóm radio 4 mức
    // (100% / 50% / chuyển gia sư / tùy chỉnh) đã bị gỡ khỏi màn hình từ 19/08/2026, và
    // nút "Chọn mức gợi ý" — chỗ duy nhất còn đổi được phương án — cũng đã bỏ vì nó đưa
    // form về một mức không còn ô nào hiển thị (nhìn như chưa chọn gì mà vẫn gửi được).
    // Các nhánh xử lý mức khác bên dưới giữ nguyên để bật lại được khi cần.
    const verdict = ACTIVE_RESOLUTION;
    const [adminNotes, setAdminNotes] = useState('');
    const [customPercentage, setCustomPercentage] = useState(50);
    const [refundPreview, setRefundPreview] = useState<RefundPreviewDto | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [courseCancelPreview, setCourseCancelPreview] = useState<CourseCancelPreviewDto | null>(null);
    const [courseCancelPreviewLoading, setCourseCancelPreviewLoading] = useState(false);
    /** classSessionId -> 'tutor' | 'parent' | 'none'. Khởi tạo từ defaultAllocation của preview. */
    const [allocations, setAllocations] = useState<Record<number, SessionAllocation>>({});

    /**
     * Latest attendance summary from the session log panel. Only used to offer a starting point for
     * the verdict — it never changes the selection on its own, because the decision is the admin's.
     */
    const [sessionLogSummary, setSessionLogSummary] = useState<SessionLogSummary | null>(null);

    // Chat history
    const [chatMessages, setChatMessages] = useState<DisputeChatMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(false);

    // Recording (video buổi học) — recording.chain có thể nhiều buổi (buổi bù/phụ/học lại nối
    // tiếp nhau), selectedChainSessionId chọn đang xem buổi nào trong chuỗi đó.
    const [recording, setRecording] = useState<DisputeRecording | null>(null);
    const [recordingLoading, setRecordingLoading] = useState(false);
    const [recordingError, setRecordingError] = useState(false);
    const [selectedChainSessionId, setSelectedChainSessionId] = useState<number | null>(null);

    // Private dispute chat threads (admin<->tutor, admin<->parent/student)
    const [tutorThread, setTutorThread] = useState<DisputeMessageDto[]>([]);
    const [tutorThreadLoading, setTutorThreadLoading] = useState(false);
    const [tutorThreadInput, setTutorThreadInput] = useState('');
    const [tutorThreadSending, setTutorThreadSending] = useState(false);

    const [parentThread, setParentThread] = useState<DisputeMessageDto[]>([]);
    const [parentThreadLoading, setParentThreadLoading] = useState(false);
    const [parentThreadInput, setParentThreadInput] = useState('');
    const [parentThreadSending, setParentThreadSending] = useState(false);

    // Khung chat riêng có trần chiều cao và tự cuộn bên trong (xem .dispute-chat-panel), nên tin
    // nhắn mới nhất nằm dưới đáy vùng cuộn — phải tự đưa xuống cuối khi mở tab hoặc vừa gửi xong,
    // nếu không admin mở ra chỉ thấy tin cũ nhất và tưởng cuộc trao đổi dừng từ lâu.
    const tutorThreadListRef = useRef<HTMLDivElement>(null);
    const parentThreadListRef = useRef<HTMLDivElement>(null);

    // Cảnh cáo gia sư: MẶC ĐỊNH BẬT khi phán quyết bất lợi cho gia sư (hoàn tiền cho phụ huynh,
    // hoặc huỷ cả khoá vì tranh chấp). Trước đây mặc định tắt, nên chỉ cần admin quên tick là
    // thang phạt (3 cảnh cáo/30 ngày → đình chỉ → tái phạm → khoá vĩnh viễn) không bao giờ khởi
    // động — mà đó là rào cản duy nhất trước việc dàn dựng no-show để rút tiền nền tảng.
    // Admin vẫn bỏ tick được khi lỗi thuộc về kỹ thuật chứ không phải gia sư.
    const verdictAgainstTutor = ACTIVE_RESOLUTION !== 'release';
    const [createWarning, setCreateWarning] = useState(verdictAgainstTutor);
    const [warningLevel, setWarningLevel] = useState<1 | 2>(1);

    // Modal states
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
    const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // Submitting state
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchDisputeDetail = useCallback(async (id: string) => {
        try {
            setLoading(true);
            setError(null);
            const data = await getDisputeDetail(id);
            setDisputeDetail(data);
            // Chốt cờ "còn hạn phản hồi" ngay lúc tải: render không được gọi Date.now()
            // (react-hooks/purity). Nó chỉ quyết định có hỏi lại trước khi xem xét hay
            // không — cờ gửi cho BE vẫn được handleInvestigate tính lại lúc bấm.
            setInvestigateCutsResponseWindow(
                isBeforeTutorResponseDeadline(data.tutorResponseDeadline, Date.now()),
            );
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

    // Preview số buổi/số tiền hủy khóa học khi admin chọn "Hủy khóa học & hoàn tiền"
    useEffect(() => {
        if (verdict !== 'cancel_course' || !disputeId) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off a one-shot fetch, not a render loop
        setCourseCancelPreviewLoading(true);
        setCourseCancelPreview(null);
        getCancelCoursePreview(disputeId)
            .then((data) => {
                setCourseCancelPreview(data);
                // Tick sẵn theo backend: buổi chưa học → phụ huynh; buổi đã học → để trống, buộc
                // admin đọc bằng chứng rồi tự quyết thay vì bấm xác nhận theo quán tính.
                setAllocations(
                    Object.fromEntries(
                        data.sessions.map((s) => [s.classSessionId, s.defaultAllocation]),
                    ),
                );
            })
            .catch((err) => {
                console.error('Error fetching cancel-course preview:', err);
                setCourseCancelPreview(null);
                toast.error('Không thể tính toán số tiền hủy khóa học');
            })
            .finally(() => setCourseCancelPreviewLoading(false));
    }, [verdict, disputeId]);

    // Fetch chat history when switching to chat tab
    const fetchChatHistory = useCallback(async () => {
        if (!disputeId) return;
        try {
            setChatLoading(true);
            const data = await getDisputeChatHistory(disputeId);
            setChatMessages(data.messages as DisputeChatMessage[]);
        } catch (err) {
            console.error('Error fetching chat history:', err);
            setChatMessages([]);
            toast.error(apiErrorMessage(err, 'Không tải được lịch sử chat của buổi học.'));
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
            // Mặc định mở đúng buổi đang bị tranh chấp (isCurrent), không phải buổi đầu chuỗi.
            setSelectedChainSessionId(data.chain.find((item) => item.isCurrent)?.classSessionId ?? data.chain[0]?.classSessionId ?? null);
        } catch (err) {
            console.error('Error fetching dispute recording:', err);
            setRecording(null);
            setRecordingError(true);
        } finally {
            setRecordingLoading(false);
        }
    }, [disputeId]);

    const selectedChainItem = recording?.chain.find((item) => item.classSessionId === selectedChainSessionId) ?? null;

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
            toast.error(apiErrorMessage(err, 'Không tải được trao đổi với gia sư.'));
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
            toast.error(apiErrorMessage(err, 'Không tải được trao đổi với phụ huynh.'));
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

    // Luôn nhảy tới tin nhắn mới nhất của luồng đang mở: khi đổi kênh, khi tải xong, khi
    // vừa gửi, và khi SignalR đẩy tin mới về. Cuộn ở layout effect để không thấy nháy ở tin cũ.
    useLayoutEffect(() => {
        const list = communicationTab === 'tutor' ? tutorThreadListRef.current : parentThreadListRef.current;
        if (!list) return;
        list.scrollTop = list.scrollHeight;
    }, [activeTab, communicationTab, tutorThread, parentThread]);

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
            toast.error(apiErrorMessage(err, 'Không thể gửi tin nhắn'));
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
            toast.error(apiErrorMessage(err, 'Không thể gửi tin nhắn'));
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
                // Chỉ gửi cho cancel_course, và chỉ những buổi chưa settle — buổi đã giải ngân
                // trước đó bị backend từ chối nếu có mặt trong danh sách.
                sessionAllocations:
                    verdict === 'cancel_course' && courseCancelPreview
                        ? courseCancelPreview.sessions
                              .filter((s) => s.isAllocatable)
                              .map((s) => ({
                                  classSessionId: s.classSessionId,
                                  allocation: allocations[s.classSessionId] as 'tutor' | 'parent',
                              }))
                        : undefined,
            });
            toast.success('Đã hoàn tất xử lý hồ sơ.');
            // Refresh data
            await fetchDisputeDetail(disputeId);
        } catch (err) {
            console.error('Error resolving dispute:', err);
            toast.error(apiErrorMessage(err, 'Không thể hoàn tất xử lý hồ sơ'));
        } finally {
            setIsSubmitting(false);
        }
    };

    /** Đóng phản ánh do hai bên hoà giải — không phân xử, không hoàn tiền. Modal tự hiện toast/đóng. */
    const handleCloseDispute = async (outcome: CloseDisputeOutcome, note: string, relearnScheduledStart?: string) => {
        if (!disputeDetail || !disputeId) return;
        await closeDispute(disputeDetail.disputeId, { classSessionOutcome: outcome, note, relearnScheduledStart });
        await fetchDisputeDetail(disputeId);
    };

    const handleInvestigate = async () => {
        if (!disputeDetail || !disputeId) return;

        // Hộp xác nhận nằm ở nút bấm (ConfirmPopover) — ở đây chỉ tính lại cờ để báo BE
        // rằng admin vào xem xét khi gia sư vẫn còn hạn phản hồi.
        const beforeDeadline = isBeforeTutorResponseDeadline(disputeDetail.tutorResponseDeadline, Date.now());

        try {
            setIsSubmitting(true);
            await investigateDispute(disputeDetail.disputeId, beforeDeadline);
            toast.success('Đã chuyển hồ sơ sang bước xem xét');
            await fetchDisputeDetail(disputeId);
        } catch (err) {
            console.error('Error investigating dispute:', err);
            toast.error(apiErrorMessage(err, 'Không thể bắt đầu xem xét hồ sơ'));
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
            // 0 = vô thời hạn; chỉ 'permanent' mới khiến BE để trống ngày kết thúc.
            suspensiontype: durationDays === 0 ? 'permanent' : 'temporary',
            durationDays,
        });
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
    // Bảng tick bắt buộc phủ đủ: buổi bị bỏ sót thì escrow của nó không được giải phóng cho ai,
    // mà booking đóng ngay sau đó — tiền kẹt vĩnh viễn. Backend cũng từ chối, nhưng chặn ở nút bấm
    // thì admin biết ngay thay vì soạn xong ghi chú mới nhận lỗi.
    const allocationTotals =
        verdict === 'cancel_course' && courseCancelPreview
            ? computeAllocationTotals(courseCancelPreview, allocations)
            : null;
    const unassignedSessionCount = allocationTotals?.unassigned ?? 0;

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
                                    <ConfirmPopover
                                        skip={!investigateCutsResponseWindow}
                                        title="Gia sư vẫn còn hạn phản hồi"
                                        description={`Gia sư còn đến ${formatDateTime(disputeDetail.tutorResponseDeadline)} để giải trình. Chuyển hồ sơ sang bước xem xét sớm?`}
                                        okText="Xem xét sớm"
                                        placement="bottomRight"
                                        onConfirm={handleInvestigate}
                                    >
                                        <button
                                            type="button"
                                            className="admin-ui-button admin-ui-button-primary"
                                            disabled={isSubmitting}
                                        >
                                            <span className="material-symbols-outlined">search</span>
                                            Bắt đầu xem xét
                                        </button>
                                    </ConfirmPopover>
                                    {disputeDetail.tutorResponseDeadline && (
                                        <span className="dispute-action-helper">
                                            Hạn phản hồi: {formatDateTime(disputeDetail.tutorResponseDeadline)}
                                        </span>
                                    )}
                                </div>
                                </Can>
                            )}
                            {/* Trạng thái legacy: nút "Xác nhận gia sư vắng mặt" và luồng phụ huynh tự
                                chọn phương án (hoàn tiền / học bù / đổi gia sư) đã được gỡ bỏ. Mọi ca
                                vắng mặt nay do Admin/Staff phân xử qua tranh chấp. Nhãn dưới đây chỉ để
                                các tranh chấp cũ đã ở trạng thái này vẫn hiển thị đúng. */}
                            {disputeDetail.status === 'confirmed_no_show' && (
                                <div style={{ maxWidth: '320px', padding: '10px 14px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', fontSize: '12px', fontWeight: 600 }}>
                                    Đã ghi nhận gia sư vắng mặt. Xử lý bằng cách phân xử tranh chấp bên dưới.
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
                                            {/* Một hành động: thời hạn chọn trong modal, "Vô thời hạn"
                                                thay cho nút ngừng truy cập cũ — giống trang quản lý người dùng. */}
                                            <Can permission={TUTOR_ACTION_PERMISSIONS.suspension}>
                                            <button
                                                type="button"
                                                className="admin-ui-button admin-ui-button-danger"
                                                onClick={() => setIsSuspendModalOpen(true)}
                                            >
                                                <span className="material-symbols-outlined">block</span>
                                                Tạm ngưng
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
                                                <div className="dispute-chat-log">
                                                    {chatMessages.map((msg, idx) => {
                                                        const scope = chatScopeOf(msg);
                                                        // Chỉ chèn vạch ngăn khi đổi phạm vi, để dòng thời gian đọc liền mạch.
                                                        const showDivider = idx === 0 || chatScopeOf(chatMessages[idx - 1]) !== scope;
                                                        return (
                                                            <Fragment key={msg.messageId ?? idx}>
                                                                {showDivider && (
                                                                    <div className={`dispute-chat-divider dispute-chat-divider--${scope}`}>
                                                                        <span>{CHAT_SCOPE_LABEL[scope]}</span>
                                                                    </div>
                                                                )}
                                                                <div
                                                                    className={[
                                                                        'dispute-chat-message',
                                                                        `dispute-chat-message--${scope}`,
                                                                        msg.isWithinDisputedSession ? 'dispute-chat-message--session' : '',
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(' ')}
                                                                >
                                                                    <div className="dispute-chat-message__head">
                                                                        <span className="dispute-chat-message__sender">
                                                                            {msg.senderName || msg.senderId || 'Unknown'}
                                                                        </span>
                                                                        <span className="dispute-chat-message__time">
                                                                            {msg.sentAt || msg.createdAt ? formatDateTime((msg.sentAt || msg.createdAt)!) : ''}
                                                                        </span>
                                                                    </div>
                                                                    {msg.isWithinDisputedSession && (
                                                                        <span className="dispute-chat-message__badge">Buổi học bị tranh chấp</span>
                                                                    )}
                                                                    <p className="dispute-chat-message__body">{msg.content || msg.message || ''}</p>
                                                                </div>
                                                            </Fragment>
                                                        );
                                                    })}
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
                                                        <div ref={tutorThreadListRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: '16px' }}>
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
                                                        <div ref={parentThreadListRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: '16px' }}>
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

                                {/* Recording (video buổi học) — chuỗi buổi bù/phụ/học lại nối tiếp nhau
                                    hiện đủ dưới dạng tab, không chỉ đúng 1 buổi bị tranh chấp. */}
                                {activeTab === 'recordings' && (
                                    <div className="dispute-chat-area">
                                        <h3 className="dispute-section-title" style={{ margin: '0 0 20px' }}>
                                            <span className="material-symbols-outlined" aria-hidden="true">videocam</span>
                                            Ghi hình buổi học
                                        </h3>

                                        {!recordingLoading && !recordingError && recording && recording.chain.length > 1 && (
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                                                {recording.chain.map((item) => (
                                                    <button
                                                        key={item.classSessionId}
                                                        type="button"
                                                        onClick={() => setSelectedChainSessionId(item.classSessionId)}
                                                        style={{
                                                            padding: '6px 14px',
                                                            borderRadius: 999,
                                                            border: item.classSessionId === selectedChainSessionId ? '1px solid var(--color-navy)' : '1px solid #e2e8f0',
                                                            background: item.classSessionId === selectedChainSessionId ? 'var(--color-navy)' : '#fff',
                                                            color: item.classSessionId === selectedChainSessionId ? '#fff' : '#334155',
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                        }}
                                                    >
                                                        {item.label}
                                                        {item.isCurrent && (
                                                            <span
                                                                title="Buổi đang bị tranh chấp"
                                                                style={{
                                                                    width: 6, height: 6, borderRadius: '50%',
                                                                    background: item.classSessionId === selectedChainSessionId ? '#fff' : '#dc2626',
                                                                }}
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

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
                                        ) : selectedChainItem?.status === 'available' && selectedChainItem.streamUrl ? (
                                            <video
                                                key={selectedChainItem.classSessionId}
                                                src={resolveRecordingStreamUrl(selectedChainItem.streamUrl)}
                                                controls
                                                style={{ width: '100%', maxHeight: '480px', borderRadius: '12px', background: '#111827', display: 'block' }}
                                                // BE báo "available" theo dữ liệu ClassSession, nhưng file trên Drive có thể đã
                                                // hỏng/token hết hạn — không có onError thì video treo spinner mặc định mãi mãi.
                                                onError={() => setRecordingError(true)}
                                            />
                                        ) : selectedChainItem?.status === 'recording' ? (
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
                                                    schedule
                                                </span>
                                                <p>Buổi học đang diễn ra — video sẽ có sau khi kết thúc.</p>
                                            </div>
                                        ) : selectedChainItem?.status === 'failed' ? (
                                            // Đã ghi hình nhưng Agora không trả về file nào lúc đóng phòng: không có gì để
                                            // chờ thêm. Admin cần phân biệt với "chưa từng ghi hình" khi cân nhắc bằng chứng.
                                            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', display: 'block', color: '#dc2626' }}>
                                                    videocam_off
                                                </span>
                                                <p>Ghi hình không thành công — hệ thống đã bật ghi hình nhưng không tạo được file cho buổi này.</p>
                                            </div>
                                        ) : selectedChainItem?.status === 'processing' ? (
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

                                    {isDisputeSettled(disputeDetail.status) ? (
                                        <div className="dispute-resolved-summary">
                                            <span className="material-symbols-outlined">
                                                check_circle
                                            </span>
                                            <h3>
                                                {disputeDetail.status === 'closed'
                                                    ? 'Đã đóng'
                                                    : 'Đã hoàn tất'}
                                            </h3>
                                            <p>
                                                {disputeDetail.resolutionNote ||
                                                    (disputeDetail.status === 'closed'
                                                        ? 'Hồ sơ đã đóng, không phân xử tiền.'
                                                        : 'Hồ sơ đã hoàn tất xử lý.')}
                                            </p>
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
                                                </div>
                                            )}

                                            {/* Chỉ còn MỘT phương án nên hiển thị như thẻ tóm tắt, không phải radio:
                                                radio một lựa chọn thì không bấm được gì, chỉ tốn một dòng để đọc.
                                                Cách tính dài dòng gập vào <details> — admin xử lý quen tay không cần
                                                đọc lại mỗi lần, người mới vẫn mở ra xem được. */}
                                            <section className="dispute-plan">
                                                <div className="dispute-plan__head">
                                                    <span className="material-symbols-outlined" aria-hidden="true">event_busy</span>
                                                    <div>
                                                        <h3 className="dispute-plan__title">Hủy khóa học &amp; hoàn tiền</h3>
                                                        <p className="dispute-plan__summary">
                                                            Tick từng buổi cho gia sư hoặc phụ huynh — mọi buổi đều phải chọn.
                                                        </p>
                                                    </div>
                                                </div>

                                                {courseCancelPreviewLoading && (
                                                    <p className="dispute-plan__loading">Đang tính số buổi và số tiền...</p>
                                                )}

                                                {!courseCancelPreviewLoading && courseCancelPreview && (
                                                    <SessionAllocationTable
                                                        preview={courseCancelPreview}
                                                        allocations={allocations}
                                                        onChange={(id, allocation) =>
                                                            setAllocations((prev) => ({ ...prev, [id]: allocation }))
                                                        }
                                                        disabled={isSubmitting}
                                                    />
                                                )}


                                                {!courseCancelPreviewLoading && courseCancelPreview?.warnings.map((w, i) => (
                                                    <p key={i} className="dispute-plan__warning">
                                                        <span className="material-symbols-outlined" aria-hidden="true">warning</span>
                                                        {w}
                                                    </p>
                                                ))}

                                                <details className="dispute-plan__more">
                                                    <summary>Cách tính chi tiết</summary>
                                                    <p>
                                                        Buổi tick cho gia sư được tính là đã dạy và giải ngân theo giá gốc đã trừ
                                                        phí sàn. Buổi tick cho phụ huynh bị hủy và hoàn theo giá gốc — chỉ hoàn kèm
                                                        5% phí dịch vụ khi khóa chưa qua đợt thanh toán thứ hai. Tổng chi luôn bị
                                                        chặn bởi số tiền thực đã thu của phụ huynh.
                                                    </p>
                                                </details>
                                            </section>

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

                                            {/* Yêu cầu "tối thiểu 10 ký tự" chuyển thành bộ đếm: nói cùng một điều
                                                nhưng cho biết còn thiếu bao nhiêu, thay vì bắt đọc rồi tự nhẩm. */}
                                            <div className="dispute-reasoning-group">
                                                <div className="dispute-label-row">
                                                    <span className="dispute-label">Ghi chú xử lý</span>
                                                    <span className={`dispute-note-counter ${adminNotes.trim().length >= 10 ? 'is-ok' : ''}`}>
                                                        {adminNotes.trim().length}/10
                                                    </span>
                                                </div>
                                                <textarea
                                                    className="dispute-textarea"
                                                    placeholder="Thông tin đã đối chiếu và lý do chọn phương án..."
                                                    value={adminNotes}
                                                    onChange={(e) => setAdminNotes(e.target.value)}
                                                    rows={3}
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
                                                {!createWarning && verdictAgainstTutor && (
                                                    <p style={{ margin: '8px 0 0 28px', fontSize: '12px', color: '#854d0e' }}>
                                                        Quyết định này bất lợi cho gia sư — bỏ nhắc nhở đồng nghĩa lần vi phạm
                                                        này không được tính vào thang xử lý tái phạm.
                                                    </p>
                                                )}
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
                                            {/* Nút này chuyển tiền thật và huỷ các buổi còn lại của khoá — trước đây
                                                bấm nhầm một cái là xong, không có bước hỏi lại nào. */}
                                            <ConfirmPopover
                                                danger
                                                title="Chốt phương án xử lý?"
                                                description={(
                                                    <>
                                                        {/* PHẢI đọc từ ô tick, không phải số tự động của
                                                            backend: trước đây chỗ này hiện
                                                            `remainingSessionsCount` nên nó nói "7 buổi"
                                                            trong khi Admin/Staff đã tick 8 — hai màn hình
                                                            cãi nhau ngay tại bước không hoàn tác được. */}
                                                        {allocationTotals
                                                            ? `Chuyển ${formatCurrency(allocationTotals.tutor)} cho gia sư (${allocationTotals.tutorCount} buổi) và hoàn ${formatCurrency(allocationTotals.parent)} cho phụ huynh (${allocationTotals.parentCount} buổi).`
                                                            : 'Huỷ các buổi chưa dạy và hoàn tiền cho phụ huynh theo giá gốc.'}
                                                        {createWarning && ` Gia sư nhận nhắc nhở mức ${warningLevel}.`}
                                                        {' '}Tiền đã chuyển thì không hoàn tác được.
                                                    </>
                                                )}
                                                okText="Chốt phương án"
                                                placement="topRight"
                                                onConfirm={handleResolveDispute}
                                            >
                                            <button
                                                className="dispute-submit-btn"
                                                disabled={
                                                    isSubmitting ||
                                                    adminNotes.trim().length < 10 ||
                                                    (verdict === 'custom' && previewLoading) ||
                                                    (verdict === 'cancel_course' && courseCancelPreviewLoading) ||
                                                    unassignedSessionCount > 0
                                                }
                                                style={{ opacity: adminNotes.trim().length < 10 ? 0.5 : 1 }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontWeight: 'bold' }}>check_circle</span>
                                                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận phương án'}
                                            </button>
                                            </ConfirmPopover>
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

        </>
    );
};

export default AdminDisputeDetailPage;
