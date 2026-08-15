import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockReportPreview } from '../../../mocks/financeManagementMockData';
import type { ReportPreviewRow } from '../../../mocks/financeManagementMockData';
import { formatCurrency } from '../../../utils/formatters';

const columns: DataTableColumn<ReportPreviewRow>[] = [
    { key: 'label', title: 'Môn học' },
    { key: 'bookings', title: 'Số booking', align: 'right', render: (r) => r.bookingCount.toLocaleString('vi-VN') },
    { key: 'gross', title: 'Tổng doanh thu', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.grossVolume)}</span> },
    { key: 'revenue', title: 'Doanh thu nền tảng', align: 'right', render: (r) => <span className="admin-ui-amount">{formatCurrency(r.platformRevenue)}</span> },
];

const FinancialReportsTab = () => {
    const exportReport = (format: string) => toast.info(`Bản đề xuất — chưa nối API xuất báo cáo (${format}).`);

    return (
        <div className="fin2-stack">
            <div className="fin2-panel">
                <h4>Xuất báo cáo tài chính</h4>
                <p className="fin2-hint">Chọn kỳ báo cáo và nhóm dữ liệu, xem trước bên dưới trước khi xuất file.</p>
                <div className="fin2-grid-3">
                    <label className="financial-filter-field">
                        <span>Kỳ báo cáo</span>
                        <select defaultValue="month">
                            <option value="week">Tuần này</option>
                            <option value="month">Tháng này</option>
                            <option value="quarter">Quý này</option>
                            <option value="custom">Tuỳ chọn khoảng ngày</option>
                        </select>
                    </label>
                    <label className="financial-filter-field">
                        <span>Nhóm theo</span>
                        <select defaultValue="subject">
                            <option value="subject">Môn học</option>
                            <option value="tutor">Gia sư</option>
                            <option value="teachingMode">Hình thức học</option>
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

            <div>
                <h4>Xem trước — Doanh thu theo môn học (tháng này)</h4>
                <DataTable<ReportPreviewRow>
                    columns={columns}
                    data={mockReportPreview}
                    rowKey="label"
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={640}
                />
            </div>
        </div>
    );
};

export default FinancialReportsTab;
