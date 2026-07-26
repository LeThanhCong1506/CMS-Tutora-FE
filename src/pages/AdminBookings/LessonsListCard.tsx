import { useState } from 'react';
import type { AdminBookingClassSessionItem } from '../../types/adminBooking.types';
import { SessionLogPanel, StatusBadge } from '../../components/shared';
import { Can } from '../../contexts/AccessContext';
import { formatDateTime } from '../../utils/formatters';
import { getLessonStatusDisplay, formatVND } from './bookingDisplay';
import styles from './AdminBookings.module.css';

interface Props {
    /** Optional on purpose: a renamed or missing backend field must not white-screen the page. */
    lessons?: AdminBookingClassSessionItem[];
}

/**
 * Bảng buổi học của booking.
 *
 * NOTE: BE chưa trả `isStudentPresent` / `isTutorPresent` (attendance) — đã yêu
 * cầu Công bổ sung. Sau khi có, thêm 1-2 cột "Có mặt" tương ứng.
 */
export default function LessonsListCard({ lessons = [] }: Props) {
    // Attendance evidence is opened per lesson from here, so staff can inspect a session without
    // a dispute having to exist first.
    const [sessionLogId, setSessionLogId] = useState<number | null>(null);

    if (!lessons.length) {
        return (
            <section className={`${styles.card} ${styles.cardFull}`}>
                <h2 className={styles.cardTitle}>Danh sách buổi học</h2>
                <div className={styles.emptyMini}>Chưa có buổi học nào.</div>
            </section>
        );
    }

    const sorted = [...lessons].sort((a, b) => a.classSessionNumber - b.classSessionNumber);

    return (
        <section className={`${styles.card} ${styles.cardFull}`}>
            <h2 className={styles.cardTitle}>Danh sách buổi học ({lessons.length})</h2>
            <div className={styles.lessonsScroll}>
                <table className={styles.lessonsTable}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Lịch dự kiến</th>
                            <th>Lịch thực tế</th>
                            <th>Trạng thái</th>
                            <th>Tags</th>
                            <th>Giá / buổi</th>
                            <th>Thanh toán tutor</th>
                            <th>Nhật ký</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((lesson) => {
                            const statusDisplay = getLessonStatusDisplay(lesson.status, lesson.realEnd);
                            return (
                                <tr key={lesson.classSessionId}>
                                    <td className={styles.lessonNumCell}>{lesson.classSessionNumber}</td>
                                    <td>
                                        <div className={styles.lessonTimeStack}>
                                            <span>{formatDateTime(lesson.scheduledStart)}</span>
                                            <span className={styles.lessonTimeSecondary}>
                                                → {formatDateTime(lesson.scheduledEnd)}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        {lesson.realStart ? (
                                            <div className={styles.lessonTimeStack}>
                                                <span>{formatDateTime(lesson.realStart)}</span>
                                                {lesson.realEnd && (
                                                    <span className={styles.lessonTimeSecondary}>
                                                        → {formatDateTime(lesson.realEnd)}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className={styles.dim}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <StatusBadge variant={statusDisplay.variant} shape="tag">
                                            {statusDisplay.label}
                                        </StatusBadge>
                                    </td>
                                    <td>
                                        <div className={styles.lessonTags}>
                                            {lesson.isMakeup && (
                                                <span className={styles.lessonTag}>Buổi bù</span>
                                            )}
                                            {!lesson.isMakeup && !lesson.isSettled && lesson.status !== 'completed' && (
                                                <span className={styles.dim}>—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={styles.lessonMoney}>{formatVND(lesson.classSessionPrice)}</td>
                                    <td>
                                        {lesson.isSettled === true ? (
                                            <StatusBadge variant="success" shape="tag">
                                                Đã chi
                                            </StatusBadge>
                                        ) : lesson.isSettled === false ? (
                                            <StatusBadge variant="neutral" shape="tag">
                                                Chưa chi
                                            </StatusBadge>
                                        ) : (
                                            <span className={styles.dim}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <Can permission="dispute.view">
                                            <button
                                                type="button"
                                                onClick={() => setSessionLogId(lesson.classSessionId)}
                                                title="Xem ai đã vào phòng học và khi nào, theo ghi nhận của Agora"
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: 12,
                                                    borderRadius: 6,
                                                    border: '1px solid #cbd5e1',
                                                    background: '#fff',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                Xem
                                            </button>
                                        </Can>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Can permission="dispute.view">
                {sessionLogId !== null && (
                    <SessionLogModal classSessionId={sessionLogId} onClose={() => setSessionLogId(null)} />
                )}
            </Can>
        </section>
    );
}

/** Lightweight overlay so the log can be read without navigating away from the booking. */
function SessionLogModal({ classSessionId, onClose }: { classSessionId: number; onClose: () => void }) {
    return (
        <div
            role="presentation"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.55)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '40px 16px',
                overflowY: 'auto',
                zIndex: 1000,
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Nhật ký buổi học"
                onClick={(event) => event.stopPropagation()}
                style={{ width: '100%', maxWidth: 920 }}
            >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '6px 14px',
                            borderRadius: 6,
                            border: 'none',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Đóng
                    </button>
                </div>
                <SessionLogPanel classSessionId={classSessionId} />
            </div>
        </div>
    );
}
