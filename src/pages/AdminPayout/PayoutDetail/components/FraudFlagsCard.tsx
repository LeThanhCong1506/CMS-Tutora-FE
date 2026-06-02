import React from 'react';
import { Card, Typography, List, Empty, Space } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Props {
    flags: string[];
    loading: boolean;
}

const FraudFlagsCard: React.FC<Props> = ({ flags, loading }) => {
    return (
        <Card
            title={
                <Space>
                    <WarningOutlined style={{ color: flags.length > 0 ? '#ff4d4f' : '#52c41a' }} />
                    <span>Cảnh báo rủi ro ({flags.length})</span>
                </Space>
            }
            loading={loading}
            className={flags.length > 0 ? 'fraud-card-warning' : ''}
        >
            {flags.length === 0 ? (
                <Empty
                    description="Không phát hiện rủi ro bất thường"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            ) : (
                <List
                    dataSource={flags}
                    renderItem={(flag) => (
                        <div className="fraud-flag-item">
                            <WarningOutlined className="fraud-flag-icon" />
                            <Text style={{ color: '#820014' }}>{flag}</Text>
                        </div>
                    )}
                />
            )}
        </Card>
    );
};

export default FraudFlagsCard;
