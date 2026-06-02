import React from 'react';
import { Table, Button, Space, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { WithdrawalRequestItem } from '../../../../types/adminPayout.types';
import { formatCurrency, formatDateTime } from '../../../../utils/formatters';
import WithdrawalStatusBadge from '../../WithdrawalStatusBadge';

const { Text } = Typography;

interface Props {
    data: WithdrawalRequestItem[];
    loading: boolean;
    total: number;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number, size: number) => void;
}

const WithdrawalRequestTable: React.FC<Props> = ({
    data,
    loading,
    total,
    currentPage,
    pageSize,
    onPageChange
}) => {
    const navigate = useNavigate();

    const columns = [
        {
            title: 'Mã yêu cầu',
            dataIndex: 'withdrawalId',
            key: 'withdrawalId',
            render: (id: string) => <Text strong>#{id}</Text>,
        },
        {
            title: 'Gia sư',
            dataIndex: 'tutorName',
            key: 'tutorName',
            render: (name: string, record: WithdrawalRequestItem) => (
                <Space orientation="vertical" size={0}>
                    <Text strong>{name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.tutorEmail}</Text>
                </Space>
            ),
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount: number) => <Text strong color="blue">{formatCurrency(amount)}</Text>,
        },
        {
            title: 'Ngân hàng',
            dataIndex: 'bankName',
            key: 'bankName',
        },
        {
            title: 'Ngày yêu cầu',
            dataIndex: 'requestedAt',
            key: 'requestedAt',
            render: (date: string) => formatDateTime(date),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => <WithdrawalStatusBadge status={status} />,
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_: unknown, record: WithdrawalRequestItem) => (
                <Button
                    type="primary"
                    ghost
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/admin-portal/payouts/${record.withdrawalId}`)}
                    size="small"
                >
                    Xử lý
                </Button>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={data}
            rowKey="withdrawalId"
            loading={loading}
            size="small"
            scroll={{ x: 700 }}
            pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                onChange: onPageChange,
                showTotal: (total) => `Tổng ${total} yêu cầu`,
                size: 'small',
            }}
        />
    );
};

export default WithdrawalRequestTable;
