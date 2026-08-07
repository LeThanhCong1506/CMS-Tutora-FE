import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockCommissionConfig } from '../../../mocks/financeManagementMockData';
import type { CommissionConfig } from '../../../mocks/financeManagementMockData';
import { formatDate } from '../../../utils/formatters';

const historyColumns: DataTableColumn<CommissionConfig['history'][number]>[] = [
    { key: 'date', title: 'Ngày áp dụng', dataIndex: 'effectiveFrom' },
    { key: 'parent', title: 'Phí phụ huynh', render: (r) => `${r.parentFeePercent}%` },
    { key: 'tutor', title: 'Phí gia sư', render: (r) => `${r.tutorFeePercent}%` },
    { key: 'by', title: 'Người cập nhật', dataIndex: 'updatedBy' },
];

const CommissionConfigTab = () => {
    const cfg = mockCommissionConfig;

    return (
        <div className="fin2-stack">
            <div className="fin2-panel">
                <h4>Hoa hồng nền tảng</h4>
                <p className="fin2-hint">
                    Hiện đang hardcode trong <code>BookingFeeCalculator.cs</code> — form này cho phép admin
                    chỉnh trực tiếp thay vì phải deploy lại backend.
                </p>
                <div className="fin2-grid-2">
                    <label className="financial-filter-field">
                        <span>Phí phụ huynh (cộng thêm vào giá)</span>
                        <input type="text" defaultValue={`${cfg.parentFeePercent}%`} />
                    </label>
                    <label className="financial-filter-field">
                        <span>Phí gia sư (trừ vào doanh thu)</span>
                        <input type="text" defaultValue={`${cfg.tutorFeePercent}%`} />
                    </label>
                    <label className="financial-filter-field">
                        <span>Hiệu lực từ ngày</span>
                        <input type="text" defaultValue={formatDate(cfg.effectiveFrom)} />
                    </label>
                    <label className="financial-filter-field">
                        <span>Tổng hoa hồng nền tảng</span>
                        <input type="text" disabled value={`${cfg.parentFeePercent + cfg.tutorFeePercent}%`} />
                    </label>
                </div>
                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
                    <button type="button" className="admin-ui-button admin-ui-button-secondary">Huỷ thay đổi</button>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-primary"
                        onClick={() => toast.info('Bản đề xuất — chưa nối API lưu cấu hình hoa hồng.')}
                    >
                        Lưu cấu hình
                    </button>
                </div>
            </div>

            <div>
                <h4>Lịch sử thay đổi</h4>
                <DataTable
                    columns={historyColumns}
                    data={cfg.history}
                    rowKey="effectiveFrom"
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={560}
                />
            </div>
        </div>
    );
};

export default CommissionConfigTab;
