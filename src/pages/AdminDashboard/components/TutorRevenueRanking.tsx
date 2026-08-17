import type { TutorPerformanceItem } from '../../../types/admin.types';
import { getFallbackAvatar } from '../../../utils/avatar';
import { formatDashboardCurrency } from '../dashboardDisplay';

/** Trần backend cho tham số `top` của endpoint tutor-performance. */
export const TUTOR_RANKING_LIMIT = 50;

interface TutorRevenueRankingProps {
    /** Đã được backend sắp xếp giảm dần theo doanh thu. */
    tutors: TutorPerformanceItem[];
}

/**
 * Bảng xếp hạng doanh thu gia sư trên toàn hệ thống trong khoảng đang xem.
 *
 * Mỗi dòng chỉ gồm thứ hạng, tên và doanh thu — các chỉ số phụ (số buổi, điểm
 * đánh giá) thuộc về trang báo cáo doanh thu, ở dashboard chỉ làm loãng bảng.
 *
 * Gia sư chưa phát sinh doanh thu bị loại khỏi bảng: xếp hạng theo doanh thu mà
 * để hàng loạt số 0 đồng hạng thì không nói lên điều gì.
 */
const TutorRevenueRanking = ({ tutors }: TutorRevenueRankingProps) => {
    const earning = tutors.filter((tutor) => tutor.totalRevenue > 0);

    if (earning.length === 0) {
        return (
            <div className="admin-chart-empty" role="status" aria-live="polite">
                <span className="material-symbols-outlined" aria-hidden="true">
                    leaderboard
                </span>
                <span>Chưa có gia sư nào phát sinh doanh thu trong kỳ này</span>
            </div>
        );
    }

    return (
        <ol className="admin-tutor-rank-list">
            {earning.map((tutor, index) => {
                const rank = index + 1;

                return (
                    <li key={tutor.tutorId} className="admin-tutor-rank-row">
                        <span
                            className={`admin-tutor-rank-badge ${rank <= 3 ? `admin-tutor-rank-badge-${rank}` : ''}`}
                        >
                            {rank}
                        </span>

                        <img
                            className="admin-tutor-rank-avatar"
                            src={tutor.avatarUrl || getFallbackAvatar(tutor.fullName)}
                            alt=""
                            loading="lazy"
                        />

                        <span className="admin-tutor-rank-name" title={tutor.fullName}>
                            {tutor.fullName}
                        </span>

                        <strong className="admin-tutor-rank-value">
                            {formatDashboardCurrency(tutor.totalRevenue)}
                        </strong>
                    </li>
                );
            })}
        </ol>
    );
};

export default TutorRevenueRanking;
