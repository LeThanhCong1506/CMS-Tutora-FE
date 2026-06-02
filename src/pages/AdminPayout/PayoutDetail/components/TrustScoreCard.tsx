import React from 'react';
import { Card, Typography, Progress, Space, Divider, Tag } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import type { ScoreBreakdown } from '../../../../types/adminPayout.types';
import { formatTrustScore } from '../../../../utils/formatters';

const { Text, Title } = Typography;

interface Props {
    scoreData: ScoreBreakdown | null;
    loading: boolean;
}

const TrustScoreCard: React.FC<Props> = ({ scoreData, loading }) => {
    const trustInfo = formatTrustScore(scoreData?.totalScore || 0);

    return (
        <Card
            title={
                <Space>
                    <SafetyCertificateOutlined style={{ color: trustInfo.color }} />
                    <span>Điểm tin cậy & Hệ thống xét duyệt</span>
                </Space>
            }
            loading={loading}
        >
            <div className="trust-score-gauge">
                <Progress
                    type="dashboard"
                    percent={scoreData?.totalScore || 0}
                    strokeColor={trustInfo.color}
                    format={(percent) => (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{percent}</span>
                            <span style={{ fontSize: '12px', color: 'rgba(0,0,0,0.45)' }}>Điểm</span>
                        </div>
                    )}
                />
                <div style={{ marginTop: '8px' }}>
                    <Tag color={trustInfo.color} style={{ fontSize: '14px', padding: '4px 12px' }}>
                        {trustInfo.label}
                    </Tag>
                </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <Title level={5}>Gợi ý hệ thống: <Text strong style={{ color: trustInfo.color }}>{scoreData?.decision || 'MANUAL_REVIEW'}</Text></Title>

            <div style={{ marginTop: '16px' }}>
                <Text type="secondary" style={{ fontSize: '13px' }}>Các yếu tố tích cực:</Text>
                <div style={{ marginTop: '4px', marginBottom: '12px' }}>
                    {scoreData?.positiveFactors.map((f, i) => (
                        <Tag key={i} color="success" style={{ marginBottom: '4px' }}>+ {f}</Tag>
                    )) || <Text type="secondary">Không có</Text>}
                </div>

                <Text type="secondary" style={{ fontSize: '13px' }}>Các yếu tố rủi ro:</Text>
                <div style={{ marginTop: '4px' }}>
                    {scoreData?.negativeFactors.map((f, i) => (
                        <Tag key={i} color="error" style={{ marginBottom: '4px' }}>- {f}</Tag>
                    )) || <Text type="secondary">Không có</Text>}
                </div>
            </div>
        </Card>
    );
};

export default TrustScoreCard;
