import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockTaxDeclarations, mockTaxOverview, mockTaxReportByTutor } from '../../../mocks/taxMockData';
import type { TaxDeclarationPeriod, TaxReportByTutorRow } from '../../../mocks/taxMockData';
import { formatCurrency } from '../../../utils/formatters';

const periodColumns: DataTableColumn<TaxDeclarationPeriod>[] = [
    { key: 'period', title: 'Kỳ', dataIndex: 'periodLabel' },
    { key: 'revenue', title: 'Doanh thu chịu thuế', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.taxableRevenue)}</span> },
    { key: 'pit', title: 'TNCN (2%)', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.pitAmount)}</span> },
];

const tutorColumns: DataTableColumn<TaxReportByTutorRow>[] = [
    { key: 'tutor', title: 'Gia sư', dataIndex: 'tutorName', minWidth: 160 },
    { key: 'revenue', title: 'Doanh thu chịu thuế', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.taxableRevenue)}</span> },
    { key: 'pit', title: 'TNCN đã khấu trừ', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.pitWithheld)}</span> },
    { key: 'certs', title: 'Chứng từ đã cấp', align: 'right', render: (r) => r.certificatesIssued },
];

const TaxReportsTab = () => {
    const currentPeriod = mockTaxDeclarations[0];
    const overviewPit = mockTaxOverview.totalPitWithheld;
    const isReconciled = currentPeriod.pitAmount === overviewPit;

    const exportReport = (label: string) => toast.info(`Bản đề xuất — chưa nối API xuất báo cáo (${label}).`);

    return (
        <div className="tax-withholding-stack">
            <div className="tax-config-form">
                <h4>Xuất báo cáo thuế</h4>
                <div className="tax-config-grid">
                    <label className="financial-filter-field">
                        <span>Kỳ báo cáo</span>
                        <select defaultValue="quarter">
                            <option value="month">Tháng này</option>
                            <option value="quarter">Quý này</option>
                            <option value="year">Năm nay</option>
                        </select>
                    </label>
                    <label className="financial-filter-field">
                        <span>Nhóm theo</span>
                        <select defaultValue="period">
                            <option value="period">Kỳ kê khai</option>
                            <option value="tutor">Gia sư</option>
                        </select>
                    </label>
                    <label className="financial-filter-field">
                        <span>Định dạng xuất</span>
                        <select defaultValue="xlsx">
                            <option value="xlsx">Excel (.xlsx)</option>
                            <option value="csv">CSV</option>
                            <option value="pdf">PDF</option>
                        </select>
                    </label>
                </div>
                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
                    <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={() => exportReport('xem trước')}>
                        Xem trước
                    </button>
                    <button type="button" className="admin-ui-button admin-ui-button-primary" onClick={() => exportReport('xuất file')}>
                        <span className="material-symbols-outlined" aria-hidden="true">download</span>
                        Xuất báo cáo
                    </button>
                </div>
            </div>

            <div className={`tax-recon-banner ${isReconciled ? 'ok' : 'warn'}`}>
                <span className="material-symbols-outlined" aria-hidden="true">{isReconciled ? 'check_circle' : 'warning'}</span>
                <div>
                    <strong>Đối chiếu nội bộ: KPI "Đã khấu trừ TNCN" (tab Tổng quan) vs. kỳ kê khai {currentPeriod.periodLabel}</strong>
                    <p>
                        {formatCurrency(overviewPit)} (tổng quan) so với {formatCurrency(currentPeriod.pitAmount)} (kỳ kê khai)
                        {isReconciled ? ' — khớp.' : ' — lệch, cần kiểm tra trước khi nộp tờ khai.'}
                    </p>
                </div>
            </div>

            <div className="two-panel">
                <div>
                    <h4>Doanh thu &amp; TNCN theo kỳ kê khai</h4>
                    <DataTable<TaxDeclarationPeriod>
                        columns={periodColumns}
                        data={mockTaxDeclarations}
                        rowKey="id"
                        variant="embedded"
                        minWidth={420}
                    />
                </div>
                <div>
                    <h4>Top gia sư theo TNCN đã khấu trừ (2 kỳ gần nhất)</h4>
                    <DataTable<TaxReportByTutorRow>
                        columns={tutorColumns}
                        data={mockTaxReportByTutor}
                        rowKey="tutorId"
                        variant="embedded"
                        minWidth={480}
                    />
                </div>
            </div>

            <p className="tax-config-hint">
                Tháng hiện tại ({mockTaxOverview.lastDeclarationPeriod} đã nộp gần nhất) — số liệu cập nhật theo thời gian thực khi nối API thật.
            </p>
        </div>
    );
};

export default TaxReportsTab;
