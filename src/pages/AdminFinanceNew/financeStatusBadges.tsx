import { StatusBadge } from '../../components/shared';
import type { StatusVariant } from '../../components/shared';
import type { EscrowStatus, RefundStatus } from '../../mocks/financeManagementMockData';

const ESCROW_LABELS: Record<EscrowStatus, string> = {
    holding: 'Đang giữ',
    partially_released: 'Đã giải ngân 1 phần',
    stuck: 'Treo quá hạn',
};
const ESCROW_VARIANTS: Record<EscrowStatus, StatusVariant> = {
    holding: 'info',
    partially_released: 'warning',
    stuck: 'error',
};
export const EscrowStatusBadge = ({ status }: { status: EscrowStatus }) => (
    <StatusBadge variant={ESCROW_VARIANTS[status]} shape="tag">{ESCROW_LABELS[status]}</StatusBadge>
);

const REFUND_LABELS: Record<RefundStatus, string> = {
    pending: 'Chờ xử lý',
    investigating: 'Đang điều tra',
    approved: 'Đã hoàn tiền',
    rejected: 'Từ chối',
};
const REFUND_VARIANTS: Record<RefundStatus, StatusVariant> = {
    pending: 'warning',
    investigating: 'info',
    approved: 'success',
    rejected: 'error',
};
export const RefundStatusBadge = ({ status }: { status: RefundStatus }) => (
    <StatusBadge variant={REFUND_VARIANTS[status]} shape="tag">{REFUND_LABELS[status]}</StatusBadge>
);
