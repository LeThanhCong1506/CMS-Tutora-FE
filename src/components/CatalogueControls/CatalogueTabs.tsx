import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilterTabs, SectionCard } from '../../components/shared';

export interface CatalogueTab {
  to: string;
  label: string;
}

interface Props {
  tabs: CatalogueTab[];
}

export const CatalogueTabs: React.FC<Props> = ({ tabs }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeKey = tabs.find((t) => pathname.startsWith(t.to))?.to ?? tabs[0].to;

  return (
    <SectionCard>
      <div className="admin-ui-toolbar">
        <FilterTabs
          tabs={tabs.map((t) => ({ key: t.to, label: t.label }))}
          activeKey={activeKey}
          onChange={(key) => navigate(key)}
        />
      </div>
    </SectionCard>
  );
};
