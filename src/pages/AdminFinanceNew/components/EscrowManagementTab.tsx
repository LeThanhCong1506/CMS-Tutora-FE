import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockEscrowBookings } from '../../../mocks/financeManagementMockData';
import type { EscrowBooking } from '../../../mocks/financeManagementMockData';
import { formatCurrency } from '../../../utils/formatters';
import { EscrowStatusBadge } from '../financeStatusBadges';

const EscrowManagementTab = () => {
    const columns: DataTableColumn<EscrowBooking>[] = [
        { key: 'booking', title: 'Mã booking', render: (r) => <span className="admin-ui-code-chip">{r.bookingCode}</span> },
        { key: 'tutor', title: 'Gia sư', dataIndex: 'tutorName' },
        { key: 'parent', title: 'Phụ huynh', dataIndex: 'parentName', hideOnMobile: true },
        { key: 'amount', title: 'Số tiền', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.amount)}</span> },
        {
            key: 'held',
            title: 'Đã giữ',
            align: 'right',
            render: (r) => <span className={r.heldSinceDays > 7 ? 'fin2-danger-text' : 'admin-ui-table-meta'}>{r.heldSinceDays} ngày</span>,
        },
        { key: 'status', title: 'Trạng thái', render: (r) => <EscrowStatusBadge status={r.status} /> },
        {
            key: 'action',
            title: 'Thao tác',
            align: 'right',
            render: (r) => (
                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        className="payout-row-action"
                        onClick={(e) => { e.stopPropagation(); toast.info(`Bản đề xuất — chưa nối API giải ngân ${r.bookingCode}.`); }}
                    >
                        Giải ngân
                    </button>
                    <button
                        type="button"
                        className="payout-row-action"
                        onClick={(e) => { e.stopPropagation(); toast.info(`Bản đề xuất — chưa nối API hoàn tiền ${r.bookingCode}.`); }}
                    >
                        Hoàn tiền
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="fin2-tab-body">
            <DataTable<EscrowBooking>
                columns={columns}
                data={mockEscrowBookings}
                rowKey="bookingCode"
                variant="embedded"
                density="compact"
                adaptive
                minWidth={820}
            />
        </div>
    );
};

export default EscrowManagementTab;
