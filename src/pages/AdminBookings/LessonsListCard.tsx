import type { AdminBookingLessonItem } from '../../types/adminBooking.types';
import { StatusBadge } from '../../components/shared';
import { formatDateTime } from '../../utils/formatters';
import { getLessonStatusDisplay, formatVND } from './bookingDisplay';
import styles from './AdminBookings.module.css';

interface Props {
    lessons: AdminBookingLessonItem[];
}

/**
 * Bảng buổi học của booking.
 *
 * NOTE: BE chưa trả `isStudentPresent` / `isTutorPresent` (attendance) — đã yêu
 * cầu Công bổ sung. Sau khi có, thêm 1-2 cột "Có mặt" tương ứng.
 */
export default function LessonsListCard({ lessons }: Props) {
    if (!lessons.length) {
        return (
            <section className={`${styles.card} ${styles.cardFull}`}>
                <h2 className={styles.cardTitle}>Danh sách buổi học</h2>
                <div className={styles.emptyMini}>Chưa có buổi học nào.</div>
            </section>
        );
    }

    const sorted = [...lessons].sort((a, b) => a.lessonNumber - b.lessonNumber);

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
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((lesson) => {
                            const statusDisplay = getLessonStatusDisplay(lesson.status);
                            return (
                                <tr key={lesson.lessonId}>
                                    <td className={styles.lessonNumCell}>{lesson.lessonNumber}</td>
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
                                    <td className={styles.lessonMoney}>{formatVND(lesson.lessonPrice)}</td>
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
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
