import { useState } from 'react';
import { toast } from 'react-toastify';
import { DataTable, FilterTabs, StatusBadge } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockTaxConfig, mockTaxConfigProposal } from '../../../mocks/taxMockData';
import type { TaxConfigHistoryEntry } from '../../../mocks/taxMockData';
import { formatDate, formatDateTime } from '../../../utils/formatters';

const formatThreshold = (value: number) => `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ ₫`;

const historyColumns: DataTableColumn<TaxConfigHistoryEntry & { isActive: boolean }>[] = [
    { key: 'date', title: 'Hiệu lực từ', dataIndex: 'effectiveFrom' },
    { key: 'pit', title: 'TNCN', render: (r) => `${r.pitRate}%` },
    { key: 'threshold', title: 'Ngưỡng miễn thuế', render: (r) => formatThreshold(r.exemptionThreshold) },
    { key: 'basis', title: 'Căn cứ pháp lý', dataIndex: 'legalBasis', minWidth: 200 },
    { key: 'by', title: 'Người cập nhật', dataIndex: 'updatedBy' },
    {
        key: 'status',
        title: 'Trạng thái',
        render: (r) => (
            <StatusBadge variant={r.isActive ? 'success' : 'neutral'} shape="tag">
                {r.isActive ? 'Đang áp dụng' : 'Hết hiệu lực'}
            </StatusBadge>
        ),
    },
];

// Mô hình phân quyền của CMS: Admin có mọi quyền của Staff (không phải 2 vai trò tách biệt).
// Quyền được CẤP cho Staff theo từng permission cụ thể (xem AdminLayout/PermissionGroupsPage,
// component <Can permission="..."> trong AccessContext.tsx) — Admin luôn có đủ quyền.
// Toggle dưới đây chỉ mô phỏng "người xem có quyền tax.approve hay không" để duyệt UI, không
// phải chọn vai trò. Trong app thật sẽ thay bằng useAccess().can('tax.approve').
const permissionViewTabs = [
    { key: 'has', label: 'Có quyền duyệt (tax.approve)' },
    { key: 'none', label: 'Không có quyền duyệt' },
];

const TaxConfigTab = () => {
    const cfg = mockTaxConfig;
    const proposal = mockTaxConfigProposal;
    const [approvePermission, setApprovePermission] = useState<'has' | 'none'>('has');
    const [pitRate, setPitRate] = useState(String(cfg.pitRate));
    const [threshold, setThreshold] = useState(formatThreshold(cfg.exemptionThreshold));
    const [effectiveFrom, setEffectiveFrom] = useState('');
    const [legalBasis, setLegalBasis] = useState('');
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const canApprove = approvePermission === 'has';

    const historyRows = cfg.history.map((entry, i) => ({ ...entry, isActive: i === 0 }));

    return (
        <div className="tax-config-stack">
            <div className="tax-role-switch">
                <FilterTabs tabs={permissionViewTabs} activeKey={approvePermission} onChange={(key) => setApprovePermission(key as 'has' | 'none')} />
                <span className="tax-role-switch__hint">
                    Xem trước theo quyền — ai có quyền <code>tax.manage</code> đều tạo được đề xuất; chỉ người có
                    thêm quyền <code>tax.approve</code> (mặc định: Admin, hoặc Staff được cấp riêng) mới duyệt được.
                </span>
            </div>

            <div className="tax-config-current">
                <div className="tax-config-current__head">
                    <h4>Cấu hình đang áp dụng</h4>
                    <StatusBadge variant="success" shape="tag">Hiệu lực từ {formatDate(cfg.effectiveFrom)}</StatusBadge>
                </div>
                <div className="tax-config-tiles">
                    <div className="tax-config-tile locked">
                        <span className="tax-config-tile__label">
                            <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                            Thuế suất VAT
                        </span>
                        <strong>0%</strong>
                        <span className="tax-config-tile__basis">Điều 5 Luật thuế GTGT</span>
                    </div>
                    <div className="tax-config-tile">
                        <span className="tax-config-tile__label">Thuế suất TNCN</span>
                        <strong>{cfg.pitRate}%</strong>
                        <span className="tax-config-tile__basis">{cfg.legalBasis}</span>
                    </div>
                    <div className="tax-config-tile">
                        <span className="tax-config-tile__label">Ngưỡng miễn thuế / năm</span>
                        <strong>{formatThreshold(cfg.exemptionThreshold)}</strong>
                        <span className="tax-config-tile__basis">{cfg.legalBasis}</span>
                    </div>
                </div>
            </div>

            {proposal && (
                <div className="tax-proposal-card">
                    <div className="tax-proposal-card__head">
                        <h4>Đề xuất đang chờ duyệt</h4>
                        <StatusBadge variant="warning" shape="tag">Chờ duyệt</StatusBadge>
                    </div>
                    <dl className="tax-detail-kv">
                        <div><dt>Thuế suất TNCN</dt><dd>{proposal.pitRate}%</dd></div>
                        <div><dt>Ngưỡng miễn thuế</dt><dd>{formatThreshold(proposal.exemptionThreshold)}</dd></div>
                        <div><dt>Hiệu lực từ</dt><dd>{formatDate(proposal.effectiveFrom)}</dd></div>
                        <div><dt>Căn cứ pháp lý</dt><dd>{proposal.legalBasis}</dd></div>
                        <div>
                            <dt>Người đề xuất</dt>
                            <dd>
                                {proposal.proposedBy}
                                <span className="tax-role-chip">{proposal.proposedByRole === 'staff' ? 'Staff' : 'Admin'}</span>
                                {' · '}{formatDateTime(proposal.proposedAt)}
                            </dd>
                        </div>
                    </dl>

                    {canApprove ? (
                        <div className="admin-ui-actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-danger"
                                onClick={() => toast.info('Bản đề xuất — chưa nối API từ chối đề xuất.')}
                            >
                                Từ chối
                            </button>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-primary"
                                onClick={() => toast.info('Bản đề xuất — chưa nối API duyệt đề xuất.')}
                            >
                                Duyệt & lên lịch áp dụng
                            </button>
                        </div>
                    ) : (
                        <div className="admin-ui-actions" style={{ justifyContent: 'space-between', marginTop: 14 }}>
                            <span className="tax-config-tile__basis">Cần quyền tax.approve để duyệt — gửi tới người được cấp quyền.</span>
                            <button
                                type="button"
                                className="admin-ui-button admin-ui-button-secondary"
                                onClick={() => toast.info('Bản đề xuất — chưa nối API huỷ đề xuất.')}
                            >
                                Huỷ đề xuất
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="tax-config-form">
                <h4>Tạo đề xuất thay đổi mới</h4>
                <div className="tax-config-grid">
                    <label className="financial-filter-field">
                        <span>Thuế suất TNCN</span>
                        <input type="text" value={pitRate} onChange={(e) => setPitRate(e.target.value)} />
                    </label>
                    <label className="financial-filter-field">
                        <span>Ngưỡng miễn thuế / năm</span>
                        <input type="text" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                    </label>
                    <label className="financial-filter-field">
                        <span>Hiệu lực từ ngày</span>
                        <input type="date" min={tomorrow} value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                    </label>
                    <label className="financial-filter-field">
                        <span>Căn cứ pháp lý</span>
                        <input type="text" placeholder="VD: Nghị định .../2026/NĐ-CP" value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} />
                    </label>
                </div>
                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
                    <button type="button" className="admin-ui-button admin-ui-button-secondary">Huỷ</button>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-primary"
                        onClick={() => toast.info('Bản đề xuất — chưa nối API gửi duyệt cấu hình thuế.')}
                    >
                        {canApprove ? 'Gửi duyệt' : 'Gửi duyệt (cần người có quyền tax.approve xét)'}
                    </button>
                </div>
            </div>

            <div>
                <h4>Lịch sử áp dụng</h4>
                <DataTable
                    columns={historyColumns}
                    data={historyRows}
                    rowKey="effectiveFrom"
                    variant="embedded"
                    minWidth={720}
                />
            </div>
        </div>
    );
};

export default TaxConfigTab;
