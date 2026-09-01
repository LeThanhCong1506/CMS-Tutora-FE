import React from 'react';
import { PageContainer } from '../../components/shared';
import { UsageTab } from './components/UsageTab';

/**
 * Chi phí gọi Gemini
 */
const AdminAiUsagePage: React.FC = () => (
  <PageContainer
    eyebrow="Tài nguyên AI"
    eyebrowInfo="Theo dõi lượt gọi, số token và chi phí trả cho Gemini theo từng model và tính năng."
    title="Chi Phí AI"
    maxWidth="full"
  >
    <UsageTab />
  </PageContainer>
);

export default AdminAiUsagePage;
