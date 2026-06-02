import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Breadcrumb, Card, Table, Tag, Space, Input, Select, DatePicker, Row, Col } from 'antd';
import { toast } from 'react-toastify';
import { SecurityScanOutlined, SearchOutlined } from '@ant-design/icons';
import { getFraudLogs } from '../../../services/adminPayout.service';
import type { FraudLogItem } from '../../../types/adminPayout.types';
import { formatDateTime } from '../../../utils/formatters';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const FraudLogsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<FraudLogItem[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);

    // Filters
    const [tutorId, setTutorId] = useState('');
    const [ruleName, setRuleName] = useState('');
    const [passed, setPassed] = useState<boolean | undefined>(undefined);
    const [dateRange, setDateRange] = useState<[string, string] | undefined>(undefined);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: currentPage,
                pageSize: pageSize,
                ...(tutorId && { tutorId }),
                ...(ruleName && { ruleName }),
                ...(passed !== undefined && { passed }),
                ...(dateRange && { from: dateRange[0], to: dateRange[1] })
            };
            const response = await getFraudLogs(params);
            setLogs(response.items);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch fraud logs:', error);
            toast.error('Không thể tải nhật ký an toàn');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, tutorId, ruleName, passed, dateRange]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const columns = [
        {
            title: 'Thời gian',
            dataIndex: 'checkedAt',
            key: 'checkedAt',
            render: (date: string) => formatDateTime(date),
        },
        {
            title: 'Gia sư',
            dataIndex: 'tutorName',
            key: 'tutorName',
            render: (name: string, record: FraudLogItem) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>ID: {record.tutorId}</Text>
                </Space>
            ),
        },
        {
            title: 'Quy tắc an toàn',
            dataIndex: 'ruleName',
            key: 'ruleName',
            render: (rule: string) => <Tag color="blue">{rule}</Tag>,
        },
        {
            title: 'Kết quả',
            dataIndex: 'passed',
            key: 'passed',
            render: (passed: boolean) => (
                passed ? <Tag color="success">Hợp lệ</Tag> : <Tag color="error">Cảnh báo</Tag>
            ),
        },
        {
            title: 'Thông điệp hệ thống',
            dataIndex: 'message',
            key: 'message',
            render: (msg: string) => (
                <Text style={{ fontSize: '12px' }} type={msg && msg.includes('rủi ro') ? 'danger' : 'secondary'}>
                    {msg || '---'}
                </Text>
            ),
        },
        {
            title: 'Yêu cầu liên quan',
            dataIndex: 'withdrawalRequestId',
            key: 'withdrawalRequestId',
            render: (id: number) => id ? <Space><SearchOutlined /><Text>#{id}</Text></Space> : '---',
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <Breadcrumb
                    items={[
                        { title: 'Quản trị' },
                        { title: 'Quản lý thanh toán', href: '/admin-portal/payouts' },
                        { title: 'Nhật ký an toàn (Fraud Logs)' },
                    ]}
                    style={{ marginBottom: '16px' }}
                />
                <Title level={2}>
                    <SecurityScanOutlined style={{ marginRight: '12px', color: '#ff4d4f' }} />
                    Nhật ký an toàn & Chống rủi ro (Fraud Logs)
                </Title>
                <Text type="secondary">Ghi lại toàn bộ lịch sử kiểm soát rủi ro từ hệ thống chống gian lận (Anti-Fraud Engine)</Text>
            </div>

            <Card variant="borderless" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                    <Col xs={24} md={6}>
                        <Text strong style={{ display: 'block', marginBottom: '8px' }}>Tutor ID</Text>
                        <Input
                            placeholder="Nhập Tutor ID..."
                            onChange={(e) => setTutorId(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <Text strong style={{ display: 'block', marginBottom: '8px' }}>Quy tắc</Text>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Chọn quy tắc..."
                            allowClear
                            onChange={setRuleName}
                        >
                            <Select.Option value="WITHDRAW_SPEED">Tốc độ rút tiền</Select.Option>
                            <Select.Option value="BANK_ACCOUNT_MATCH">Chủ tài khoản ngân hàng</Select.Option>
                            <Select.Option value="IP_CONSISTENCY">Địa chỉ IP</Select.Option>
                            <Select.Option value="EMAIL_VERIFIED">Email xác thực</Select.Option>
                        </Select>
                    </Col>
                    <Col xs={24} md={4}>
                        <Text strong style={{ display: 'block', marginBottom: '8px' }}>Kết quả</Text>
                        <Select
                            style={{ width: '100%' }}
                            placeholder="Tất cả"
                            allowClear
                            onChange={(val) => setPassed(val === 'true' ? true : (val === 'false' ? false : undefined))}
                        >
                            <Select.Option value="true">Hợp lệ</Select.Option>
                            <Select.Option value="false">Cảnh báo</Select.Option>
                        </Select>
                    </Col>
                    <Col xs={24} md={8}>
                        <Text strong style={{ display: 'block', marginBottom: '8px' }}>Thời gian</Text>
                        <RangePicker
                            style={{ width: '100%' }}
                            onChange={(dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    setDateRange([dates[0].toISOString(), dates[1].toISOString()]);
                                } else {
                                    setDateRange(undefined);
                                }
                            }}
                        />
                    </Col>
                </Row>
            </Card>

            <Card variant="borderless">
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="logId"
                    loading={loading}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: total,
                        onChange: (page, size) => {
                            setCurrentPage(page);
                            setPageSize(size);
                        },
                        showTotal: (total) => `Tổng cộng ${total} nhật ký`,
                    }}
                />
            </Card>
        </div>
    );
};

export default FraudLogsPage;
