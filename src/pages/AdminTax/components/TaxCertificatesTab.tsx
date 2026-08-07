import { useState } from 'react';
import { toast } from 'react-toastify';
import { DataTable, StatusBadge } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockWithholdingCertificates } from '../../../mocks/taxMockData';
import type { TaxWithholdingCertificate } from '../../../mocks/taxMockData';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';

const periods = Array.from(new Set(mockWithholdingCertificates.map((c) => c.periodLabel)));

const TaxCertificatesTab = () => {
    const [periodFilter, setPeriodFilter] = useState<string>(periods[0]);
    const [selected, setSelected] = useState<TaxWithholdingCertificate>(
        mockWithholdingCertificates.find((c) => c.periodLabel === periods[0]) ?? mockWithholdingCertificates[0]
    );

    const filtered = mockWithholdingCertificates.filter((c) => c.periodLabel === periodFilter);
    const notIssuedCount = filtered.filter((c) => c.status === 'not_issued').length;

    const columns: DataTableColumn<TaxWithholdingCertificate>[] = [
        { key: 'tutor', title: 'Gia sư', dataIndex: 'tutorName', minWidth: 160 },
        {
            key: 'identity',
            title: 'CCCD',
            render: (r) => r.identityNumber
                ? <span className="admin-ui-code-chip">{r.identityNumber}</span>
                : <span className="admin-ui-table-meta">—</span>,
        },
        { key: 'revenue', title: 'Doanh thu chịu thuế', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.taxableRevenue)}</span> },
        { key: 'pit', title: 'TNCN', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.pitWithheld)}</span> },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (r) => (
                <StatusBadge variant={r.status === 'issued' ? 'success' : 'neutral'} shape="tag">
                    {r.status === 'issued' ? 'Đã cấp' : 'Chưa cấp'}
                </StatusBadge>
            ),
        },
    ];

    return (
        <div className="tax-profiles-layout">
            <div>
                <div className="toolbar-row">
                    <label className="financial-filter-field" style={{ minWidth: 200 }}>
                        <span>Kỳ</span>
                        <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                            {periods.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </label>
                    <div style={{ flex: 1 }} />
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-primary"
                        disabled={notIssuedCount === 0}
                        onClick={() => toast.info(`Bản đề xuất — chưa nối API cấp hàng loạt ${notIssuedCount} chứng từ.`)}
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">workspace_premium</span>
                        Cấp hàng loạt ({notIssuedCount} chưa cấp)
                    </button>
                </div>
                <DataTable<TaxWithholdingCertificate>
                    columns={columns}
                    data={filtered}
                    rowKey="id"
                    onRowClick={(record) => setSelected(record)}
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={700}
                    rowAriaLabel={(record) => `Xem chứng từ khấu trừ của ${record.tutorName}`}
                />
            </div>

            <aside className="tax-cert-preview">
                <div className="tax-cert-doc">
                    <div className="tax-cert-doc__header">
                        <span className="tax-cert-doc__brand">TUTORA</span>
                        <span className="tax-cert-doc__title">Chứng từ khấu trừ thuế TNCN</span>
                        <span className="tax-cert-doc__id">{selected.id}</span>
                    </div>
                    <dl className="tax-detail-kv">
                        <div><dt>Người nộp thuế</dt><dd>{selected.tutorName}</dd></div>
                        <div><dt>CCCD</dt><dd>{selected.identityNumber ?? 'Chưa xác minh'}</dd></div>
                        <div><dt>Kỳ tính thuế</dt><dd>{selected.periodLabel}</dd></div>
                        <div><dt>Khoản thu nhập chịu thuế</dt><dd>{formatCurrency(selected.taxableRevenue)}</dd></div>
                        <div><dt>Số thuế TNCN đã khấu trừ</dt><dd>{formatCurrency(selected.pitWithheld)}</dd></div>
                        <div><dt>Trạng thái</dt><dd>{selected.status === 'issued' ? `Đã cấp lúc ${formatDateTime(selected.issuedAt)}` : 'Chưa cấp'}</dd></div>
                    </dl>
                    <p className="tax-cert-doc__note">
                        Chứng từ này do Tutora (tổ chức khai thay, nộp thay theo NĐ 117/2025/NĐ-CP) cấp — gia sư dùng để
                        làm thủ tục hoàn thuế với cơ quan thuế nếu tổng doanh thu năm dưới ngưỡng miễn thuế hiện hành.
                    </p>
                    <p className="tax-cert-doc__disclaimer">Bản xem trước — mẫu chứng từ chính thức cần xác nhận khi build BE thật.</p>
                </div>
                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                    {selected.status === 'not_issued' ? (
                        <button
                            type="button"
                            className="admin-ui-button admin-ui-button-primary"
                            onClick={() => toast.info('Bản đề xuất — chưa nối API cấp chứng từ.')}
                        >
                            Cấp chứng từ
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary"
                                onClick={() => toast.info('Bản đề xuất — chưa nối API gửi email cho gia sư.')}
                            >
                                Gửi email cho gia sư
                            </button>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-primary"
                                onClick={() => toast.info('Bản đề xuất — chưa nối API tải PDF.')}
                            >
                                <span className="material-symbols-outlined" aria-hidden="true">download</span>
                                Tải PDF
                            </button>
                        </>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default TaxCertificatesTab;
