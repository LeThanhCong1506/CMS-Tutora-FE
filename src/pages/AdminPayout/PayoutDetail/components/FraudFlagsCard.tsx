import React from 'react';
import { SectionCard, StatusBadge } from '../../../../components/shared';

interface Props {
    flags: string[];
    loading: boolean;
}

const FraudFlagsCard: React.FC<Props> = ({ flags, loading }) => {
    return (
        <SectionCard
            title="Cảnh báo rủi ro"
            subtitle="Các rule chống gian lận đang ảnh hưởng tới yêu cầu này."
            headerAction={
                <StatusBadge variant={flags.length > 0 ? 'error' : 'success'} shape="tag">
                    {flags.length} flags
                </StatusBadge>
            }
            padded
        >
            {loading ? (
                <div className="admin-ui-muted-state">Đang tải cảnh báo...</div>
            ) : flags.length === 0 ? (
                <div className="payout-empty-state">
                    <span className="material-symbols-outlined">verified_user</span>
                    <p>Không phát hiện rủi ro bất thường</p>
                </div>
            ) : (
                <div className="payout-fraud-list">
                    {flags.map((flag) => (
                        <div className="fraud-flag-item" key={flag}>
                            <span className="material-symbols-outlined fraud-flag-icon">warning</span>
                            <span>{flag}</span>
                        </div>
                    ))}
                </div>
            )}
        </SectionCard>
    );
};

export default FraudFlagsCard;
