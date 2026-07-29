import type {
    SessionLogDeviceUse,
    SessionLogHeartbeat,
    SessionLogParticipant,
    SessionLogRole,
    SessionLogSummary,
} from '../../../types/admin.types';

// ── Formatting ──────────────────────────────────────────────────────────────

export const formatDuration = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return '0 phút';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0) parts.push(`${minutes} phút`);
    if (hours === 0 && seconds > 0) parts.push(`${seconds} giây`);
    return parts.join(' ');
};

/**
 * Giờ trong ngày của một mốc thời gian UTC do backend trả về.
 *
 * `withSeconds` tắt ở các dòng tóm tắt: giây chỉ có ý nghĩa khi đang soi dòng thời gian thô để
 * dựng lại thứ tự sự kiện, còn ở phần kết luận nó chỉ làm số khó đọc.
 */
export const formatClock = (value: string | null, withSeconds = true): string => {
    if (!value) return '—';
    // Backend timestamps are UTC. Keep the display correct even if an older deployment serializes
    // a PostgreSQL timestamp-without-time-zone value without the trailing Z.
    const hasOffset = value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(value);
    const date = new Date(hasOffset ? value : `${value}Z`);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        ...(withSeconds ? { second: '2-digit' as const } : {}),
    });
};

export type ParticipantPresenceState =
    | 'currently-present'
    | 'recorded'
    | 'unverified-absence'
    | 'no-recorded-entry';

export const getParticipantPresenceState = (
    participant: Pick<
        SessionLogParticipant,
        'appUserId' | 'displayName' | 'identityConfidence' | 'isCurrentlyPresent' | 'joinCount'
    >,
    isEvidenceConclusive: boolean,
): ParticipantPresenceState => {
    if (participant.isCurrentlyPresent) return 'currently-present';
    if (participant.joinCount > 0) return 'recorded';

    const isKnownParticipant = Boolean(participant.appUserId || participant.displayName);
    if (
        isKnownParticipant
        && participant.identityConfidence === 'unmatched'
        && !isEvidenceConclusive
    ) {
        return 'unverified-absence';
    }

    return 'no-recorded-entry';
};

// ── Heartbeat chain ─────────────────────────────────────────────────────────

export type ActivityDisplay = {
    label: string;
    detail: string;
    tone: 'ok' | 'warning' | 'unknown';
};

/**
 * Mô tả hoạt động của một người trong phòng.
 *
 * "Không rõ" và "bỏ trống" không bao giờ được trông giống nhau: một máy không gửi trạng thái phải
 * đọc ra là thiếu dữ liệu, chứ không phải một gia sư bỏ phòng.
 *
 * KHÔNG hiển thị tỉ lệ bật mic/camera. Đó là số liệu kỹ thuật admin không dùng tới, và tắt camera
 * khi dạy là chuyện hoàn toàn bình thường — để con số đó ra màn hình chỉ khiến nó bị đọc nhầm
 * thành lỗi của gia sư. Riêng kết luận "phòng bỏ trống" vẫn giữ, vì đó mới là điều cần hành động.
 */
export const getActivityDisplay = (
    heartbeat: Pick<SessionLogHeartbeat, 'reportedBeats' | 'idleRatio'>,
    idleThreshold = 0.8,
): ActivityDisplay => {
    if (heartbeat.reportedBeats === 0 || heartbeat.idleRatio === null) {
        return {
            label: 'Không rõ hoạt động',
            detail: 'Máy người dùng không gửi trạng thái — thiếu dữ liệu, không phải bằng chứng bỏ lớp.',
            tone: 'unknown',
        };
    }

    if (heartbeat.idleRatio >= idleThreshold) {
        return {
            label: `Phòng gần như bỏ trống (${Math.round(heartbeat.idleRatio * 100)}% thời gian)`,
            detail: 'Do máy người dùng tự khai — cần đối chiếu thêm trước khi kết luận.',
            tone: 'warning',
        };
    }

    return { label: 'Có hoạt động', detail: '', tone: 'ok' };
};

/** Số mạng và số thiết bị khác nhau của một tài khoản trong buổi học. */
export const countDistinctSources = (
    devices: Pick<SessionLogDeviceUse, 'appUserId' | 'ipAddress'>[],
    appUserId: string,
): { networks: number; rows: number } => {
    const mine = devices.filter((device) => device.appUserId === appUserId);
    // Bản ghi không lấy được IP lưu chuỗi rỗng; nó là dữ liệu thiếu, không phải một mạng khác.
    const networks = new Set(mine.map((device) => device.ipAddress).filter(Boolean));
    return { networks: networks.size, rows: mine.length };
};

// ── Punctuality ─────────────────────────────────────────────────────────────

export const formatPunctuality = (
    lateSeconds: number | null,
    earlyLeaveSeconds: number | null,
    source: 'agora' | 'heartbeat' | null,
): { text: string; sourceNote: string | null } => {
    if (source === null) {
        return { text: 'Chưa xác định được giờ vào/ra của gia sư', sourceNote: null };
    }

    const sourceNote = source === 'agora'
        ? 'Theo mốc thời gian máy chủ Agora'
        : 'Theo nhịp heartbeat của client (Agora không có dữ liệu) — bằng chứng yếu hơn';

    const parts: string[] = [];
    if (lateSeconds !== null && lateSeconds > 0) parts.push(`vào trễ ${Math.round(lateSeconds / 60)} phút`);
    if (earlyLeaveSeconds !== null && earlyLeaveSeconds > 0) {
        parts.push(`rời sớm ${Math.round(earlyLeaveSeconds / 60)} phút`);
    }

    return {
        text: parts.length === 0 ? 'Đúng giờ' : `Gia sư ${parts.join(', ')}`,
        sourceNote,
    };
};

// ── Chế độ rút gọn ──────────────────────────────────────────────────────────
// Tất cả những gì bên dưới chỉ phục vụ variant="compact": trả lời "buổi này có diễn ra không, ai
// có mặt, có gì bất thường" bằng tiếng Việt thường, và giấu toàn bộ bằng chứng thô đi. Các cờ kỹ
// thuật KHÔNG được đổ thẳng ra màn hình — cờ nào không dẫn tới hành động nào của staff thì thuộc
// về phần chi tiết, không thuộc phần tóm tắt.

export type SessionVerdictTone = 'positive' | 'partial' | 'negative' | 'pending' | 'unknown';

export type SessionVerdict = {
    tone: SessionVerdictTone;
    headline: string;
    detail: string;
    /** Vì sao chưa kết luận được. Rỗng khi bằng chứng đã đủ. */
    blockers: string[];
};

/**
 * Lý do chưa đủ căn cứ, rút gọn còn ĐÚNG MỘT câu — nói rõ số liệu đang xem là của nguồn nào và vì
 * sao, thay vì liệt kê từng cờ kỹ thuật rời rạc rồi bắt admin tự ghép lại. `no_agora_data` và
 * `presence_without_agora` luôn đi cùng nhau trên thực tế (Agora trống nhưng client vẫn có), nên
 * gộp thành một câu chuyện duy nhất: "số liệu đang thấy tới từ đâu, và tại sao".
 *
 * Chỉ trả về MỘT lý do (ưu tiên theo mức nghiêm trọng) — nhiều cờ cùng khớp thì lý do nghiêm trọng
 * nhất mới là thứ admin cần đọc trước.
 */
const getPrimaryBlockingReason = (flags: string[], heartbeatCount: number): string | null => {
    if (flags.includes('no_agora_data') || flags.includes('presence_without_agora')) {
        return heartbeatCount > 0
            ? 'Số liệu đang lấy từ trình duyệt của người dùng — hệ thống không nhận được dữ liệu từ Agora cho buổi này (có thể do lỗi kỹ thuật, không phải vì không ai vào phòng).'
            : 'Agora không ghi nhận được gì cho buổi này.';
    }
    if (flags.includes('identity_uncertain')) {
        return 'Chưa xác định chắc chắn được danh tính người tham gia trong dữ liệu Agora.';
    }
    if (flags.includes('check_in_mismatch')) {
        return 'Dữ liệu điểm danh và dữ liệu Agora không khớp nhau.';
    }
    if (flags.includes('unclosed_interval')) {
        return 'Có lượt vào phòng chưa ghi nhận được lúc rời.';
    }
    if (flags.includes('insufficient_evidence')) {
        return 'Một số sự kiện thiếu thông tin định danh.';
    }
    return null;
};

/**
 * Một câu trả lời cho câu hỏi duy nhất admin mở modal này để hỏi: buổi học có diễn ra không.
 *
 * Thứ tự nhánh là có chủ đích. "Đang diễn ra" và "không có dữ liệu" phải chặn trước mọi kết luận,
 * và `isEvidenceConclusive` phải chặn trước cả ba nhánh vắng mặt — đúng bằng chốt chặn mà backend
 * đã dựng, để màn hình không bao giờ khẳng định chắc hơn dữ liệu đứng sau nó.
 */
export const getSessionVerdict = (
    summary: Pick<
        SessionLogSummary,
        | 'isOngoing'
        | 'isEvidenceConclusive'
        | 'overlapSeconds'
        | 'overlapRatio'
        | 'eventCount'
        | 'heartbeatCount'
    >,
    flags: string[],
): SessionVerdict => {
    const percent = Math.round(summary.overlapRatio * 1000) / 10;
    const attended = `Hai bên cùng có mặt ${formatDuration(summary.overlapSeconds)} — ${percent}% so với lịch hẹn.`;

    if (summary.isOngoing) {
        return {
            tone: 'pending',
            headline: 'Buổi học đang diễn ra',
            detail: `${attended} Số liệu còn tiếp tục thay đổi.`,
            blockers: [],
        };
    }

    if (summary.eventCount === 0 && summary.heartbeatCount === 0) {
        return {
            tone: 'unknown',
            headline: 'Không có dữ liệu điểm danh',
            detail:
                'Buổi học này không ghi nhận được tín hiệu nào từ cả Agora lẫn client. '
                + 'Đây là thiếu dữ liệu, không phải bằng chứng rằng không ai vào phòng.',
            blockers: [],
        };
    }

    if (!summary.isEvidenceConclusive) {
        const reason = getPrimaryBlockingReason(flags, summary.heartbeatCount);
        return {
            tone: 'unknown',
            headline: 'Chưa đủ căn cứ để kết luận',
            detail: `Hai bên cùng có mặt ${formatDuration(summary.overlapSeconds)} (${percent}% lịch hẹn).`,
            blockers: reason ? [reason] : [],
        };
    }

    if (flags.includes('tutor_never_joined')) {
        return {
            tone: 'negative',
            headline: 'Gia sư không vào phòng học',
            detail: 'Không ghi nhận lượt vào phòng nào của gia sư trong buổi này.',
            blockers: [],
        };
    }

    if (flags.includes('student_never_joined')) {
        return {
            tone: 'negative',
            headline: 'Học viên không vào phòng học',
            detail: 'Không ghi nhận lượt vào phòng nào từ phía học viên trong buổi này.',
            blockers: [],
        };
    }

    if (flags.includes('zero_overlap')) {
        return {
            tone: 'negative',
            headline: 'Hai bên không gặp nhau',
            detail: 'Cả hai phía đều có vào phòng, nhưng không có lúc nào cùng ở trong phòng.',
            blockers: [],
        };
    }

    // 75% là đúng ngưỡng backend dừng đề xuất hoàn tiền (SuggestRefund). Dùng lại con số đó để
    // dòng kết luận và mức gợi ý hoàn tiền không bao giờ nói hai chuyện khác nhau.
    if (summary.overlapRatio >= 0.75) {
        return { tone: 'positive', headline: 'Buổi học đã diễn ra', detail: attended, blockers: [] };
    }

    return {
        tone: 'partial',
        headline: 'Buổi học chỉ diễn ra một phần',
        detail: attended,
        blockers: [],
    };
};

/**
 * Cờ đáng để staff nhìn nhưng không chặn kết luận. Danh sách cố định và có thứ tự ưu tiên, thay vì
 * lặp theo mảng `flags` — thứ tự backend phát cờ là chi tiết cài đặt, không phải mức độ quan trọng.
 */
const STAFF_WARNINGS: [flag: string, text: string][] = [
    ['idle_presence', 'Có người ở trong phòng nhưng gần như không có hoạt động nào suốt buổi. Do máy người dùng tự khai — cần đối chiếu thêm.'],
    ['multiple_networks', 'Một tài khoản vào phòng từ nhiều địa chỉ mạng khác nhau. Đổi mạng giữa buổi cũng cho kết quả giống hệt.'],
    ['multiple_devices', 'Một tài khoản vào phòng từ nhiều thiết bị khác nhau.'],
    ['unusual_activity', 'Agora ghi nhận hành vi vào/rời phòng bất thường.'],
    ['network_drop', 'Có người bị mất kết nối ngoài ý muốn giữa buổi.'],
    ['token_error', 'Có lượt rớt do lỗi kỹ thuật của hệ thống — không phải lỗi người dùng.'],
];

export type StaffWarning = { flag: string; text: string };

export const getStaffWarnings = (flags: string[]): StaffWarning[] =>
    STAFF_WARNINGS
        .filter(([flag]) => flags.includes(flag))
        .map(([flag, text]) => ({ flag, text }));

// ── Một dòng cho mỗi người ──────────────────────────────────────────────────

export type PersonPresenceState = 'in-room' | 'attended' | 'absent' | 'unverified';

export type PersonRow = {
    key: string;
    name: string;
    role: SessionLogRole;
    state: PersonPresenceState;
    /** Nguồn của con số thời lượng. Null khi không nguồn nào ghi nhận được gì. */
    source: 'agora' | 'heartbeat' | null;
    totalSeconds: number;
    firstAt: string | null;
    lastAt: string | null;
    /** Ghi chú ngắn (rớt mạng, bỏ phòng trống). Null khi không có gì đáng nói. */
    note: string | null;
    /** Tên phụ huynh, chỉ có trên dòng học viên sau khi gộp. Xem `foldParentIntoStudent`. */
    parentName?: string;
};

/**
 * Gộp dòng phụ huynh vào dòng học viên.
 *
 * Ở màn tóm tắt, admin không cần theo dõi phụ huynh có vào phòng hay không — thứ cần biết chỉ là
 * học viên này thuộc phụ huynh nào. Để phụ huynh thành một dòng riêng chỉ làm danh sách dài thêm
 * và sinh ra một trạng thái "chưa xác minh được" không dẫn tới hành động nào.
 *
 * Ngoại lệ quan trọng: học viên chưa có tài khoản riêng thì backend không sinh dòng học viên nào,
 * và chính phụ huynh là người ngồi học. Lúc đó dòng phụ huynh phải ở lại, vì nó là bằng chứng có
 * mặt duy nhất của phía học viên. Dữ liệu đầy đủ của phụ huynh vẫn nằm trong "Xem bằng chứng chi tiết".
 */
const foldParentIntoStudent = (rows: PersonRow[]): PersonRow[] => {
    const student = rows.find((row) => row.role === 'student');
    const parent = rows.find((row) => row.role === 'parent');
    if (!student || !parent) return rows;

    return rows
        .filter((row) => row !== parent)
        .map((row) => (row === student ? { ...row, parentName: parent.name } : row));
};

const buildNote = (
    participant: SessionLogParticipant | null,
    heartbeat: SessionLogHeartbeat | undefined,
    idleThreshold: number,
): string | null => {
    const parts: string[] = [];

    if (heartbeat && heartbeat.idleRatio !== null && heartbeat.idleRatio >= idleThreshold) {
        parts.push(`gần như không hoạt động (${Math.round(heartbeat.idleRatio * 100)}% số nhịp)`);
    }
    if (participant && participant.dropCount > 0) {
        parts.push(`mất kết nối ${participant.dropCount} lần`);
    }

    if (parts.length === 0) return null;
    return parts.join(' · ');
};

/**
 * Gộp bốn mục của bản đầy đủ thành một dòng cho mỗi người — nhưng KHÔNG gộp hai nguồn bằng chứng.
 *
 * Agora luôn là nguồn chính. Chuỗi nhịp client chỉ được dùng khi Agora không thấy gì, và khi đó
 * `source` phải nói rõ ra, vì đó là một con số yếu hơn hẳn. Người không nguồn nào thấy chỉ được
 * gọi là vắng mặt sau khi backend đã chốt `isEvidenceConclusive`; trước đó là "chưa xác minh".
 */
export const buildPersonRows = (
    participants: SessionLogParticipant[],
    heartbeats: SessionLogHeartbeat[],
    isEvidenceConclusive: boolean,
    idleThreshold = 0.8,
): PersonRow[] => {
    const beatByUser = new Map(heartbeats.map((beat) => [beat.appUserId, beat]));
    const consumed = new Set<string>();
    const rows: PersonRow[] = [];

    for (const participant of participants) {
        // Bot ghi hình của Agora không phải người tham gia; nó chỉ gây nhiễu ở bản rút gọn.
        if (participant.role === 'recorder') continue;

        const heartbeat = participant.appUserId
            ? beatByUser.get(participant.appUserId)
            : undefined;
        if (heartbeat) consumed.add(heartbeat.appUserId);

        const key = participant.appUserId ?? `uid:${participant.agoraUid ?? 'unknown'}`;
        const name = participant.displayName
            ?? (participant.agoraUid ? `Không rõ danh tính (UID ${participant.agoraUid})` : 'Không rõ danh tính');
        const note = buildNote(participant, heartbeat, idleThreshold);
        const presence = getParticipantPresenceState(participant, isEvidenceConclusive);

        if (presence === 'currently-present' || presence === 'recorded') {
            rows.push({
                key,
                name,
                role: participant.role,
                state: presence === 'currently-present' ? 'in-room' : 'attended',
                source: 'agora',
                totalSeconds: participant.totalSeconds,
                firstAt: participant.firstJoinAt,
                lastAt: presence === 'currently-present' ? null : participant.lastLeaveAt,
                note,
            });
            continue;
        }

        if (heartbeat && heartbeat.totalSeconds > 0) {
            rows.push({
                key,
                name,
                role: participant.role,
                state: heartbeat.isCurrentlyBeating ? 'in-room' : 'attended',
                source: 'heartbeat',
                totalSeconds: heartbeat.totalSeconds,
                firstAt: heartbeat.firstBeatAt,
                lastAt: heartbeat.isCurrentlyBeating ? null : heartbeat.lastBeatAt,
                note,
            });
            continue;
        }

        rows.push({
            key,
            name,
            role: participant.role,
            state: presence === 'unverified-absence' ? 'unverified' : 'absent',
            source: null,
            totalSeconds: 0,
            firstAt: null,
            lastAt: null,
            note,
        });
    }

    // Ai chỉ có nhịp client mà không có dòng participant nào (buổi Agora im lặng hoàn toàn) vẫn
    // phải xuất hiện — đó chính là lúc chuỗi nhịp là bằng chứng duy nhất còn lại.
    for (const heartbeat of heartbeats) {
        if (consumed.has(heartbeat.appUserId) || heartbeat.role === 'recorder') continue;

        rows.push({
            key: heartbeat.appUserId,
            name: heartbeat.displayName ?? heartbeat.appUserId,
            role: heartbeat.role,
            state: heartbeat.isCurrentlyBeating
                ? 'in-room'
                : heartbeat.totalSeconds > 0
                    ? 'attended'
                    : 'unverified',
            source: heartbeat.totalSeconds > 0 ? 'heartbeat' : null,
            totalSeconds: heartbeat.totalSeconds,
            firstAt: heartbeat.firstBeatAt,
            lastAt: heartbeat.isCurrentlyBeating ? null : heartbeat.lastBeatAt,
            note: buildNote(null, heartbeat, idleThreshold),
        });
    }

    return foldParentIntoStudent(rows);
};
