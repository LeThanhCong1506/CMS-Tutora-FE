import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { PageContainer } from '@/components/shared';
import { RANGE_PRESETS, useRevenueRange } from '@/hooks/useRevenueReport';
import OverviewTab from './tabs/OverviewTab';
import RecognitionTab from './tabs/RecognitionTab';
import TutorsTab from './tabs/TutorsTab';
import CustomersTab from './tabs/CustomersTab';
import SubjectsTab from './tabs/SubjectsTab';
import AiTab from './tabs/AiTab';
import '@/styles/pages/admin-revenue-reports.css';

const BASE = '/admin-portal/revenue-reports';

// Mỗi tab là một sub-route thật
const TABS = [
    { slug: 'overview', label: 'Tổng quan', icon: 'donut_large' },
    { slug: 'recognition', label: 'Ghi nhận doanh thu', icon: 'fact_check' },
    { slug: 'tutors', label: 'Gia sư', icon: 'cast_for_education' },
    { slug: 'customers', label: 'Khách hàng', icon: 'family_restroom' },
    { slug: 'subjects', label: 'Môn & Lớp', icon: 'category' },
    { slug: 'ai', label: 'Doanh thu AI', icon: 'smart_toy' },
] as const;

type TabSlug = (typeof TABS)[number]['slug'];

const tabSubtitle: Record<TabSlug, string> = {
    overview: 'Ba tầng số liệu GMV / doanh thu thuần / tiền mặt và độ lệch giữa hai cách ghi nhận.',
    recognition: 'Đối chiếu tiền đã thu, doanh thu đã ghi nhận và phần chưa thực hiện.',
    tutors: 'Ai mang lại doanh thu, ai đang giữ escrow lớn, mức độ tập trung rủi ro.',
    customers: 'Chi tiêu, giữ chân và giá trị của phụ huynh và học sinh tự do.',
    subjects: 'Doanh thu theo ngách sản phẩm — môn học và khối lớp.',
    ai: 'Bán gói lượt AI hỗ trợ giải bài tập và lượng lượt còn lại chưa dùng.',
};

const AdminRevenueReportsPage = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { preset, setPreset, range } = useRevenueRange();

    const segment = location.pathname.replace(`${BASE}`, '').replace(/^\//, '');
    const active: TabSlug = (TABS.find((t) => t.slug === segment)?.slug ?? 'overview');

    // Giữ nguyên query khi đổi tab để không mất khoảng thời gian đang xem
    const linkTo = (slug: TabSlug) => {
        const qs = searchParams.toString();
        return `${BASE}/${slug}${qs ? `?${qs}` : ''}`;
    };

    return (
        <PageContainer
            title="Báo cáo doanh thu"
            subtitle={tabSubtitle[active]}
            maxWidth="wide"
        >
            <div className="rev-toolbar">
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

                <div className="rev-range" role="group" aria-label="Khoảng thời gian">
                    {RANGE_PRESETS.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            aria-pressed={preset === p.key}
                            className={preset === p.key ? 'is-active' : ''}
                            onClick={() => setPreset(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {active === 'overview' && <OverviewTab range={range} />}
            {active === 'recognition' && <RecognitionTab range={range} />}
            {active === 'tutors' && <TutorsTab range={range} />}
            {active === 'customers' && <CustomersTab range={range} />}
            {active === 'subjects' && <SubjectsTab range={range} />}
            {active === 'ai' && <AiTab range={range} />}
        </PageContainer>
    );
};

export default AdminRevenueReportsPage;
