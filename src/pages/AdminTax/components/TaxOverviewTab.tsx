import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import { mockTaxConfig, mockTaxOverview, mockTutorTaxProfiles } from '../../../mocks/taxMockData';
import type { TutorTaxProfile } from '../../../mocks/taxMockData';
import { formatCompactNumber } from '../../../utils/formatters';

const TaxOverviewTab = () => {
    const { monthlyTrend } = mockTaxOverview;
    const maxPit = Math.max(...monthlyTrend.map((m) => m.pit));
    const thresholdLabel = `${(mockTaxConfig.exemptionThreshold / 1_000_000_000).toLocaleString('vi-VN')} tỷ ₫/năm`;

    const topByRevenue = [...mockTutorTaxProfiles]
        .sort((a, b) => b.cumulativeRevenueThisYear - a.cumulativeRevenueThisYear)
        .slice(0, 4);

    const columns: DataTableColumn<TutorTaxProfile>[] = [
        { key: 'tutor', title: 'Gia sư', dataIndex: 'tutorName', minWidth: 160 },
        {
            key: 'revenue',
            title: 'Luỹ kế năm',
            align: 'right',
            render: (record) => <span className="admin-ui-amount">{formatCompactNumber(record.cumulativeRevenueThisYear)}</span>,
        },
        {
            key: 'percent',
            title: `% ngưỡng (${thresholdLabel})`,
            align: 'right',
            render: (record) => <span className="tax-threshold-pill neutral">{record.thresholdPercent}%</span>,
        },
    ];

    return (
        <div className="tax-overview-grid">
            <div className="tax-chart-panel">
                <div className="tax-chart-panel__header">
                    <h4>TNCN khấu trừ theo tháng</h4>
                    <div className="tax-legend">
                        <span><i className="tax-legend-dot vat" />TNCN (dạy học miễn GTGT)</span>
                    </div>
                </div>
                <div className="tax-bars">
                    {monthlyTrend.map((m) => (
                        <div className="tax-bar-col" key={m.label}>
                            <div className="tax-bar-stack">
                                <div className="tax-bar-seg vat" style={{ height: `${(m.pit / maxPit) * 100}%` }} />
                            </div>
                            <span className="tax-bar-label">{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="tax-side-panel">
                <h4>Doanh thu gia sư cao nhất năm nay</h4>
                <p className="tax-config-hint" style={{ marginTop: 0 }}>
                    Không có gia sư nào gần ngưỡng miễn thuế {thresholdLabel} — phần lớn đủ điều kiện hoàn 100% TNCN
                    đã khấu trừ nếu tự làm thủ tục hoàn thuế cuối năm.
                </p>
                <DataTable<TutorTaxProfile>
                    columns={columns}
                    data={topByRevenue}
                    rowKey="tutorId"
                    variant="embedded"
                    density="compact"
                    minWidth={360}
                />
            </div>
        </div>
    );
};

export default TaxOverviewTab;
