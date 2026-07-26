import React from 'react';
import { useLocation } from 'react-router-dom';
import { PageContainer } from '../../components/shared';
import { CatalogueTabs } from '../../components/CatalogueControls';
import { PackagesTab } from './components/PackagesTab';
import { BookingBonusTab } from './components/BookingBonusTab';

const PACKAGES_PATH = '/admin-portal/ai-credit/packages';
const SETTINGS_PATH = '/admin-portal/ai-credit/settings';

const AdminAiCreditPage: React.FC = () => {
  const { pathname } = useLocation();
  const isSettings = pathname.startsWith(SETTINGS_PATH);

  return (
    <PageContainer
      title="Gói & Hạn Mức AI Credit"
      subtitle="Quản lý gói hạn mức cho AI Giải bài tập và cấu hình thưởng tặng kèm khi có đặt gia sư."
      maxWidth="full"
    >
      <div className="space-y-4">
        <CatalogueTabs
          tabs={[
            { to: PACKAGES_PATH, label: 'Gói Sử Dụng' },
            { to: SETTINGS_PATH, label: 'Thưởng Đặt Lịch' },
          ]}
        />
        {isSettings ? <BookingBonusTab /> : <PackagesTab />}
      </div>
    </PageContainer>
  );
};

export default AdminAiCreditPage;
