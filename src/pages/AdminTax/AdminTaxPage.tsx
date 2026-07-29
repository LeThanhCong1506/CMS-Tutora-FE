import { useState } from 'react';
import { FilterTabs, PageContainer, SectionCard, StatCard } from '../../components/shared';
import { mockTaxOverview } from '../../mocks/taxMockData';
import { formatCompactNumber } from '../../utils/formatters';
import TaxOverviewTab from './components/TaxOverviewTab';
import TutorTaxProfilesTab from './components/TutorTaxProfilesTab';
import TaxWithholdingTab from './components/TaxWithholdingTab';
import TaxCertificatesTab from './components/TaxCertificatesTab';
import TaxReportsTab from './components/TaxReportsTab';
import TaxConfigTab from './components/TaxConfigTab';
import '../../styles/pages/admin-tax.css';

type TaxTab = 'overview' | 'profiles' | 'withholding' | 'certificates' | 'reports' | 'config';

const taxTabs = [
    { key: 'overview', label: 'Tổng quan' },
    { key: 'profiles', label: 'Hồ sơ thuế gia sư' },
    { key: 'withholding', label: 'Khấu trừ & kê khai' },
    { key: 'certificates', label: 'Chứng từ khấu trừ' },
    { key: 'reports', label: 'Báo cáo thuế' },
    { key: 'config', label: 'Cấu hình thuế suất' },
];

const AdminTaxPage = () => {
    const [activeTab, setActiveTab] = useState<TaxTab>('overview');
    const metrics = mockTaxOverview;

    return (
        <PageContainer
            eyebrow="Mới · Bản đề xuất"
            title="Quản lý thuế gia sư"
            subtitle="Khấu trừ TNCN, hồ sơ thuế và kê khai nộp thay cho gia sư qua nền tảng — dạy học miễn thuế GTGT."
            maxWidth="wide"
        >
            <div className="admin-ui-kpi-grid">
                <StatCard
                    icon={<span className="material-symbols-outlined">receipt_long</span>}
                    value={formatCompactNumber(metrics.taxableRevenueThisMonth)}
                    label="Doanh thu chịu thuế (tháng này)"
                    subLabel={`${metrics.tutorsWithRevenueThisMonth} gia sư có phát sinh`}
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">account_balance</span>}
                    value={formatCompactNumber(metrics.totalPitWithheld)}
                    label="Đã khấu trừ TNCN"
                    subLabel="Không khấu trừ GTGT — dạy học được miễn theo luật"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">verified</span>}
                    value={`${metrics.topTutorThresholdPercent}%`}
                    label="Doanh thu cao nhất / ngưỡng miễn thuế"
                    subLabel={`Ngưỡng hiện hành ${(metrics.exemptionThreshold / 1_000_000_000).toLocaleString('vi-VN')} tỷ ₫/năm`}
                    badge="Còn xa ngưỡng"
                    badgeVariant="green"
                />
                <StatCard
                    icon={<span className="material-symbols-outlined">task_alt</span>}
                    value={metrics.lastDeclarationPeriod}
                    label="Kỳ kê khai gần nhất"
                    badge={`Đã nộp · ${formatCompactNumber(metrics.lastDeclarationAmount)}`}
                    badgeVariant="green"
                />
            </div>

            <SectionCard
                title="Khấu trừ & kê khai thuế"
                subtitle="Nộp thay TNCN cho gia sư theo doanh thu qua nền tảng (dạy học miễn thuế GTGT theo Điều 5 Luật thuế GTGT)."
                headerAction={
                    <FilterTabs
                        tabs={taxTabs}
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as TaxTab)}
                    />
                }
            >
                {activeTab === 'overview' && <TaxOverviewTab />}
                {activeTab === 'profiles' && <TutorTaxProfilesTab />}
                {activeTab === 'withholding' && <TaxWithholdingTab />}
                {activeTab === 'certificates' && <TaxCertificatesTab />}
                {activeTab === 'reports' && <TaxReportsTab />}
                {activeTab === 'config' && <TaxConfigTab />}
            </SectionCard>
        </PageContainer>
    );
};

export default AdminTaxPage;
