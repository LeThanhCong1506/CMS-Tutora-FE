import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockRefundRequests } from '../../../mocks/financeManagementMockData';
import type { RefundRequest } from '../../../mocks/financeManagementMockData';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import { RefundStatusBadge } from '../financeStatusBadges';

const RefundManagementTab = () => {
    const columns: DataTableColumn<RefundRequest>[] = [
        { key: 'id', title: 'Mã yêu cầu', render: (r) => <span className="admin-ui-code-chip">{r.id}</span> },
        { key: 'booking', title: 'Booking', dataIndex: 'bookingCode', hideOnMobile: true },
        {
            key: 'parties',
            title: 'Phụ huynh / Gia sư',
            render: (r) => (
                <div className="admin-ui-entity">
                    <span className="admin-ui-entity-primary">{r.parentName}</span>
                    <span className="admin-ui-entity-secondary">vs {r.tutorName}</span>
                </div>
            ),
            minWidth: 200,
        },
        { key: 'reason', title: 'Lý do', dataIndex: 'reason', minWidth: 220, hideOnMobile: true },
        { key: 'amount', title: 'Số tiền', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.amount)}</span> },
        { key: 'requestedAt', title: 'Ngày yêu cầu', render: (r) => <span className="admin-ui-table-meta">{formatDateTime(r.requestedAt)}</span>, hideOnMobile: true },
        { key: 'status', title: 'Trạng thái', render: (r) => <RefundStatusBadge status={r.status} /> },
        {
            key: 'action',
            title: 'Thao tác',
            align: 'right',
            render: (r) => (
                <button
                    type="button"
                    className="payout-row-action"
                    onClick={(e) => { e.stopPropagation(); toast.info(`Bản đề xuất — chưa nối API xử lý ${r.id}.`); }}
                >
                    Xử lý
                </button>
            ),
        },
    ];

    return (
        <div className="fin2-tab-body">
            <DataTable<RefundRequest>
                columns={columns}
                data={mockRefundRequests}
                rowKey="id"
                variant="embedded"
                density="compact"
                adaptive
                minWidth={900}
            />
        </div>
    );
};

export default RefundManagementTab;
