import { StatusBadge } from '../../components/shared';
import type { StatusVariant } from '../../components/shared';
import type { DeclarationStatus } from '../../mocks/taxMockData';

const LABELS: Record<DeclarationStatus, string> = {
    draft: 'Nháp',
    declared: 'Đã kê khai',
    submitted: 'Đã nộp',
};

const VARIANTS: Record<DeclarationStatus, StatusVariant> = {
    draft: 'neutral',
    declared: 'info',
    submitted: 'success',
};

const DeclarationStatusBadge = ({ status }: { status: DeclarationStatus }) => (
    <StatusBadge variant={VARIANTS[status]} shape="tag">{LABELS[status]}</StatusBadge>
);

export default DeclarationStatusBadge;
