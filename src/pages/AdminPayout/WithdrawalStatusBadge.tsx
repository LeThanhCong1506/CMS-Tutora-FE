import React from 'react';
import { Tag } from 'antd';
import {
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    SyncOutlined,
    StopOutlined,
} from '@ant-design/icons';
import { formatWithdrawalStatusV2 } from '../../utils/formatters';

interface Props {
    status: string;
}

/**
 * Status badge cho withdrawal request.
 * Repo gốc đặt ở `pages/TutorFinance/WithdrawalList/components/`; admin repo
 * không có TutorFinance → relocate vào AdminPayout root.
 */
const WithdrawalStatusBadge: React.FC<Props> = ({ status }) => {
    const label = formatWithdrawalStatusV2(status);

    const lowerStatus = status.toLowerCase();

    switch (lowerStatus) {
        case 'pending':
        case 'pending_review':
            return <Tag icon={<ClockCircleOutlined />} color="warning">{label}</Tag>;
        case 'approved':
        case 'processing':
            return <Tag icon={<SyncOutlined spin />} color="processing">{label}</Tag>;
        case 'completed':
            return <Tag icon={<CheckCircleOutlined />} color="success">{label}</Tag>;
        case 'rejected':
            return <Tag icon={<CloseCircleOutlined />} color="error">{label}</Tag>;
        case 'cancelled':
            return <Tag icon={<StopOutlined />} color="default">{label}</Tag>;
        case 'delayed':
            return <Tag icon={<ClockCircleOutlined />} color="orange">{label}</Tag>;
        default:
            return <Tag>{label}</Tag>;
    }
};

export default WithdrawalStatusBadge;
