import { Navigate, NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/shared';
import { useRevenueRange } from '@/hooks/useRevenueReport';
import DashboardRangePicker from '@/pages/AdminDashboard/components/DashboardRangePicker';
import RevenueTab from './tabs/RevenueTab';
import TutorsTab from './tabs/TutorsTab';
import CustomersTab from './tabs/CustomersTab';
import SubjectsTab from './tabs/SubjectsTab';
import AiTab from './tabs/AiTab';
import '@/styles/pages/admin-revenue-reports.css';

const BASE = '/admin-portal/revenue-reports';

// Mỗi tab là một sub-route thật
const TABS = [
    { slug: 'overview', label: 'Doanh thu', icon: 'donut_large' },
    { slug: 'tutors', label: 'Gia sư', icon: 'cast_for_education' },
    { slug: 'customers', label: 'Khách hàng', icon: 'family_restroom' },
    { slug: 'subjects', label: 'Môn & Lớp', icon: 'category' },
    { slug: 'ai', label: 'Doanh thu AI', icon: 'smart_toy' },
] as const;

type TabSlug = (typeof TABS)[number]['slug'];

/** Tab cũ đã gộp vào "Doanh thu". Giữ để link và bookmark cũ không rơi vào trang trống. */
const MERGED_AWAY = ['recognition'];

const tabSubtitle: Record<TabSlug, string> = {
    overview: 'Tiền vào chia cho ai, bao nhiêu đã thành doanh thu, và rủi ro đang treo ở đâu.',
    tutors: 'Doanh thu theo gia sư và mức độ tập trung rủi ro.',
    customers: 'Chi tiêu, giữ chân và giá trị khách hàng.',
    subjects: 'Doanh thu theo môn học và khối lớp.',
    ai: 'Doanh số gói AI và mức độ sử dụng.',
};

const AdminRevenueReportsPage = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { selection, setSelection, range } = useRevenueRange();

    const segment = location.pathname.replace(`${BASE}`, '').replace(/^\//, '');
    const active: TabSlug = (TABS.find((t) => t.slug === segment)?.slug ?? 'overview');

    // Giữ nguyên query khi đổi tab để không mất khoảng thời gian đang xem
    const linkTo = (slug: TabSlug) => {
        const qs = searchParams.toString();
        return `${BASE}/${slug}${qs ? `?${qs}` : ''}`;
    };

    // Chuyển hướng có mang theo query: đổi URL mà mất khoảng thời gian đang xem thì người dùng
    // mở lại bookmark sẽ thấy số liệu của một kỳ khác hẳn.
    if (MERGED_AWAY.includes(segment)) {
        return <Navigate to={linkTo('overview')} replace />;
    }

    return (
        <PageContainer
            eyebrow="Báo cáo"
            eyebrowInfo={tabSubtitle[active]}
            title="Báo cáo doanh thu"
            maxWidth="wide"
            // Hàng tiêu đề chỉ chứa bộ chọn thời gian. Từng thử nhét cả thanh tab vào đây để
            // tiết kiệm một hàng, nhưng nhìn thật thì hỏng: tab và các nút chọn kỳ đều là pill
            // cùng cỡ, xếp liền nhau thì mắt đọc thành MỘT dải chín nút, không còn thấy đó là
            // hai nhóm điều khiển làm hai việc khác hẳn nhau. Đổi một hàng bố cục lấy sự rõ
            // ràng đó là đáng.
            headerAction={<DashboardRangePicker selection={selection} onChange={setSelection} />}
        >
            {/* `.rev-tabs` tự bám mép trái bằng `align-self` nên không cần <div> bọc. Bản trước
                có một lớp bọc thừa với `justify-content: space-between` cho đúng MỘT phần tử
                con — tàn dư từ thời bộ chọn kỳ còn nằm chung hàng. */}
            <nav className="rev-tabs" aria-label="Nhóm báo cáo">
                {TABS.map((t) => (
                    <NavLink
                        key={t.slug}
                        to={linkTo(t.slug)}
                        className={t.slug === active ? 'is-active' : ''}
                    >
                        <span className="material-symbols-outlined">{t.icon}</span>
                        {t.label}
                    </NavLink>
                ))}
            </nav>

            {active === 'overview' && <RevenueTab range={range} />}
            {active === 'tutors' && <TutorsTab range={range} />}
            {active === 'customers' && <CustomersTab range={range} />}
            {active === 'subjects' && <SubjectsTab range={range} />}
            {active === 'ai' && <AiTab range={range} />}
        </PageContainer>
    );
};

export default AdminRevenueReportsPage;
