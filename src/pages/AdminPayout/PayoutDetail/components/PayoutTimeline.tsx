import React from 'react';
import { SectionCard } from '../../../../components/shared';
import type { TimelineEvent } from '../../../../types/adminPayout.types';
import { formatDateTime } from '../../../../utils/formatters';

interface Props {
    events: TimelineEvent[];
    loading: boolean;
}

const PayoutTimeline: React.FC<Props> = ({ events, loading }) => {
    return (
        <SectionCard
            title="Lịch sử xử lý"
            subtitle="Timeline các bước hệ thống và admin đã thực hiện trên yêu cầu này."
            padded
        >
            {loading ? (
                <div className="admin-ui-muted-state">Đang tải lịch sử...</div>
            ) : events.length === 0 ? (
                <div className="admin-ui-muted-state">Chưa có dữ liệu lịch sử</div>
            ) : (
                <div className="payout-timeline">
                    {events.map((event, index) => (
                        <div className="payout-timeline-item" key={`${event.timestamp}-${event.event}-${index}`}>
                            <span className={`payout-timeline-dot ${index === 0 ? 'active' : ''}`} />
                            <div className="payout-timeline-content">
                                <div className="payout-timeline-header">
                                    <strong>{event.event}</strong>
                                    <span>{formatDateTime(event.timestamp)}</span>
                                </div>
                                {event.details && <p>{event.details}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </SectionCard>
    );
};

export default PayoutTimeline;
