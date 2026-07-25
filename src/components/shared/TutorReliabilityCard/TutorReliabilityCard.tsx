import { useEffect, useState } from 'react';
import { getTutorReliability } from '../../../services/admin.service';
import type { TutorReliability } from '../../../types/admin.types';
import './TutorReliabilityCard.css';

/**
 * A tutor's punctuality record, aggregated from the same attendance evidence a single dispute is
 * settled with.
 *
 * The denominator is shown next to every rate on purpose. "Trễ 50%" over two measurable lessons is
 * a very different fact from the same number over forty, and a stretch of missing Agora
 * notifications must not be able to masquerade as a clean record.
 */

type TutorReliabilityCardProps = {
    tutorUserId: string | null | undefined;
    /** Days back from today. The backend defaults to 90 when nothing is passed. */
    days?: number;
};

const formatMinutes = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) return '—';
    const minutes = Math.round(seconds / 60);
    return minutes < 1 ? '<1 phút' : `${minutes} phút`;
};

const formatRate = (rate: number | null, count: number, measured: number): string => {
    if (rate === null || measured === 0) return '—';
    return `${Math.round(rate * 1000) / 10}% (${count}/${measured})`;
};

const TutorReliabilityCard = ({ tutorUserId, days = 90 }: TutorReliabilityCardProps) => {
    const [report, setReport] = useState<TutorReliability | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSessions, setShowSessions] = useState(false);

    useEffect(() => {
        if (!tutorUserId) return;

        let cancelled = false;
        const from = new Date(Date.now() - days * 86_400_000).toISOString();

        // Switching tutor or range has to clear the previous verdict immediately — showing one
        // tutor's rates under another's name for a moment would be worse than a blank card.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);
        getTutorReliability(tutorUserId, { from })
            .then((data) => {
                if (!cancelled) setReport(data);
            })
            .catch((err) => {
                console.error('Error fetching tutor reliability:', err);
                if (!cancelled) setError('Không thể tải thống kê độ tin cậy của gia sư');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [tutorUserId, days]);

    if (!tutorUserId) return null;

    if (loading && !report) {
        return (
            <div className="tutor-reliability">
                <p className="tutor-reliability__muted">Đang tải thống kê độ tin cậy…</p>
            </div>
        );
    }

    if (error && !report) {
        return (
            <div className="tutor-reliability">
                <p className="tutor-reliability__error">{error}</p>
            </div>
        );
    }

    if (!report) return null;

    const measured = report.sessionsMeasured;

    return (
        <div className="tutor-reliability">
            <div className="tutor-reliability__head">
                <h3 className="tutor-reliability__title">📊 Độ tin cậy của gia sư</h3>
                <span className="tutor-reliability__range">{days} ngày gần nhất</span>
            </div>

            {measured === 0 ? (
                <p className="tutor-reliability__muted">
                    {report.sessionsInRange === 0
                        ? 'Không có buổi học nào trong khoảng thời gian này.'
                        : `Có ${report.sessionsInRange} buổi nhưng chưa buổi nào đủ dữ liệu để đánh giá. Đây là THIẾU DỮ LIỆU, không phải bằng chứng gia sư làm tốt hay làm dở.`}
                </p>
            ) : (
                <>
                    <p className="tutor-reliability__basis">
                        Tính trên {measured}/{report.sessionsInRange} buổi có đủ bằng chứng
                        {report.sessionsWithoutEvidence > 0
                            && ` · ${report.sessionsWithoutEvidence} buổi bị loại vì không có dữ liệu`}
                    </p>

                    <div className="tutor-reliability__grid">
                        <Metric
                            label="Vào trễ"
                            value={formatRate(report.lateRate, report.lateCount, measured)}
                            hint={
                                report.averageLateSeconds
                                    ? `Trung bình ${formatMinutes(report.averageLateSeconds)}, nặng nhất ${formatMinutes(report.worstLateSeconds)}`
                                    : undefined
                            }
                        />
                        <Metric
                            label="Rời sớm"
                            value={formatRate(report.earlyLeaveRate, report.earlyLeaveCount, measured)}
                            hint={
                                report.averageEarlyLeaveSeconds
                                    ? `Trung bình ${formatMinutes(report.averageEarlyLeaveSeconds)}, nặng nhất ${formatMinutes(report.worstEarlyLeaveSeconds)}`
                                    : undefined
                            }
                        />
                        <Metric
                            label="Không vào buổi"
                            value={formatRate(report.noShowRate, report.noShowCount, measured)}
                            danger={report.noShowCount > 0}
                        />
                        <Metric
                            label="Thời lượng học trung bình"
                            value={
                                report.averageOverlapRatio === null
                                    ? '—'
                                    : `${Math.round(report.averageOverlapRatio * 1000) / 10}% lịch hẹn`
                            }
                        />
                    </div>

                    {(report.idlePresenceCount > 0
                        || report.multipleNetworkCount > 0
                        || report.multipleDeviceCount > 0) && (
                        <ul className="tutor-reliability__signals">
                            {report.idlePresenceCount > 0 && (
                                <li>
                                    {report.idlePresenceCount} buổi có dấu hiệu mở phòng rồi bỏ đó (client tự khai).
                                </li>
                            )}
                            {report.multipleNetworkCount > 0 && (
                                <li>
                                    {report.multipleNetworkCount} buổi tài khoản vào từ nhiều địa chỉ mạng — có thể là
                                    dùng chung tài khoản, cũng có thể chỉ là mạng di động đổi IP.
                                </li>
                            )}
                            {report.multipleDeviceCount > 0 && (
                                <li>{report.multipleDeviceCount} buổi tài khoản vào từ nhiều thiết bị.</li>
                            )}
                        </ul>
                    )}
                </>
            )}

            {report.sessions.length > 0 && (
                <>
                    <button
                        type="button"
                        className="tutor-reliability__toggle"
                        onClick={() => setShowSessions((open) => !open)}
                    >
                        {showSessions ? 'Ẩn chi tiết từng buổi' : `Xem chi tiết ${report.sessions.length} buổi`}
                    </button>

                    {showSessions && (
                        <div className="tutor-reliability__scroll">
                            <table className="tutor-reliability__table">
                                <thead>
                                    <tr>
                                        <th>Buổi</th>
                                        <th>Vào trễ</th>
                                        <th>Rời sớm</th>
                                        <th>Cùng có mặt</th>
                                        <th>Nguồn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.sessions.map((session) => (
                                        <tr
                                            key={session.classSessionId}
                                            className={session.isMeasured ? undefined : 'tutor-reliability__row--muted'}
                                        >
                                            <td>
                                                {new Date(session.scheduledStart).toLocaleString('vi-VN', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                                {session.isNoShow && (
                                                    <span className="tutor-reliability__badge">Không vào buổi</span>
                                                )}
                                            </td>
                                            <td>{formatMinutes(session.lateSeconds)}</td>
                                            <td>{formatMinutes(session.earlyLeaveSeconds)}</td>
                                            <td>{Math.round(session.overlapSeconds / 60)} phút</td>
                                            <td>
                                                {session.punctualitySource === 'agora'
                                                    ? 'Agora'
                                                    : session.punctualitySource === 'heartbeat'
                                                        ? 'Heartbeat'
                                                        : 'Không đủ dữ liệu'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const Metric = ({
    label,
    value,
    hint,
    danger,
}: {
    label: string;
    value: string;
    hint?: string;
    danger?: boolean;
}) => (
    <div className={`tutor-reliability__metric${danger ? ' tutor-reliability__metric--danger' : ''}`}>
        <p className="tutor-reliability__metric-label">{label}</p>
        <p className="tutor-reliability__metric-value">{value}</p>
        {hint && <p className="tutor-reliability__metric-hint">{hint}</p>}
    </div>
);

export default TutorReliabilityCard;
