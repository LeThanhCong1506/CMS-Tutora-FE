import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockTaxDeclarations, mockWithholdingRecords } from '../../../mocks/taxMockData';
import type { TaxDeclarationPeriod, TaxWithholdingRecord } from '../../../mocks/taxMockData';
import { formatCompactNumber, formatCurrency } from '../../../utils/formatters';
import DeclarationStatusBadge from '../DeclarationStatusBadge';

const declarationColumns: DataTableColumn<TaxDeclarationPeriod>[] = [
    { key: 'period', title: 'Kỳ', dataIndex: 'periodLabel', minWidth: 140 },
    {
        key: 'revenue',
        title: 'Doanh thu chịu thuế',
        align: 'right',
        render: (r) => <span className="admin-ui-amount">{formatCompactNumber(r.taxableRevenue)}</span>,
    },
    {
        key: 'pit',
        title: 'TNCN (2%)',
        align: 'right',
        render: (r) => <span className="admin-ui-amount">{formatCompactNumber(r.pitAmount)}</span>,
    },
    { key: 'status', title: 'Trạng thái', render: (r) => <DeclarationStatusBadge status={r.status} /> },
    {
        key: 'action',
        title: 'Thao tác',
        align: 'right',
        render: () => (
            <button
                type="button"
                className="payout-row-action"
                onClick={(e) => {
                    e.stopPropagation();
                    toast.info('Bản đề xuất — chưa nối API xuất file kê khai.');
                }}
            >
                <span className="payout-row-action__label">Xuất file</span>
                <span className="material-symbols-outlined" aria-hidden="true">download</span>
            </button>
        ),
    },
];

const withholdingColumns: DataTableColumn<TaxWithholdingRecord>[] = [
    { key: 'booking', title: 'Mã booking', render: (r) => <span className="admin-ui-code-chip">{r.bookingCode}</span> },
    { key: 'tutor', title: 'Gia sư', dataIndex: 'tutorName' },
    { key: 'gross', title: 'Gross', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.grossAmount)}</span> },
    { key: 'platformFee', title: 'Phí nền tảng', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.platformFeeAmount)}</span> },
    { key: 'pit', title: 'TNCN (2%)', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.pitAmount)}</span> },
    { key: 'net', title: 'Net', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.netAmount)}</span> },
];

const TaxWithholdingTab = () => {
    const current = mockWithholdingRecords[0];
    const { grossAmount: gross, platformFeeAmount: platformFee, pitAmount: pit } = current;
    const net = gross - platformFee - pit;

    return (
        <div className="tax-withholding-stack">
            <div>
                <div className="tax-withholding-head">
                    <h4>Kỳ kê khai thuế</h4>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-primary"
                        onClick={() => toast.info('Bản đề xuất — chưa nối API tạo lô kê khai.')}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">add</span>
                        Tạo lô kê khai mới
                    </button>
                </div>
                <p className="tax-config-hint">Chỉ có TNCN — dạy học/gia sư miễn thuế GTGT theo Điều 5 Luật thuế GTGT.</p>
                <DataTable<TaxDeclarationPeriod>
                    columns={declarationColumns}
                    data={mockTaxDeclarations}
                    rowKey="id"
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={640}
                />
            </div>

            <div>
                <h4>Chi tiết khấu trừ — {mockTaxDeclarations[0].periodLabel}</h4>
                <div className="tax-waterfall">
                    <div className="tax-waterfall-step">
                        <span className="tax-waterfall-label">Doanh thu gộp</span>
                        <strong>{formatCurrency(gross)}</strong>
                    </div>
                    <span className="tax-waterfall-arrow">→</span>
                    <div className="tax-waterfall-step">
                        <span className="tax-waterfall-label">TNCN (2% trên doanh thu gộp)</span>
                        <strong className="minus">−{formatCurrency(pit)}</strong>
                    </div>
                    <span className="tax-waterfall-arrow">→</span>
                    <div className="tax-waterfall-step">
                        <span className="tax-waterfall-label">Phí nền tảng (5%)</span>
                        <strong className="minus">−{formatCurrency(platformFee)}</strong>
                    </div>
                    <span className="tax-waterfall-arrow">→</span>
                    <div className="tax-waterfall-step">
                        <span className="tax-waterfall-label">Thực nhận</span>
                        <strong className="plus">{formatCurrency(net)}</strong>
                    </div>
                </div>
                <DataTable<TaxWithholdingRecord>
                    columns={withholdingColumns}
                    data={mockWithholdingRecords}
                    rowKey="id"
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={760}
                />
            </div>
        </div>
    );
};

export default TaxWithholdingTab;
