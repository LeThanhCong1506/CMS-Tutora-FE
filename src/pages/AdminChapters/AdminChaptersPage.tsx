import React from 'react';
import { useLocation } from 'react-router-dom';
import { PageContainer } from '../../components/shared';
import { CatalogueTabs } from '../../components/CatalogueControls';
import { ChaptersTab } from './components/ChaptersTab';
import { QuestionTypesTab } from './components/QuestionTypesTab';

const CHAPTERS_PATH = '/admin-portal/resources/chapters';
const TYPES_PATH = '/admin-portal/resources/question-types';

const ChaptersTypesPage: React.FC = () => {
  const { pathname } = useLocation();
  const isTypes = pathname.startsWith(TYPES_PATH);

  return (
    <PageContainer
      title="Chương học & Loại câu hỏi"
      subtitle="Phân loại dùng cho ngân hàng câu hỏi — chương gắn theo cặp môn học và khối lớp."
      maxWidth="wide"
    >
      <div className="space-y-4">
        <CatalogueTabs
          tabs={[
            { to: CHAPTERS_PATH, label: 'Chương học' },
            { to: TYPES_PATH, label: 'Loại câu hỏi' },
          ]}
        />
        {isTypes ? <QuestionTypesTab /> : <ChaptersTab />}
      </div>
    </PageContainer>
  );
};

export default ChaptersTypesPage;
