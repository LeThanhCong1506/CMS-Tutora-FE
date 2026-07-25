import { useCallback, useEffect, useRef, useState } from 'react';
import { getAgoraNcsDiagnostics, getSessionLog } from '../../../services/admin.service';
import type {
    AgoraNcsDiagnostics,
    SessionLog,
    SessionLogDeviceUse,
    SessionLogHeartbeat,
    SessionLogParticipant,
    SessionLogSummary,
} from '../../../types/admin.types';
import {
    countDistinctSources,
    formatPunctuality,
    getActivityDisplay,
    getParticipantPresenceState,
    getRefundDisplay,
} from './sessionLogDisplay';
import './SessionLogPanel.css';

/**
 * Attendance evidence for a lesson, rebuilt from Agora's own channel notifications.
 *
 * The panel is written to keep staff from over-reading the data: warnings appear above the
 * numbers, an identity matched by timing is labelled as such, and "we received nothing" is shown
 * as missing data rather than as proof that nobody attended.
 */

type SessionLogPanelProps = {
    classSessionId: number | null;
    /**
     * Fires whenever the loaded summary changes, so the page holding the panel can act on the
     * evidence — the dispute verdict form uses it to offer the suggested refund. Null while nothing
     * is loaded, which callers must treat as "no suggestion", not as "0%".
     */
    onSummaryChange?: (summary: SessionLogSummary | null) => void;
};

const ONGOING_POLL_INTERVAL_MS = 10_000;

const ROLE_LABELS: Record<string, string> = {
    tutor: 'Gia sư',
    student: 'Học viên',
    parent: 'Phụ huynh',
    recorder: 'Bộ ghi hình',
    unknown: 'Không xác định',
};

const FLAG_MESSAGES: Record<string, { text: string; tone: 'danger' | 'warning' | 'info' }> = {
    no_agora_data: {
        text: 'Không nhận được dữ liệu nào từ Agora cho buổi này. Đây là THIẾU DỮ LIỆU, không phải bằng chứng cho thấy không ai vào phòng.',
        tone: 'info',
    },
    no_participant_registry: {
        text: 'Buổi học diễn ra trước khi hệ thống ghi nhận thời điểm cấp quyền vào phòng, nên chỉ ghép được danh tính khi mã trùng khớp tuyệt đối.',
        tone: 'info',
    },
    identity_uncertain: {
        text: 'Một số danh tính được suy ra từ thời điểm vào phòng chứ không phải khớp mã trực tiếp. Cần cân nhắc trước khi dùng làm bằng chứng quyết định.',
        tone: 'warning',
    },
    ongoing_session: {
        text: 'Buổi học đang diễn ra. Đây là ảnh chụp tạm thời và số liệu sẽ tự cập nhật mỗi 10 giây.',
        tone: 'info',
    },
    insufficient_evidence: {
        text: 'Dữ liệu hiện có chưa đủ để kết luận ai vắng mặt hoặc đề xuất mức hoàn tiền.',
        tone: 'warning',
    },
    recorder_present: {
        text: 'Agora ghi nhận bộ ghi hình trong phòng. Tài khoản này không được tính là gia sư hoặc học viên.',
        tone: 'info',
    },
    unclosed_interval: {
        text: 'Có phiên vào phòng chưa nhận được sự kiện rời phòng tương ứng. Thời lượng của phiên này vẫn đang mở hoặc được ước tính theo snapshot.',
        tone: 'warning',
    },
    zero_overlap: { text: 'Chưa xác minh được khoảng thời gian gia sư và học viên cùng ở trong phòng.', tone: 'danger' },
    tutor_never_joined: { text: 'Chưa xác minh được lượt vào phòng nào thuộc về gia sư.', tone: 'danger' },
    student_never_joined: { text: 'Chưa xác minh được lượt vào phòng nào thuộc về học viên.', tone: 'danger' },
    network_drop: {
        text: 'Có người bị mất kết nối ngoài ý muốn — khác với chủ động rời buổi học.',
        tone: 'warning',
    },
    token_error: {
        text: 'Có kết nối bị ngắt do lỗi token của hệ thống. Đây là lỗi từ phía nền tảng, không nên quy trách nhiệm cho người dùng.',
        tone: 'danger',
    },
    unusual_activity: { text: 'Agora ghi nhận hành vi vào/ra bất thường.', tone: 'danger' },
    check_in_mismatch: {
        text: 'Hệ thống đã điểm danh buổi học nhưng Agora không ghi nhận thời gian hai bên cùng có mặt. Hai nguồn dữ liệu mâu thuẫn.',
        tone: 'danger',
    },
    presence_without_agora: {
        text: 'Client vẫn gửi nhịp heartbeat nhưng Agora không ghi nhận lượt vào phòng nào tương ứng. Đây là LỖ HỔNG dữ liệu phía Agora — không được đọc thành vắng mặt.',
        tone: 'warning',
    },
    idle_presence: {
        text: 'Có người ở trong phòng nhưng client báo tắt mic, tắt camera và không thao tác trong phần lớn buổi — dấu hiệu "mở phòng rồi bỏ đó". Do client tự khai, cần đối chiếu thêm.',
        tone: 'danger',
    },
    no_activity_reports: {
        text: 'Không nhịp nào gửi kèm trạng thái mic/camera, nên chưa trả lời được "có ai đang thực sự dạy không".',
        tone: 'info',
    },
    multiple_devices: {
        text: 'Một tài khoản được cấp quyền vào phòng từ nhiều hơn một thiết bị trong buổi này.',
        tone: 'warning',
    },
    multiple_networks: {
        text: 'Một tài khoản vào phòng từ nhiều địa chỉ mạng khác nhau. Đáng nghi cho việc dùng chung tài khoản, nhưng mạng di động đổi IP giữa buổi cũng cho kết quả y hệt.',
        tone: 'warning',
    },
    no_device_record: {
        text: 'Buổi học diễn ra trước khi hệ thống ghi nhận thiết bị/địa chỉ mạng, nên không đối chiếu được dấu hiệu dùng chung tài khoản.',
        tone: 'info',
    },
};

/**
 * Flags that mean "the Agora feed itself may be the problem". Seeing one is the moment staff ask
 * why the data is missing, so that is when the feed diagnostics are worth fetching.
 */
const FEED_PROBLEM_FLAGS = ['no_agora_data', 'presence_without_agora', 'identity_uncertain'];

const CONFIDENCE_LABELS: Record<string, string> = {
    exact: 'Khớp mã chính xác',
    correlated: 'Suy ra theo thời điểm vào phòng',
    unmatched: 'Chưa gắn được UID Agora',
};

const formatDuration = (totalSeconds: number): string => {
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

const formatClock = (value: string | null): string => {
    if (!value) return '—';
    // Backend timestamps are UTC. Keep the display correct even if an older deployment serializes
    // a PostgreSQL timestamp-without-time-zone value without the trailing Z.
    const hasOffset = value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(value);
    const date = new Date(hasOffset ? value : `${value}Z`);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const toneStyles: Record<'danger' | 'warning' | 'info', { background: string; border: string; color: string }> = {
    danger: { background: '#fef2f2', border: '#fecaca', color: '#991b1b' },
    warning: { background: '#fffbeb', border: '#fde68a', color: '#92400e' },
    info: { background: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
};

type FetchMode = 'initial' | 'manual' | 'poll';

const SessionLogPanel = ({ classSessionId, onSummaryChange }: SessionLogPanelProps) => {
    const [log, setLog] = useState<SessionLog | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(false);
    const requestVersionRef = useRef(0);
    const initialRequestRef = useRef(0);
    const manualRequestRef = useRef(0);
    const pollInFlightRef = useRef(false);

    const fetchLog = useCallback(async (id: number, mode: FetchMode) => {
        // A slow request must not be invalidated forever by newer interval ticks.
        if (mode === 'poll' && pollInFlightRef.current) return;
        if (mode === 'poll') pollInFlightRef.current = true;

        const requestVersion = ++requestVersionRef.current;
        if (mode === 'initial') {
            initialRequestRef.current = requestVersion;
            setLoading(true);
        } else if (mode === 'manual') {
            manualRequestRef.current = requestVersion;
            setRefreshing(true);
        }
        if (mode !== 'poll') setError(null);

        try {
            const nextLog = await getSessionLog(id);
            if (!mountedRef.current || requestVersion !== requestVersionRef.current) return;
            setLog(nextLog);
            setError(null);
        } catch (err) {
            console.error('Error fetching session log:', err);
            if (
                mountedRef.current
                && requestVersion === requestVersionRef.current
            ) {
                setError('Không thể tải nhật ký buổi học');
            }
        } finally {
            if (mountedRef.current) {
                if (mode === 'initial' && initialRequestRef.current === requestVersion) {
                    setLoading(false);
                }
                if (mode === 'manual' && manualRequestRef.current === requestVersion) {
                    setRefreshing(false);
                }
            }
            if (mode === 'poll') pollInFlightRef.current = false;
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            requestVersionRef.current += 1;
        };
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (classSessionId) void fetchLog(classSessionId, 'initial');
        return () => {
            requestVersionRef.current += 1;
        };
    }, [classSessionId, fetchLog]);

    const activeLog = log?.classSessionId === classSessionId ? log : null;
    const isOngoing = activeLog?.summary.isOngoing === true;

    const loadedSummary = activeLog?.summary ?? null;
    useEffect(() => {
        onSummaryChange?.(loadedSummary);
    }, [onSummaryChange, loadedSummary]);

    useEffect(() => {
        if (!classSessionId || !isOngoing || refreshing) return;

        const timer = window.setInterval(() => {
            void fetchLog(classSessionId, 'poll');
        }, ONGOING_POLL_INTERVAL_MS);

        return () => window.clearInterval(timer);
    }, [classSessionId, fetchLog, isOngoing, refreshing]);

    if (!classSessionId) {
        return (
            <div className="session-log-panel">
                <p style={{ color: '#64748b', margin: 0 }}>Không gắn với buổi học cụ thể nào.</p>
            </div>
        );
    }

    if (loading && !activeLog) {
        return (
            <div className="session-log-panel">
                <p style={{ color: '#64748b', margin: 0 }}>Đang tải nhật ký buổi học…</p>
            </div>
        );
    }

    if (error && !activeLog) {
        return (
            <div className="session-log-panel">
                <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>
                <button
                    type="button"
                    onClick={() => void fetchLog(classSessionId, 'initial')}
                    style={{
                        marginTop: 12,
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: '1px solid #cbd5f5',
                        background: '#fff',
                        cursor: 'pointer',
                    }}
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (!activeLog) return null;

    const { summary, participants, timeline, heartbeats, devices, flags } = activeLog;
    const overlapPercent = Math.round(summary.overlapRatio * 1000) / 10;
    const refundDisplay = getRefundDisplay(summary);
    const punctuality = formatPunctuality(
        summary.tutorLateSeconds,
        summary.tutorEarlyLeaveSeconds,
        summary.punctualitySource,
    );
    // Only ask about the feed's health when this log actually looks like the feed let it down.
    // In a normal lesson the extra request would be pure noise.
    const needsFeedDiagnostics = FEED_PROBLEM_FLAGS.some((flag) => flags.includes(flag));
    const displayFlags = [...flags];
    if (summary.isOngoing && !displayFlags.includes('ongoing_session')) {
        displayFlags.unshift('ongoing_session');
    }
    if (!summary.isEvidenceConclusive && !displayFlags.includes('insufficient_evidence')) {
        displayFlags.unshift('insufficient_evidence');
    }

    return (
        <div className="session-log-panel">
            <div className="session-log-panel__heading">
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 6px' }}>
                        🛰️ Nhật ký buổi học từ Agora
                    </h3>
                    <p className="session-log-panel__snapshot">
                        Snapshot lúc {formatClock(summary.snapshotAt)}
                        {summary.isOngoing && ' · tự cập nhật mỗi 10 giây'}
                    </p>
                </div>
                <button
                    type="button"
                    className="session-log-panel__refresh"
                    onClick={() => void fetchLog(classSessionId, 'manual')}
                    disabled={refreshing}
                >
                    {refreshing ? 'Đang làm mới…' : 'Làm mới'}
                </button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
                Dữ liệu do máy chủ Agora ghi nhận, độc lập với hệ thống điểm danh của Tutora.
            </p>

            {error && (
                <div className="session-log-panel__refresh-error">
                    {error}. Snapshot gần nhất vẫn được giữ lại.
                </div>
            )}

            {displayFlags.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {displayFlags.map((flag) => {
                        const message = FLAG_MESSAGES[flag] ?? { text: flag, tone: 'info' as const };
                        const tone = toneStyles[message.tone];
                        return (
                            <div
                                key={flag}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: 8,
                                    background: tone.background,
                                    border: `1px solid ${tone.border}`,
                                    color: tone.color,
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                }}
                            >
                                {message.text}
                            </div>
                        );
                    })}
                </div>
            )}

            {needsFeedDiagnostics && <AgoraFeedDiagnostics />}

            {punctuality.sourceNote && (
                <div className="session-log-panel__punctuality">
                    <span className="session-log-panel__punctuality-text">{punctuality.text}</span>
                    <span className="session-log-panel__punctuality-source">{punctuality.sourceNote}</span>
                </div>
            )}

            {summary.eventCount > 0 && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 12,
                        marginBottom: 24,
                    }}
                >
                    <StatTile
                        label="Thời gian học thực tế"
                        value={formatDuration(summary.overlapSeconds)}
                        hint={`${overlapPercent}% so với lịch hẹn`}
                        emphasis
                    />
                    <StatTile label="Gia sư có mặt" value={formatDuration(summary.tutorSeconds)} />
                    <StatTile label="Học viên có mặt" value={formatDuration(summary.studentSeconds)} />
                    <StatTile
                        label="Gợi ý hoàn tiền"
                        value={refundDisplay.value}
                        hint={refundDisplay.hint}
                    />
                </div>
            )}

            {/* Bảng đối soát nằm ngoài điều kiện có dữ liệu Agora: khi Agora im lặng mà heartbeat
                vẫn chạy thì chính sự lệch nhau đó mới là thứ cần nhìn thấy. */}
            <ComparisonTable
                summary={summary}
                hasCurrentParticipant={participants.some(
                    (participant) => participant.role !== 'recorder' && participant.isCurrentlyPresent,
                )}
            />

            {summary.eventCount > 0 && (
                <>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-navy)', margin: '24px 0 12px' }}>
                        Người tham gia
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {participants.map((participant, index) => (
                            <ParticipantCard
                                key={`${participant.appUserId ?? 'no-app'}-${participant.agoraUid ?? 'no-uid'}-${index}`}
                                participant={participant}
                                isEvidenceConclusive={
                                    summary.isEvidenceConclusive && !summary.isOngoing
                                }
                            />
                        ))}
                    </div>
                </>
            )}

            {heartbeats.length > 0 && (
                <>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-navy)', margin: '24px 0 4px' }}>
                        Chuỗi heartbeat (client tự báo)
                    </h4>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px' }}>
                        Do trình duyệt của người dùng gửi mỗi ~20 giây. Yếu hơn dữ liệu Agora, nhưng là nguồn duy nhất
                        phân biệt được "đang dạy" với "mở phòng rồi bỏ đó", và vẫn còn khi Agora không gửi gì.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {heartbeats.map((heartbeat) => (
                            <HeartbeatCard key={heartbeat.appUserId} heartbeat={heartbeat} />
                        ))}
                    </div>
                </>
            )}

            {devices.length > 0 && (
                <>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-navy)', margin: '24px 0 4px' }}>
                        Thiết bị và mạng
                    </h4>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px' }}>
                        Mỗi tài khoản bình thường chỉ có một dòng. Nhiều dòng nghĩa là tài khoản vào phòng từ nhiều nơi.
                    </p>
                    <DeviceTable devices={devices} />
                </>
            )}

            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-navy)', margin: '24px 0 12px' }}>
                Dòng thời gian ({timeline.length} sự kiện)
            </h4>
            {timeline.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Chưa có sự kiện nào được ghi nhận.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Thời điểm</th>
                                <th style={{ padding: '8px 10px' }}>Sự kiện</th>
                                <th style={{ padding: '8px 10px' }}>Người</th>
                                <th style={{ padding: '8px 10px' }}>Thiết bị</th>
                                <th style={{ padding: '8px 10px' }}>Lý do</th>
                            </tr>
                        </thead>
                        <tbody>
                            {timeline.map((event, index) => (
                                <tr
                                    key={[
                                        event.eventAt,
                                        event.clientSequence ?? 'no-sequence',
                                        event.agoraUid ?? event.agoraAccount ?? 'channel',
                                        event.eventType,
                                        index,
                                    ].join('-')}
                                    style={{ borderBottom: '1px solid #f1f5f9' }}
                                >
                                    <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                        {formatClock(event.eventAt)}
                                    </td>
                                    <td style={{ padding: '8px 10px' }}>
                                        {event.eventLabel}
                                        {(event.clientSequence !== null || event.clientType !== null) && (
                                            <span className="session-log-panel__event-meta">
                                                {event.clientSequence !== null && `Thứ tự #${event.clientSequence}`}
                                                {event.clientSequence !== null && event.clientType !== null && ' · '}
                                                {event.clientType !== null && `client ${event.clientType}`}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '8px 10px' }}>
                                        {event.displayName
                                            ?? event.agoraAccount
                                            ?? (event.agoraUid ? `Mã ${event.agoraUid}` : '—')}
                                        {event.role && (
                                            <span style={{ color: '#94a3b8' }}> · {ROLE_LABELS[event.role] ?? event.role}</span>
                                        )}
                                        {event.displayName && event.agoraAccount && (
                                            <span className="session-log-panel__event-meta">
                                                Tài khoản Agora: {event.agoraAccount}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '8px 10px', color: '#64748b' }}>
                                        {event.platformLabel ?? '—'}
                                    </td>
                                    <td style={{ padding: '8px 10px', color: event.reason === 2 || event.reason === 10 ? '#b45309' : '#64748b' }}>
                                        {event.reasonLabel ?? '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {summary.maxIngestLagSeconds > 60 && (
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
                    Độ trễ nhận dữ liệu lớn nhất: {formatDuration(summary.maxIngestLagSeconds)}. Thời điểm hiển thị là giờ
                    Agora ghi nhận sự kiện, không phải giờ hệ thống nhận được.
                </p>
            )}
        </div>
    );
};

const StatTile = ({
    label,
    value,
    hint,
    emphasis,
}: {
    label: string;
    value: string;
    hint?: string;
    emphasis?: boolean;
}) => (
    <div
        style={{
            padding: '14px 16px',
            borderRadius: 10,
            background: emphasis ? '#ecfdf5' : '#f8fafc',
            border: `1px solid ${emphasis ? '#a7f3d0' : '#e2e8f0'}`,
        }}
    >
        <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{label}</p>
        <p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: 'var(--color-navy)' }}>{value}</p>
        {hint && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{hint}</p>}
    </div>
);

/** Puts Agora's record next to our own heartbeat check-in so a mismatch is visible, not buried. */
const ComparisonTable = ({
    summary,
    hasCurrentParticipant,
}: {
    summary: SessionLog['summary'];
    hasCurrentParticipant: boolean;
}) => (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
                <ComparisonRow
                    label="Theo lịch hẹn"
                    value={`${formatClock(summary.scheduledStart)} → ${formatClock(summary.scheduledEnd)}`}
                />
                <ComparisonRow
                    label="Hệ thống Tutora điểm danh"
                    value={
                        summary.checkInTime
                            ? `${formatClock(summary.checkInTime)} → ${
                                summary.isOngoing && !summary.checkOutTime
                                    ? 'Đang diễn ra'
                                    : formatClock(summary.checkOutTime)
                            }`
                            : 'Chưa điểm danh'
                    }
                />
                <ComparisonRow
                    label="Agora ghi nhận"
                    value={
                        summary.firstEventAt
                            ? `${formatClock(summary.firstEventAt)} → ${
                                hasCurrentParticipant
                                    ? 'Đang có người trong phòng'
                                    : formatClock(summary.lastEventAt)
                            }`
                            : 'Không có dữ liệu'
                    }
                />
                <ComparisonRow
                    label="Heartbeat client ghi nhận"
                    value={
                        summary.heartbeatCount > 0
                            ? `Hai bên cùng có mặt ${formatDuration(summary.heartbeatOverlapSeconds)} (${
                                Math.round(summary.heartbeatOverlapRatio * 1000) / 10
                            }% lịch hẹn)`
                            : 'Không có dữ liệu'
                    }
                />
            </tbody>
        </table>
    </div>
);

/**
 * Sức khoẻ của luồng thông báo Agora, hiện ra đúng lúc nhật ký thiếu dữ liệu.
 *
 * Trả lời câu hỏi "tại sao buổi này không có dữ liệu" ngay tại chỗ, thay vì để admin phải đoán —
 * và quan trọng nhất là cho biết payload thật có mang trường `account` hay không, thứ quyết định
 * danh tính ghép được chính xác hay chỉ ghép được theo thời điểm.
 */
const AgoraFeedDiagnostics = () => {
    const [diagnostics, setDiagnostics] = useState<AgoraNcsDiagnostics | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getAgoraNcsDiagnostics()
            .then((data) => {
                if (!cancelled) setDiagnostics(data);
            })
            .catch((err) => {
                console.error('Error fetching Agora feed diagnostics:', err);
                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Im lặng khi không lấy được: đây là thông tin phụ trợ, không nên chen thêm một lỗi nữa
    // vào giữa lúc admin đang đọc bằng chứng.
    if (failed || !diagnostics) return null;

    return (
        <div className="session-log-panel__diagnostics">
            <p className="session-log-panel__diagnostics-title">Tình trạng luồng dữ liệu Agora</p>
            <p className="session-log-panel__diagnostics-verdict">{diagnostics.verdict}</p>
            <p className="session-log-panel__diagnostics-detail">
                {diagnostics.sampledEvents} sự kiện gần nhất · {diagnostics.participantEvents} sự kiện vào/rời ·{' '}
                {diagnostics.eventsWithAccount} có trường account · {diagnostics.distinctSessions} buổi học
                {diagnostics.lastReceivedAt && ` · nhận gần nhất ${formatClock(diagnostics.lastReceivedAt)}`}
            </p>
            {diagnostics.payloadKeys.length > 0 && (
                <p className="session-log-panel__diagnostics-detail">
                    Các trường Agora đang gửi: {diagnostics.payloadKeys.join(', ')}
                </p>
            )}
        </div>
    );
};

/** Nhịp heartbeat của một người: các đoạn liên tục, chỗ đứt quãng, và client báo đang làm gì. */
const HeartbeatCard = ({ heartbeat }: { heartbeat: SessionLogHeartbeat }) => {
    const roleLabel = ROLE_LABELS[heartbeat.role] ?? heartbeat.role;
    const activity = getActivityDisplay(heartbeat);
    const activityColor = activity.tone === 'warning'
        ? '#b45309'
        : activity.tone === 'unknown'
            ? '#64748b'
            : '#15803d';

    return (
        <div
            style={{
                padding: '14px 16px',
                borderRadius: 10,
                border: `1px solid ${activity.tone === 'warning' ? '#fde68a' : '#e2e8f0'}`,
                background: activity.tone === 'warning' ? '#fffbeb' : '#fff',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-navy)' }}>
                        {heartbeat.displayName ?? heartbeat.appUserId}
                        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: '#64748b' }}>{roleLabel}</span>
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: activityColor }}>{activity.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{activity.detail}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-navy)' }}>
                        {heartbeat.isCurrentlyBeating ? 'Đang gửi nhịp' : formatDuration(heartbeat.totalSeconds)}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                        {heartbeat.beatCount} nhịp · {heartbeat.runCount} đoạn
                        {heartbeat.gapCount > 0 && ` · ${heartbeat.gapCount} lần đứt quãng`}
                    </p>
                </div>
            </div>

            {heartbeat.runs.length > 1 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {heartbeat.runs.map((run, index) => (
                        <p
                            key={`${run.startedAt}-${index}`}
                            style={{ margin: 0, fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}
                        >
                            {formatClock(run.startedAt)} → {formatClock(run.lastBeatAt)} ({run.beatCount} nhịp)
                            {run.closedReasonLabel && ` · ${run.closedReasonLabel}`}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
};

/** Mỗi tài khoản thường chỉ một dòng; dòng thứ hai là chỗ cần nhìn kỹ. */
const DeviceTable = ({ devices }: { devices: SessionLogDeviceUse[] }) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
                <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 10px' }}>Người</th>
                    <th style={{ padding: '8px 10px' }}>Địa chỉ mạng</th>
                    <th style={{ padding: '8px 10px' }}>Thiết bị</th>
                    <th style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>Lần đầu → gần nhất</th>
                </tr>
            </thead>
            <tbody>
                {devices.map((device, index) => {
                    const { rows } = countDistinctSources(devices, device.appUserId);
                    return (
                        <tr
                            key={`${device.appUserId}-${device.ipAddress}-${index}`}
                            style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: rows > 1 ? '#fffbeb' : undefined,
                            }}
                        >
                            <td style={{ padding: '8px 10px' }}>
                                {device.displayName ?? device.appUserId}
                                <span style={{ color: '#94a3b8' }}> · {ROLE_LABELS[device.role] ?? device.role}</span>
                            </td>
                            <td style={{ padding: '8px 10px', fontVariantNumeric: 'tabular-nums' }}>
                                {device.ipAddress || <span style={{ color: '#94a3b8' }}>Không ghi nhận được</span>}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#64748b' }} title={device.userAgent}>
                                {device.deviceLabel || '—'}
                            </td>
                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                {formatClock(device.firstSeenAt)} → {formatClock(device.lastSeenAt)}
                                {device.admissionCount > 1 && (
                                    <span style={{ color: '#94a3b8' }}> · {device.admissionCount} lượt</span>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

const ComparisonRow = ({ label, value }: { label: string; value: string }) => (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
        <td style={{ padding: '10px 14px', color: '#64748b', width: '45%' }}>{label}</td>
        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--color-navy)' }}>{value}</td>
    </tr>
);

const ParticipantCard = ({
    participant,
    isEvidenceConclusive,
}: {
    participant: SessionLogParticipant;
    isEvidenceConclusive: boolean;
}) => {
    const roleLabel = ROLE_LABELS[participant.role] ?? participant.role;
    const presenceState = getParticipantPresenceState(participant, isEvidenceConclusive);
    const isCurrentlyPresent = presenceState === 'currently-present';
    const hasRecordedPresence = presenceState === 'recorded' || isCurrentlyPresent;
    const isUnverifiedAbsence = presenceState === 'unverified-absence';
    const lastInterval = participant.intervals.at(-1);
    const currentIntervalStart = lastInterval?.start ?? participant.firstJoinAt;
    const confidenceLabel = isUnverifiedAbsence
        ? 'Chưa gắn được UID Agora; chưa thể kết luận vắng mặt'
        : CONFIDENCE_LABELS[participant.identityConfidence] ?? participant.identityConfidence;

    const presenceValue = isCurrentlyPresent
        ? 'Đang trong phòng'
        : hasRecordedPresence
            ? formatDuration(participant.totalSeconds)
            : isUnverifiedAbsence
                ? 'Chưa có lượt vào được xác minh'
                : 'Không ghi nhận lượt vào phòng';

    return (
        <div
            style={{
                padding: '14px 16px',
                borderRadius: 10,
                border: `1px solid ${
                    isCurrentlyPresent ? '#86efac' : isUnverifiedAbsence ? '#fde68a' : '#e2e8f0'
                }`,
                background: isCurrentlyPresent ? '#f0fdf4' : isUnverifiedAbsence ? '#fffbeb' : '#fff',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-navy)' }}>
                        {participant.displayName ?? (participant.agoraUid ? `Mã ${participant.agoraUid}` : 'Không xác định')}
                        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: '#64748b' }}>{roleLabel}</span>
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                        {confidenceLabel}
                        {participant.platform && ` · ${participant.platform}`}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p
                        style={{
                            margin: 0,
                            fontWeight: 700,
                            color: isCurrentlyPresent
                                ? '#15803d'
                                : isUnverifiedAbsence
                                    ? '#92400e'
                                    : 'var(--color-navy)',
                        }}
                    >
                        {presenceValue}
                    </p>
                    {isCurrentlyPresent && (
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#15803d' }}>
                            {formatClock(currentIntervalStart)} → Đang diễn ra
                            {participant.totalSeconds > 0 && ` · đã ghi nhận ${formatDuration(participant.totalSeconds)}`}
                        </p>
                    )}
                    {presenceState === 'recorded' && (
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                            {formatClock(participant.firstJoinAt)} → {formatClock(participant.lastLeaveAt)}
                            {participant.joinCount > 1 && ` · vào ${participant.joinCount} lần`}
                        </p>
                    )}
                </div>
            </div>

            {participant.dropCount > 0 && (
                <div
                    style={{
                        marginTop: 10,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        fontSize: 12,
                        color: '#92400e',
                    }}
                >
                    Mất kết nối ngoài ý muốn {participant.dropCount} lần:{' '}
                    {participant.disconnects
                        .filter((d) => d.involuntary)
                        .map((d) => `${formatClock(d.at)} (${d.reasonLabel})`)
                        .join(', ')}
                </div>
            )}
        </div>
    );
};

export default SessionLogPanel;
