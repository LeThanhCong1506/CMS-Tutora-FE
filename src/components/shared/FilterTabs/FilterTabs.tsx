import React from 'react';
import styles from './FilterTabs.module.css';

export interface TabItem {
    /** Unique key/value for this tab */
    key: string;
    /** Display label */
    label: string;
}

export interface FilterTabsProps {
    /** Array of tab items */
    tabs: TabItem[];
    /** Currently active tab key */
    activeKey: string;
    /** Called when a tab is clicked */
    onChange: (key: string) => void;
    /** Custom className */
    className?: string;
}

/**
 * Reusable tab group component for filtering content views.
 * Design based on TutorPortal's ".tabGroup / .tabBtn" pattern.
 *
 * Usage:
 * ```tsx
 * <FilterTabs
 *   tabs={[
 *     { key: 'today', label: 'Hôm nay' },
 *     { key: 'week', label: 'Tuần' },
 *   ]}
 *   activeKey={selectedTab}
 *   onChange={setSelectedTab}
 * />
 * ```
 */
const FilterTabs: React.FC<FilterTabsProps> = ({
    tabs,
    activeKey,
    onChange,
    className,
}) => {
    return (
        <div className={`${styles.tabGroup} ${className || ''}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    className={`${styles.tabBtn} ${activeKey === tab.key ? styles.active : ''}`}
                    onClick={() => onChange(tab.key)}
                    type="button"
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default FilterTabs;
