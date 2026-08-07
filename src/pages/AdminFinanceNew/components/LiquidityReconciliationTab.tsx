import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import {
    mockCashFlowTrend,
    mockReconciliationRecords,
    mockTreasurySnapshot,
} from '../../../mocks/treasuryMockData';
import type { ReconciliationRecord } from '../../../mocks/treasuryMockData';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';

const STATUS_LABEL: Record<ReconciliationRecord['status'], string> = {
    matched: 'Khớp',
    mismatch: 'Lệch số tiền',
    missing_ledger: 'Thiếu ở sổ nội bộ',
    missing_gateway: 'Thiếu ở PayOS',
};

const STATUS_CLASS: Record<ReconciliationRecord['status'], string> = {
    matched: 'success',
    mismatch: 'danger',
    missing_ledger: 'warning',
    missing_gateway: 'warning',
};

const LiquidityReconciliationTab = () => {
    const snap = mockTreasurySnapshot;
    const totalObligations = snap.obligations.escrowHeld + snap.obligations.tutorWalletBalance + snap.obligations.pendingWithdrawals;
    const buffer = snap.bankBalance - totalObligations;
    const maxTrend = Math.max(...mockCashFlowTrend.map((m) => Math.max(m.cashIn, m.cashOut)));

    const reconColumns: DataTableColumn<ReconciliationRecord>[] = [
        { key: 'reference', title: 'Tham chiếu', render: (r) => <span className="admin-ui-code-chip">{r.reference}</span>, minWidth: 200 },
        { key: 'payos', title: 'PayOS', align: 'right', render: (r) => <span className="admin-ui-amount">{r.payosAmount !== null ? formatCurrency(r.payosAmount) : '—'}</span> },
        { key: 'ledger', title: 'Sổ nội bộ', align: 'right', render: (r) => <span className="admin-ui-amount">{r.ledgerAmount !== null ? formatCurrency(r.ledgerAmount) : '—'}</span> },
        { key: 'date', title: 'Ngày', render: (r) => <span className="admin-ui-table-meta">{formatDateTime(r.date)}</span>, hideOnMobile: true },
        {
            key: 'status',
            title: 'Trạng thái',
            render: (r) => <span className={`fin2-recon-pill ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>,
        },
        { key: 'note', title: 'Ghi chú', render: (r) => <span className="admin-ui-table-meta">{r.note ?? '—'}</span>, minWidth: 260, hideOnMobile: true },
    ];

    return (
        <div className="fin2-stack">
            <div className={`fin2-liquidity-card fin2-liquidity-card--${snap.status}`}>
                <div className="fin2-liquidity-head">
                    <div>
                        <span className="fin2-liquidity-eyebrow">Thanh khoản vận hành</span>
                        <h4>Tiền ngân hàng thực tế so với tổng nghĩa vụ</h4>
                    </div>
                    <span className={`fin2-liquidity-badge fin2-liquidity-badge--${snap.status}`}>
                        {snap.status === 'healthy' && 'Đủ thanh khoản'}
                        {snap.status === 'warning' && 'Cần theo dõi'}
                        {snap.status === 'critical' && 'Thiếu thanh khoản'}
                    </span>
                </div>
                <p className="fin2-liquidity-hint">
                    Nguyên tắc: <strong>Tiền ngân hàng thật ≥ Escrow + Ví gia sư + Yêu cầu rút đang chờ</strong>.
                    Nếu vế phải vượt vế trái, nền tảng đang cam kết trả nhiều hơn số tiền thật đang có.
                </p>
                <div className="fin2-liquidity-compare">
                    <div className="fin2-liquidity-bar">
                        <span className="fin2-liquidity-bar-label">Tiền ngân hàng thật</span>
                        <div className="fin2-liquidity-track">
                            <div className="fin2-liquidity-fill bank" style={{ width: '100%' }} />
                        </div>
                        <strong>{formatCurrency(snap.bankBalance)}</strong>
                    </div>
                    <div className="fin2-liquidity-bar">
                        <span className="fin2-liquidity-bar-label">Tổng nghĩa vụ</span>
                        <div className="fin2-liquidity-track">
                            <div
                                className="fin2-liquidity-fill obligations"
                                style={{ width: `${Math.min(100, (totalObligations / snap.bankBalance) * 100)}%` }}
                            />
                        </div>
                        <strong>{formatCurrency(totalObligations)}</strong>
                    </div>
                </div>
                <div className="fin2-liquidity-breakdown">
                    <div><span>Escrow đang giữ</span><strong>{formatCurrency(snap.obligations.escrowHeld)}</strong></div>
                    <div><span>Ví gia sư (đã unlock)</span><strong>{formatCurrency(snap.obligations.tutorWalletBalance)}</strong></div>
                    <div><span>Yêu cầu rút đang chờ</span><strong>{formatCurrency(snap.obligations.pendingWithdrawals)}</strong></div>
                    <div><span>Đang chờ về từ PayOS</span><strong>{formatCurrency(snap.payosUnsettled)}</strong></div>
                    <div className="highlight"><span>Đệm thanh khoản</span><strong>{formatCurrency(buffer)}</strong></div>
                </div>
                <p className="fin2-liquidity-asof">Số liệu lúc {formatDateTime(snap.asOf)}</p>
            </div>

            <div>
                <h4>Dòng tiền vào / ra theo tháng</h4>
                <div className="fin2-cashflow-legend">
                    <span><i className="dot in" />Tiền vào (phụ huynh thanh toán)</span>
                    <span><i className="dot out" />Tiền ra (chi trả gia sư + hoàn tiền)</span>
                </div>
                <div className="fin2-cashflow-bars">
                    {mockCashFlowTrend.map((m) => (
                        <div className="fin2-cashflow-col" key={m.label}>
                            <div className="fin2-cashflow-pair">
                                <div className="fin2-cashflow-bar in" style={{ height: `${(m.cashIn / maxTrend) * 100}%` }} />
                                <div className="fin2-cashflow-bar out" style={{ height: `${(m.cashOut / maxTrend) * 100}%` }} />
                            </div>
                            <span className="fin2-cashflow-label">{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h4>Đối soát PayOS ↔ Sổ nội bộ</h4>
                <p className="fin2-hint">Phát hiện sớm chênh lệch giữa cổng thanh toán và ledger nội bộ trước khi ảnh hưởng thanh khoản.</p>
                <DataTable<ReconciliationRecord>
                    columns={reconColumns}
                    data={mockReconciliationRecords}
                    rowKey="id"
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={860}
                />
            </div>
        </div>
    );
};

export default LiquidityReconciliationTab;
