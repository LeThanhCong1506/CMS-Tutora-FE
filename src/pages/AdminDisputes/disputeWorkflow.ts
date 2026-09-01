/**
 * Quyết định nghiệp vụ của luồng xử lý phản ánh, tách khỏi component để test được.
 *
 * Trang chi tiết phản ánh chỉ nên lo phần render và gọi API; mọi câu "khi nào thì
 * gợi ý hoàn tiền", "mức cảnh cáo nào", "tạm ngưng kiểu gì" nằm ở đây.
 */
import type { StatusVariant } from '../../components/shared';
import type { ResolutionType, SessionLogSummary } from '../../types/admin.types';

// ── Trạng thái & mức ưu tiên ────────────────────────────────────────────────

export const getDisputeStatusVariant = (status?: string | null): StatusVariant => {
    switch (status) {
        case 'pending':
            return 'warning';
        case 'investigating':
            return 'info';
        case 'confirmed_no_show':
            return 'success';
        case 'resolved':
            return 'success';
        case 'closed':
            return 'neutral';
        default:
            return 'dark';
    }
};

export const getDisputeStatusLabel = (status?: string | null) => {
    switch (status) {
        case 'pending':
            return 'Chờ tiếp nhận';
        case 'investigating':
            return 'Đang xem xét';
        case 'confirmed_no_show':
            return 'Đã xác nhận vắng mặt';
        case 'resolved':
            return 'Đã hoàn tất';
        case 'closed':
            return 'Đã đóng';
        default:
            return status || 'N/A';
    }
};

export const getPriorityVariant = (priority?: string | null): StatusVariant => {
    switch (priority) {
        case 'high':
            return 'error';
        case 'medium':
            return 'warning';
        case 'low':
            return 'success';
        default:
            return 'neutral';
    }
};

/** Emoji dẫn đầu chuỗi BE trả về (`PriorityDisplay` = "🟡 Trung bình"). */
const LEADING_EMOJI = /^[\p{Extended_Pictographic}️\s]+/u;

const PRIORITY_LABELS: Record<string, string> = {
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
};

const PRIORITY_ICONS: Record<string, string> = {
    high: 'keyboard_double_arrow_up',
    medium: 'horizontal_rule',
    low: 'keyboard_double_arrow_down',
};

/**
 * Nhãn + icon cho mức ưu tiên. BE nhét emoji vào `PriorityDisplay` ("🟡 Trung bình"),
 * nhưng badge đã có màu theo mức nên emoji vừa thừa vừa lạc tông so với bộ Material
 * Symbols dùng khắp CMS — FE tự dựng nhãn từ `priority`, chỉ dùng chuỗi BE (đã gỡ
 * emoji) khi gặp mức lạ chưa được map.
 */
export const getPriorityMeta = (priority?: string | null, display?: string | null) => ({
    label: PRIORITY_LABELS[priority ?? '']
        || display?.replace(LEADING_EMOJI, '').trim()
        || 'Chưa phân loại',
    icon: PRIORITY_ICONS[priority ?? ''] || 'pending',
    variant: getPriorityVariant(priority),
});

// ── Loại phản ánh ───────────────────────────────────────────────────────────

const DISPUTE_TYPE_LABELS: Record<string, string> = {
    no_show: 'Vắng mặt',
    quality: 'Chất lượng',
    payment: 'Thanh toán',
    other: 'Khác',
};

const DISPUTE_TYPE_ICONS: Record<string, string> = {
    no_show: 'person_off',
    quality: 'sentiment_dissatisfied',
    payment: 'payments',
    other: 'help',
};

export type DisputeTypeTone = 'danger' | 'warn' | 'info' | 'neutral';

const DISPUTE_TYPE_TONES: Record<string, DisputeTypeTone> = {
    no_show: 'danger',
    quality: 'warn',
    payment: 'info',
    other: 'neutral',
};

/**
 * Nhãn + icon cho loại phản ánh.
 *
 * BE nhét emoji vào `DisputeTypeDisplay` ("🚫 Vắng mặt", "⚠️ Chất lượng"). Emoji render theo
 * font hệ điều hành nên mỗi máy một kiểu, và lạc hẳn tông so với bộ Material Symbols dùng
 * khắp CMS. FE tự dựng nhãn từ `disputeType`, chỉ mượn chuỗi BE (đã gỡ emoji) khi gặp loại
 * lạ chưa được map — cùng cách đã làm với mức ưu tiên.
 */
export const getDisputeTypeMeta = (type?: string | null, display?: string | null) => ({
    label: DISPUTE_TYPE_LABELS[type ?? '']
        || display?.replace(LEADING_EMOJI, '').trim()
        || 'Không xác định',
    icon: DISPUTE_TYPE_ICONS[type ?? ''] || 'flag',
    tone: DISPUTE_TYPE_TONES[type ?? ''] || 'neutral',
});

// ── Xem bằng chứng ──────────────────────────────────────────────────────────

/**
 * Ảnh thì xem trực tiếp được nên render thumbnail; còn lại coi là tài liệu và chỉ
 * mở ở tab mới. Query string phải bỏ qua vì URL đã ký của storage luôn kèm token
 * (`...jpg?X-Goog-Signature=...`) — nếu không, mọi ảnh có token đều bị coi là tài liệu.
 */
export const isImageEvidence = (url: string): boolean =>
    /\.(jpg|jpeg|png|gif|webp)(?:\?.*)?$/i.test(url);

// ── Gợi ý phương án hoàn tiền ───────────────────────────────────────────────

export type VerdictSuggestion = {
    resolution: ResolutionType;
    label: string;
    detail: string;
};

/**
 * Biến bằng chứng điểm danh thành điểm khởi đầu cho phán quyết.
 *
 * Trả null mỗi khi bản ghi tự nó từ chối kết luận — buổi học đang diễn ra, thiếu
 * dữ liệu Agora, danh tính chưa chắc chắn. Gợi ý "chuyển tiền cho gia sư" dựa trên
 * bằng chứng đã tự nhận là chưa đầy đủ thì còn tệ hơn không gợi ý gì, vì nó trông
 * như thể hệ thống đồng tình.
 */
export const getVerdictSuggestion = (summary: SessionLogSummary | null): VerdictSuggestion | null => {
    if (!summary || summary.suggestedRefundPercentage === null) return null;

    const attended = `Hai bên cùng có mặt ${Math.round(summary.overlapSeconds / 60)} phút — ${
        Math.round(summary.overlapRatio * 1000) / 10
    }% so với lịch hẹn.`;

    switch (summary.suggestedRefundPercentage) {
        case 100:
            return {
                resolution: 'refund_100',
                label: 'hoàn 100%',
                detail: `${attended} Tham khảo — quyết định vẫn thuộc về bạn.`,
            };
        case 50:
            return {
                resolution: 'refund_50',
                label: 'chia 50% cho mỗi bên',
                detail: `${attended} Tham khảo — quyết định vẫn thuộc về bạn.`,
            };
        case 0:
            return {
                resolution: 'release',
                label: 'chuyển tiền cho gia sư',
                detail: `${attended} Tham khảo — quyết định vẫn thuộc về bạn.`,
            };
        default:
            return null;
    }
};

// ── Chốt phương án ──────────────────────────────────────────────────────────

/** Ghi chú của admin là dấu vết duy nhất giải thích vì sao tiền đi đường đó. */
export const MIN_RESOLUTION_NOTE_LENGTH = 10;

export type ResolutionDraft = {
    verdict: ResolutionType;
    notes: string;
    customPercentage: number;
};

export type ResolutionValidation = { ok: true } | { ok: false; message: string };

export const validateResolution = ({
    verdict,
    notes,
    customPercentage,
}: ResolutionDraft): ResolutionValidation => {
    if (notes.trim().length < MIN_RESOLUTION_NOTE_LENGTH) {
        return { ok: false, message: `Ghi chú phải có ít nhất ${MIN_RESOLUTION_NOTE_LENGTH} ký tự` };
    }

    if (verdict === 'custom' && (customPercentage < 0 || customPercentage > 100)) {
        return { ok: false, message: 'Phần trăm hoàn tiền tùy chỉnh phải từ 0 đến 100' };
    }

    return { ok: true };
};

// ── Hạn phản hồi của gia sư ─────────────────────────────────────────────────

/**
 * Gia sư còn hạn phản hồi thì admin vào xem xét sớm là cắt ngang quyền trả lời của
 * họ, nên chỗ gọi phải hỏi lại trước. Không có hạn thì coi như không còn gì phải chờ.
 */
export const isBeforeTutorResponseDeadline = (
    deadline: string | null | undefined,
    nowMs: number,
): boolean => {
    if (!deadline) return false;
    const deadlineMs = new Date(deadline).getTime();
    if (Number.isNaN(deadlineMs)) return false;
    return nowMs < deadlineMs;
};

// ── Nhắc nhở / cảnh cáo gia sư ──────────────────────────────────────────────

export type WarningSeverity = 'low' | 'medium' | 'high';

/**
 * Khớp 1-1 với WarningLevel bên BE: 1 = Thấp, 2 = Trung bình, 3 = Cao.
 * Mức 3 khiến BE tạm ngưng tài khoản ngay; mức 1-2 chỉ tạm ngưng khi tích lũy đủ
 * 3 cảnh cáo trong 30 ngày. Gộp "high" xuống 2 sẽ khiến lựa chọn nặng nhất trên UI
 * âm thầm không có tác dụng gì.
 */
export const getWarningLevelFromSeverity = (severity: string): 1 | 2 | 3 => {
    switch (severity) {
        case 'low':
            return 1;
        case 'medium':
            return 2;
        case 'high':
            return 3;
        default:
            // Mức lạ thì coi là trung bình: không bỏ qua, cũng không tự động khóa.
            return 2;
    }
};

// ── Quyền cho từng hành động lên gia sư ─────────────────────────────────────

/**
 * Ba công cụ quản lý gia sư trong trang phản ánh. Gom vào một chỗ để quyền yêu cầu
 * không lệch giữa nút bấm và endpoint tương ứng bên BE.
 */
export const TUTOR_ACTION_PERMISSIONS = {
    /** Gửi nhắc nhở — POST /admin/warnings/users/{id} */
    reminder: 'warning.create',
    /** Tạm ngưng hoạt động — POST /admin/warnings/users/{id}/suspend */
    suspension: 'suspension.manage',
    /** Ngừng quyền truy cập — PUT /admin/users/{id}/deactivate */
    accessRemoval: 'user.deactivate',
} as const;
