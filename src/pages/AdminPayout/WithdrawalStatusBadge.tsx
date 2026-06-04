import React from 'react';
import { StatusBadge } from '../../components/shared';
import type { StatusVariant } from '../../components/shared';
import { formatWithdrawalStatusV2 } from '../../utils/formatters';

interface Props {
    status: string;
}

const getStatusVariant = (status: string): StatusVariant => {
    switch (status.toLowerCase()) {
        case 'pending':
        case 'pending_review':
        case 'delayed':
            return 'warning';
        case 'approved':
        case 'processing':
            return 'info';
        case 'completed':
            return 'success';
        case 'rejected':
            return 'error';
        case 'cancelled':
        default:
            return 'neutral';
    }
};

/**
 * Status badge cho withdrawal request.
 * Repo gốc đặt ở `pages/TutorFinance/WithdrawalList/components/`; admin repo
 * không có TutorFinance → relocate vào AdminPayout root.
 */
const WithdrawalStatusBadge: React.FC<Props> = ({ status }) => {
    const label = formatWithdrawalStatusV2(status);

    return <StatusBadge variant={getStatusVariant(status)} shape="tag">{label}</StatusBadge>;
};

export default WithdrawalStatusBadge;
