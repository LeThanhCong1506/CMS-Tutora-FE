import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
    FileTextOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    AlertOutlined,
    DollarOutlined,
    PauseCircleOutlined,
} from '@ant-design/icons';
import type { PayoutOverview } from '../../../../types/adminPayout.types';
import { formatCurrency } from '../../../../utils/formatters';

interface Props {
    overview: PayoutOverview | null;
    loading: boolean;
}

const PayoutStatsCards: React.FC<Props> = ({ overview, loading }) => {
    const todayStats = overview?.todayStats;
    const processingStats = overview?.processingStats;
    const financialStats = overview?.financialStats;

    return (
        <div style={{ marginBottom: '24px' }}>
            {/* Row 1: Thống kê hôm nay */}
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                <Col xs={12} sm={12} lg={6}>
                    <Card loading={loading} hoverable size="small">
                        <Statistic
                            title="Yêu cầu tháng này"
                            value={todayStats?.totalRequests || 0}
                            prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                            styles={{ content: { color: '#1890ff' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <Card loading={loading} hoverable size="small">
                        <Statistic
                            title="Tự động duyệt"
                            value={todayStats?.autoApproved || 0}
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            styles={{ content: { color: '#52c41a' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <Card loading={loading} hoverable size="small">
                        <Statistic
                            title="Đang tạm giữ"
                            value={todayStats?.delayed || 0}
                            prefix={<PauseCircleOutlined style={{ color: '#faad14' }} />}
                            styles={{ content: { color: '#faad14' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <Card loading={loading} hoverable size="small">
                        <Statistic
                            title="Chờ xét duyệt thủ công"
                            value={todayStats?.manualReview || 0}
                            prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />}
                            styles={{ content: { color: '#ff4d4f' } }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Row 2: Tài chính & xử lý */}
            <Row gutter={[16, 16]}>
                <Col xs={12} sm={12} lg={6}>
                    <Card loading={loading} hoverable size="small">
                        <Statistic
                            title="Chờ xử lý"
                            value={processingStats?.pendingCount || 0}
                            prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                            styles={{ content: { color: '#faad14' } }}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <Card loading={loading} hoverable size="small">
                        <Statistic
                            title="Tỷ lệ thành công"
                            value={processingStats?.successRate?.toFixed(1) || '0'}
                            suffix="%"
                            prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <Card loading={loading} hoverable size="small">
                        <Statistic
                            title="Tổng chi tháng này"
                            value={formatCurrency(financialStats?.totalPayoutToday || 0)}
                            prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={12} lg={6}>
                    <Card loading={loading} hoverable size="small">
                        <Statistic
                            title="Tổng chi tháng này"
                            value={formatCurrency(financialStats?.totalPayoutThisMonth || 0)}
                            prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                            styles={{ content: { color: '#52c41a' } }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default PayoutStatsCards;
