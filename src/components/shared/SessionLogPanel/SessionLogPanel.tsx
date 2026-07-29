import { useCallback, useEffect, useRef, useState } from 'react';
import { getSessionLog } from '../../../services/admin.service';
import type {
    SessionLog,
    SessionLogDeviceUse,
    SessionLogEvent,
    SessionLogHeartbeat,
    SessionLogLobbyEvidence,
    SessionLogLobbyParticipant,
    SessionLogParticipant,
    SessionLogSummary,
} from '../../../types/admin.types';
import {
    buildPersonRows,
    countDistinctSources,
    formatClock,
    formatDuration,
    formatPunctuality,
    getActivityDisplay,
    getParticipantPresenceState,
    getSessionVerdict,
    getStaffWarnings,
} from './sessionLogDisplay';
import type { PersonRow, SessionVerdict, StaffWarning } from './sessionLogDisplay';
import './SessionLogPanel.css';

/**
 * Attendance evidence for a lesson, focused on facts an administrator can use in a dispute.
 *
 * Mở ra với phần kết luận: buổi học có diễn ra không, một dòng cho mỗi người, và các cảnh báo cần
 * hành động. Bằng chứng thô (phòng chờ, chuỗi tín hiệu, thiết bị, dòng thời gian) nằm sau nút "Xem
 * bằng chứng chi tiết" — ai cũng cần câu trả lời, chỉ một số ít cần kiểm chứng nó.
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

const CONFIDENCE_LABELS: Record<string, string> = {
    exact: 'Khớp mã chính xác',
    correlated: 'Suy ra theo thời điểm vào phòng',
    unmatched: 'Chưa xác định được danh tính trong dữ liệu Agora',
};

/** Màu của khối kết luận. Giữ ở một chỗ để tông màu không lệch nhau giữa các phần. */
const VERDICT_TONES: Record<SessionVerdict['tone'], { border: string; background: string; text: string }> = {
    positive: { border: '#a7f3d0', background: '#ecfdf5', text: '#166534' },
    partial: { border: '#fde68a', background: '#fffbeb', text: '#92400e' },
    negative: { border: '#fecaca', background: '#fef2f2', text: '#991b1b' },
    pending: { border: '#bfdbfe', background: '#eff6ff', text: '#1e40af' },
    unknown: { border: '#e2e8f0', background: '#f8fafc', text: '#475569' },
};

type FetchMode = 'initial' | 'manual' | 'poll';

const SessionLogPanel = ({ classSessionId, onSummaryChange }: SessionLogPanelProps) => {
    const [log, setLog] = useState<SessionLog | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [sourceHelpOpen, setSourceHelpOpen] = useState(false);
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
        /* eslint-disable react-hooks/set-state-in-effect */
        // Chuyển sang buổi khác thì phần chi tiết đóng lại: trạng thái "đã mở" là của buổi trước.
        setDetailsOpen(false);
        if (classSessionId) void fetchLog(classSessionId, 'initial');
        /* eslint-enable react-hooks/set-state-in-effect */
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

    const { summary, participants, timeline, heartbeats, devices } = activeLog;
    // Keep the CMS usable during a rolling deployment where it may briefly talk to an older API.
    const lobby: SessionLogLobbyEvidence = activeLog.lobby ?? {
        hasAnyRecord: false,
        tutorRecorded: false,
        studentSideRecorded: false,
        bothSidesRecorded: false,
        participants: [],
    };
    const punctuality = formatPunctuality(
        summary.tutorLateSeconds,
        summary.tutorEarlyLeaveSeconds,
        summary.punctualitySource,
    );

    const showEvidence = detailsOpen;
    const verdict = getSessionVerdict(summary, activeLog.flags);
    const warnings = getStaffWarnings(activeLog.flags);
    const personRows = buildPersonRows(
        participants,
        heartbeats,
        summary.isEvidenceConclusive && !summary.isOngoing,
    );

    return (
        <div className="session-log-panel">
            <div className="session-log-panel__heading">
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 6px' }}>
                        🛰️ Nhật ký bằng chứng buổi học
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
            {error && (
                <div className="session-log-panel__refresh-error">
                    {error}. Snapshot gần nhất vẫn được giữ lại.
                </div>
            )}

            <div style={{ marginTop: 16 }}>
                <VerdictBanner verdict={verdict} />

                {summary.punctualitySource && (
                    <p style={{ margin: '12px 0 0', fontSize: 13, color: '#334155' }}>
                        <strong style={{ fontWeight: 700 }}>{punctuality.text}</strong>
                        <SourceTag source={summary.punctualitySource} />
                    </p>
                )}

                {personRows.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 8,
                                marginBottom: 8,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                Người tham gia
                            </span>
                            <button
                                type="button"
                                className="session-log-panel__source-help-toggle"
                                onClick={() => setSourceHelpOpen((open) => !open)}
                                aria-expanded={sourceHelpOpen}
                            >
                                {sourceHelpOpen ? 'Ẩn giải thích' : 'Vì sao có 2 loại số liệu?'}
                            </button>
                        </div>

                        {sourceHelpOpen && <SourceHelpCard />}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {personRows.map((row) => (
                                <PersonLine key={row.key} row={row} />
                            ))}
                        </div>
                    </div>
                )}

                {warnings.length > 0 && <WarningList warnings={warnings} />}

                <button
                    type="button"
                    className="session-log-panel__details-toggle"
                    onClick={() => setDetailsOpen((open) => !open)}
                    aria-expanded={detailsOpen}
                >
                    {detailsOpen ? 'Ẩn bằng chứng chi tiết' : 'Xem bằng chứng chi tiết'}
                </button>
            </div>

            {showEvidence && <LobbyEvidencePanel lobby={lobby} />}

            {showEvidence && summary.eventCount > 0 && (
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

            {/* KHÔNG gate theo summary.eventCount: chuỗi heartbeat là nguồn độc lập với Agora và
                chính là bằng chứng còn lại khi Agora không gửi gì — đó là lúc cần nó nhất. */}
            {showEvidence && heartbeats.length > 0 && (
                <>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-navy)', margin: '24px 0 12px' }}>
                        Chuỗi tín hiệu trong phòng học (trình duyệt tự báo)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {heartbeats.map((heartbeat) => (
                            <HeartbeatCard key={heartbeat.appUserId} heartbeat={heartbeat} />
                        ))}
                    </div>
                </>
            )}

            {showEvidence && devices.length > 0 && (
                <>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-navy)', margin: '24px 0 12px' }}>
                        Thiết bị và mạng
                    </h4>
                    <DeviceTable devices={devices} />
                </>
            )}

            {showEvidence && (
                <>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-navy)', margin: '24px 0 12px' }}>
                        Dòng thời gian ({timeline.length} sự kiện)
                    </h4>
                    {timeline.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Chưa có sự kiện nào được ghi nhận.</p>
                    ) : (
                        <TimelineTable timeline={timeline} />
                    )}
                </>
            )}

            {showEvidence && summary.maxIngestLagSeconds > 60 && (
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
                    Độ trễ nhận dữ liệu lớn nhất: {formatDuration(summary.maxIngestLagSeconds)}. Thời điểm hiển thị là giờ
                    Agora ghi nhận sự kiện, không phải giờ hệ thống nhận được.
                </p>
            )}
        </div>
    );
};

/**
 * Câu trả lời cho "buổi này có diễn ra không", đặt ở vị trí đầu tiên người đọc nhìn vào.
 *
 * Khi chưa kết luận được thì lý do nằm ngay trong khối này chứ không phải một danh sách cờ ở cuối
 * trang: người đọc phải hiểu vì sao màn hình từ chối kết luận, nếu không họ sẽ tự kết luận thay.
 */
const VerdictBanner = ({ verdict }: { verdict: SessionVerdict }) => {
    const tone = VERDICT_TONES[verdict.tone];

    return (
        <div
            style={{
                padding: '14px 16px',
                borderRadius: 10,
                border: `1px solid ${tone.border}`,
                background: tone.background,
            }}
        >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: tone.text }}>{verdict.headline}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{verdict.detail}</p>

            {/* Giờ chỉ còn tối đa 1 lý do (xem getPrimaryBlockingReason) nên hiện như một câu bình
                thường — danh sách gạch đầu dòng chỉ hợp lý khi có từ 2 mục trở lên. */}
            {verdict.blockers.map((blocker) => (
                <p key={blocker} style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                    {blocker}
                </p>
            ))}
        </div>
    );
};

/**
 * Nhãn nguồn dữ liệu, gắn ngay sau mốc thời gian thay vì một câu riêng — admin chỉ cần liếc màu là
 * biết con số này mạnh hay yếu, không cần đọc chữ. Ai muốn hiểu vì sao có 2 nguồn thì bấm nút
 * "Vì sao có 2 loại số liệu?" ở trên danh sách.
 *
 * Cố tình không gọi nguồn thứ hai là "Client" — admin không phải dân kỹ thuật, và "Client" trong
 * tiếng Việt thường bị hiểu là "khách hàng". "Trình duyệt" nói đúng bản chất: số đo này tự trình
 * duyệt người dùng báo về, không phải máy chủ Agora xác nhận.
 */
const SOURCE_TAG_STYLES: Record<'agora' | 'heartbeat', { label: string; color: string }> = {
    agora: { label: 'Agora', color: '#94a3b8' },
    heartbeat: { label: 'Trình duyệt', color: '#b45309' },
};

const SourceTag = ({ source }: { source: 'agora' | 'heartbeat' }) => {
    const meta = SOURCE_TAG_STYLES[source];
    return (
        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: meta.color }}>· {meta.label}</span>
    );
};

/** Giải thích 2 cơ chế theo dõi, mở ra khi admin bấm nút thắc mắc — không hiện mặc định. */
const SourceHelpCard = () => (
    <div
        style={{
            marginBottom: 12,
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: 12,
            color: '#334155',
            lineHeight: 1.6,
        }}
    >
        <p style={{ margin: 0 }}>
            Hệ thống nhận biết ai đang trong phòng bằng 2 nguồn độc lập, luôn ưu tiên nguồn đầu tiên:
        </p>
        <p style={{ margin: '8px 0 0' }}>
            <strong style={{ color: SOURCE_TAG_STYLES.agora.color }}>Agora</strong> — hệ thống video Agora tự
            phát hiện ngay khi có người kết nối vào phòng học. Đây là bằng chứng mạnh vì người dùng không thể
            tự sửa hay can thiệp được.
        </p>
        <p style={{ margin: '6px 0 0' }}>
            <strong style={{ color: SOURCE_TAG_STYLES.heartbeat.color }}>Trình duyệt</strong> — máy của gia sư/học
            viên tự báo về "vẫn đang mở trang học" mỗi khoảng 20 giây. Chỉ dùng số liệu này khi Agora không nhận
            được gì, nên đây là bằng chứng yếu hơn, có thể sai lệch nếu người dùng gian lận.
        </p>
    </div>
);

const PERSON_STATE_STYLES: Record<PersonRow['state'], { label: string; color: string }> = {
    'in-room': { label: 'Đang trong phòng', color: '#15803d' },
    attended: { label: '', color: 'var(--color-navy)' },
    absent: { label: 'Không vào phòng', color: '#991b1b' },
    // "Chưa xác minh" khác hẳn "vắng mặt" và phải đọc ra khác — đây là nguyên tắc xuyên suốt của
    // cả tính năng, không phải chi tiết trình bày.
    unverified: { label: 'Chưa xác minh được', color: '#92400e' },
};

/** Một người, một dòng: có mặt bao lâu, từ mấy giờ đến mấy giờ, và điều bất thường nếu có. */
const PersonLine = ({ row }: { row: PersonRow }) => {
    const state = PERSON_STATE_STYLES[row.state];
    const isAttended = row.state === 'attended';

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: '2px 12px',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: row.state === 'unverified' || row.note ? '#fffbeb' : '#fff',
            }}
        >
            <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 700, color: 'var(--color-navy)' }}>{row.name}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
                    {ROLE_LABELS[row.role] ?? row.role}
                </span>
                {row.parentName && (
                    <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#64748b' }}>
                        Phụ huynh: {row.parentName}
                    </span>
                )}
                {row.note && (
                    <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: '#92400e' }}>{row.note}</span>
                )}
            </div>

            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontWeight: 700, color: state.color }}>
                    {isAttended ? formatDuration(row.totalSeconds) : state.label}
                </span>
                {row.firstAt && (
                    <span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>
                        {formatClock(row.firstAt, false)}
                        {row.lastAt ? ` → ${formatClock(row.lastAt, false)}` : ' → đang diễn ra'}
                        {/* Gộp vào cùng một dòng thay vì một câu riêng — bấm "Vì sao có 2 loại số
                            liệu?" ở trên mới cần đọc câu giải thích đầy đủ. */}
                        {row.source && <SourceTag source={row.source} />}
                    </span>
                )}
            </div>
        </div>
    );
};

const WarningList = ({ warnings }: { warnings: StaffWarning[] }) => (
    <div
        style={{
            marginTop: 16,
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid #fde68a',
            background: '#fffbeb',
        }}
    >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400e' }}>Cần lưu ý</p>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
            {warnings.map((warning) => (
                <li key={warning.flag}>{warning.text}</li>
            ))}
        </ul>
    </div>
);

/** Bảng sự kiện thô của Agora. Tách riêng vì nó là phần dài nhất và ít khi cần mở ra. */
const TimelineTable = ({ timeline }: { timeline: SessionLogEvent[] }) => (
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
);

/** Evidence captured before room admission, while one side may still be waiting for the other. */
/**
 * Chuỗi heartbeat của một người: tổng thời lượng, các đoạn liên tục, và cách từng đoạn kết thúc.
 *
 * Lý do kết thúc của đoạn CUỐI được hiển thị ngay trên dòng tóm tắt — kể cả khi chỉ có một đoạn.
 * "Rời chủ động lúc mấy giờ" là đúng câu hỏi admin cần trả lời trong tranh chấp, nên nó không
 * được phép chỉ xuất hiện khi có nhiều đoạn.
 */
const HeartbeatCard = ({ heartbeat }: { heartbeat: SessionLogHeartbeat }) => {
    const roleLabel = ROLE_LABELS[heartbeat.role] ?? heartbeat.role;
    const activity = getActivityDisplay(heartbeat);
    const activityColor = activity.tone === 'warning'
        ? '#b45309'
        : activity.tone === 'unknown'
            ? '#64748b'
            : '#15803d';
    const lastRun = heartbeat.runs.at(-1);
    const ending = heartbeat.isCurrentlyBeating
        ? 'Đang gửi nhịp'
        : lastRun?.closedReasonLabel
            ? `${lastRun.closedReasonLabel} · nhịp cuối ${formatClock(lastRun.lastBeatAt)}`
            : lastRun
                ? `Ngừng gửi nhịp lúc ${formatClock(lastRun.lastBeatAt)} (không có tín hiệu rời)`
                : null;

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
                    {/* Hoạt động bình thường thì không có gì để nói thêm — dòng rỗng chỉ chiếm chỗ. */}
                    {activity.detail && (
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{activity.detail}</p>
                    )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: heartbeat.isCurrentlyBeating ? '#15803d' : 'var(--color-navy)' }}>
                        {heartbeat.isCurrentlyBeating
                            ? 'Đang trong phòng'
                            : formatDuration(heartbeat.totalSeconds)}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                        {formatClock(heartbeat.firstBeatAt)} → {formatClock(heartbeat.lastBeatAt)}
                        {' · '}{heartbeat.beatCount} nhịp
                        {heartbeat.gapCount > 0 && ` · ${heartbeat.gapCount} lần đứt quãng`}
                    </p>
                    {ending && (
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                            {ending}
                        </p>
                    )}
                </div>
            </div>

            {/* Từng đoạn chỉ cần liệt kê khi có nhiều hơn một — lúc đó thứ tự vào/ra mới là câu chuyện. */}
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

const LobbyEvidencePanel = ({ lobby }: { lobby: SessionLogLobbyEvidence }) => {
    const sideStatus = (label: string, recorded: boolean) => (
        <div
            style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${recorded ? '#bbf7d0' : '#fde68a'}`,
                background: recorded ? '#f0fdf4' : '#fffbeb',
            }}
        >
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{label}</p>
            <p style={{ margin: '3px 0 0', fontWeight: 700, color: recorded ? '#166534' : '#92400e' }}>
                {recorded ? 'Đã ghi nhận vào lobby' : 'Không có bản ghi vào lobby'}
            </p>
        </div>
    );

    return (
        <section style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 12px' }}>
                Phòng chờ trước buổi học
            </h4>

            {!lobby.hasAnyRecord ? (
                <div
                    style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#1e40af',
                        fontSize: 13,
                        lineHeight: 1.5,
                    }}
                >
                    Chưa có dữ liệu lobby cho buổi này.
                </div>
            ) : (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                            gap: 10,
                            marginBottom: 12,
                        }}
                    >
                        {sideStatus('Gia sư', lobby.tutorRecorded)}
                        {sideStatus('Phía học viên/phụ huynh', lobby.studentSideRecorded)}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {lobby.participants.map((participant) => (
                            <LobbyParticipantCard key={participant.appUserId} participant={participant} />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
};

const LobbyParticipantCard = ({ participant }: { participant: SessionLogLobbyParticipant }) => {
    const roomStatusColor = participant.wasAdmittedToRoom ? '#166534' : '#92400e';
    const roomStatusText = participant.wasAdmittedToRoom
        ? 'Sau đó đã được cấp quyền vào phòng học'
        : 'Bằng chứng dừng ở lobby — chưa ghi nhận cấp quyền vào phòng học';

    return (
        <div
            style={{
                padding: '13px 15px',
                borderRadius: 10,
                border: `1px solid ${participant.wasAdmittedToRoom ? '#e2e8f0' : '#fde68a'}`,
                background: participant.wasAdmittedToRoom ? '#fff' : '#fffbeb',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-navy)' }}>
                        {participant.displayName ?? participant.appUserId}
                        <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                            {ROLE_LABELS[participant.role] ?? participant.role}
                        </span>
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: roomStatusColor }}>
                        {roomStatusText}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-navy)' }}>
                        {participant.isCurrentlyWaiting ? 'Đang chờ trong lobby' : formatDuration(participant.totalSeconds)}
                    </p>
                </div>
            </div>

            <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {participant.visits.map((visit, index) => (
                    <p
                        key={`${visit.enteredAt}-${index}`}
                        style={{ margin: 0, fontSize: 12, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}
                    >
                        {formatClock(visit.enteredAt)} → {formatClock(visit.leftAt ?? visit.lastSeenAt)}
                        {visit.closedReasonLabel && ` · ${visit.closedReasonLabel}`}
                    </p>
                ))}
            </div>
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
        ? 'Chưa xác định được danh tính trong dữ liệu Agora; chưa thể kết luận vắng mặt'
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
