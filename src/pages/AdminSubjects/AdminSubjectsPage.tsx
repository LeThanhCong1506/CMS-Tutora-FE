import React from 'react';
import { useLocation } from 'react-router-dom';
import { PageContainer } from '../../components/shared';
import { CatalogueTabs } from '../../components/CatalogueControls';
import { SubjectsTab } from './components/SubjectsTab';
import { GradeLevelsTab } from './components/GradeLevelsTab';

const SUBJECTS_PATH = '/admin-portal/resources/subjects';
const GRADES_PATH = '/admin-portal/resources/grade-levels';

const SubjectsGradesPage: React.FC = () => {
  const { pathname } = useLocation();
  const isGrades = pathname.startsWith(GRADES_PATH);

  return (
    <PageContainer
      title="Môn học & Khối lớp"
      subtitle="Danh mục nền của hệ thống — dùng cho hồ sơ gia sư, đặt lịch và ngân hàng câu hỏi."
      maxWidth="wide"
    >
      <div className="space-y-4">
        <CatalogueTabs
          tabs={[
            { to: SUBJECTS_PATH, label: 'Môn học' },
            { to: GRADES_PATH, label: 'Khối lớp' },
          ]}
        />
        {isGrades ? <GradeLevelsTab /> : <SubjectsTab />}
      </div>
    </PageContainer>
  );
};

export default SubjectsGradesPage;
