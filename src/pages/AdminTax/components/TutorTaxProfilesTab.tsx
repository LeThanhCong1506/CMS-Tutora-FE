import { useState } from 'react';
import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockTaxConfig, mockTutorTaxProfiles } from '../../../mocks/taxMockData';
import type { TutorTaxProfile } from '../../../mocks/taxMockData';
import { formatCompactNumber } from '../../../utils/formatters';

const getTutorInitials = (name: string): string =>
    name.trim().split(/\s+/).filter(Boolean).slice(-2).map((p) => p[0]).join('').toUpperCase();

const TutorTaxProfilesTab = () => {
    const [profiles] = useState<TutorTaxProfile[]>(mockTutorTaxProfiles);
    const [selected, setSelected] = useState<TutorTaxProfile>(mockTutorTaxProfiles[0]);
    const thresholdLabel = `${(mockTaxConfig.exemptionThreshold / 1_000_000_000).toLocaleString('vi-VN')} tỷ ₫ / năm`;

    const columns: DataTableColumn<TutorTaxProfile>[] = [
        {
            key: 'tutor',
            title: 'Gia sư',
            render: (record) => (
                <div className="payout-tutor-cell">
                    <span className="payout-tutor-avatar" aria-hidden="true">{getTutorInitials(record.tutorName)}</span>
                    <div className="admin-ui-entity">
                        <span className="admin-ui-entity-primary">{record.tutorName}</span>
                        <span className="admin-ui-entity-secondary">{record.tutorEmail}</span>
                    </div>
                </div>
            ),
            minWidth: 240,
        },
        {
            key: 'identity',
            title: 'CCCD (đã xác minh)',
            render: (record) => <span className="admin-ui-code-chip">{record.identityNumber}</span>,
        },
        {
            key: 'alternate',
            title: 'MST khác CCCD',
            render: (record) => record.alternateTaxCode
                ? <span className="admin-ui-code-chip">{record.alternateTaxCode}</span>
                : <span className="admin-ui-table-meta">—</span>,
            hideOnMobile: true,
        },
        {
            key: 'revenue',
            title: 'Luỹ kế năm',
            align: 'right',
            render: (record) => <span className="admin-ui-amount">{formatCompactNumber(record.cumulativeRevenueThisYear)}</span>,
        },
    ];

    return (
        <div className="tax-profiles-layout">
            <div>
                <p className="tax-config-hint" style={{ padding: '0 24px', marginTop: 0 }}>
                    Định danh lấy trực tiếp từ CCCD đã xác minh khi duyệt hồ sơ gia sư — CCCD là điều kiện bắt buộc để
                    được mở booking, nên mọi gia sư có doanh thu đều đã có CCCD xác minh, không cần theo dõi trạng thái
                    riêng cho mục đích thuế. Khấu trừ TNCN áp dụng trên mọi giao dịch (NĐ 117/2025/NĐ-CP).
                </p>
                <DataTable<TutorTaxProfile>
                    columns={columns}
                    data={profiles}
                    rowKey="tutorId"
                    onRowClick={(record) => setSelected(record)}
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={700}
                    rowAriaLabel={(record) => `Xem hồ sơ thuế của ${record.tutorName}`}
                />
            </div>

            <aside className="tax-profile-detail">
                <h4>Hồ sơ thuế — {selected.tutorName}</h4>

                <dl className="tax-detail-kv">
                    <div>
                        <dt>CCCD (đã xác minh)</dt>
                        <dd>
                            {selected.identityNumber}
                            <a
                                href={`https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp?mst=${encodeURIComponent(selected.identityNumber)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="tax-lookup-link"
                            >
                                Tra cứu Tổng cục Thuế ↗
                            </a>
                        </dd>
                    </div>
                    <div>
                        <dt>MST khác CCCD (nếu có)</dt>
                        <dd>{selected.alternateTaxCode ?? 'Không có'}</dd>
                    </div>
                    <div><dt>Doanh thu luỹ kế năm</dt><dd>{formatCompactNumber(selected.cumulativeRevenueThisYear)}</dd></div>
                    <div><dt>Ngưỡng miễn thuế hiện hành</dt><dd>{thresholdLabel}</dd></div>
                </dl>

                <div className="tax-detail-field" style={{ marginTop: 16 }}>
                    <label>MST khác CCCD (tự nguyện, hiếm gặp)</label>
                    <input type="text" defaultValue={selected.alternateTaxCode ?? ''} placeholder="Chỉ điền nếu gia sư có MST khác CCCD" />
                </div>

                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-primary"
                        onClick={() => toast.info('Bản đề xuất — chưa nối API lưu MST khác CCCD.')}
                    >
                        Lưu
                    </button>
                </div>
            </aside>
        </div>
    );
};

export default TutorTaxProfilesTab;
