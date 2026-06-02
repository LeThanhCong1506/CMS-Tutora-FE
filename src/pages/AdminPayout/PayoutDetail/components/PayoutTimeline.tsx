import React from 'react';
import { Card, Space, Typography } from 'antd';
import {
    HistoryOutlined
} from '@ant-design/icons';
import type { TimelineEvent } from '../../../../types/adminPayout.types';
import { formatDateTime } from '../../../../utils/formatters';

const { Text } = Typography;

interface Props {
    events: TimelineEvent[];
    loading: boolean;
}

const PayoutTimeline: React.FC<Props> = ({ events, loading }) => {
    if (events.length === 0 && !loading) {
        return (
            <Card title="Lịch sử xử lý">
                <Text type="secondary">Chưa có dữ liệu lịch sử</Text>
            </Card>
        );
    }

    return (
        <Card
            title={
                <Space>
                    <HistoryOutlined />
                    <span>Lịch sử xử lý</span>
                </Space>
            }
            loading={loading}
        >
            <div className="payout-timeline">
                {events.map((event, index) => (
                    <div key={index} style={{ marginBottom: '20px', borderLeft: '2px solid #f0f0f0', paddingLeft: '20px', position: 'relative' }}>
                        <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: index === 0 ? '#1890ff' : '#d9d9d9',
                            position: 'absolute',
                            left: '-7px',
                            top: '5px'
                        }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <Text strong>{event.event}</Text>
                            <Text type="secondary" style={{ fontSize: '12px' }}>{formatDateTime(event.timestamp)}</Text>
                        </div>
                        {event.details && (
                            <Text type="secondary" style={{ fontSize: '13px', display: 'block' }}>
                                {event.details}
                            </Text>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default PayoutTimeline;
