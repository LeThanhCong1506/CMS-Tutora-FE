/**
 * ⚠️ TEMP MOCK DATA — for UI preview/comparison only.
 * Covers the treasury/liquidity + reconciliation capabilities that were
 * entirely missing from the finance module (no BE endpoint exists yet).
 * This is the single most important gap identified: comparing real bank
 * balance against total obligations (escrow + tutor wallets + pending
 * withdrawals) so admin can catch a liquidity shortfall before it happens.
 * Delete this file once the real BE endpoint + service ship.
 */

export type LiquidityStatus = 'healthy' | 'warning' | 'critical';

export interface TreasurySnapshot {
    asOf: string;
    bankBalance: number;
    payosUnsettled: number;
    obligations: {
        escrowHeld: number;
        tutorWalletBalance: number;
        pendingWithdrawals: number;
    };
    status: LiquidityStatus;
}

const escrowHeld = 64_200_000;
const tutorWalletBalance = 118_600_000;
const pendingWithdrawals = 42_600_000;
const totalObligations = escrowHeld + tutorWalletBalance + pendingWithdrawals;

export const mockTreasurySnapshot: TreasurySnapshot = {
    asOf: '2026-07-27T09:00:00Z',
    // Deliberately mocked slightly above obligations so the "healthy" state has a
    // realistic buffer to show — flip below totalObligations to preview 'critical'.
    bankBalance: totalObligations + 18_400_000,
    payosUnsettled: 26_500_000,
    obligations: { escrowHeld, tutorWalletBalance, pendingWithdrawals },
    status: 'healthy',
};

export interface CashFlowTrendItem {
    label: string;
    cashIn: number;
    cashOut: number;
}

export const mockCashFlowTrend: CashFlowTrendItem[] = [
    { label: 'T2', cashIn: 186_000_000, cashOut: 162_000_000 },
    { label: 'T3', cashIn: 214_000_000, cashOut: 189_000_000 },
    { label: 'T4', cashIn: 201_000_000, cashOut: 205_000_000 },
    { label: 'T5', cashIn: 248_000_000, cashOut: 221_000_000 },
    { label: 'T6', cashIn: 268_000_000, cashOut: 240_000_000 },
    { label: 'T7', cashIn: 291_000_000, cashOut: 254_000_000 },
];

export type ReconciliationMatchStatus = 'matched' | 'mismatch' | 'missing_ledger' | 'missing_gateway';

export interface ReconciliationRecord {
    id: string;
    reference: string;
    payosAmount: number | null;
    ledgerAmount: number | null;
    date: string;
    status: ReconciliationMatchStatus;
    note?: string;
}

export const mockReconciliationRecords: ReconciliationRecord[] = [
    { id: 'RC-1', reference: 'BK-88213 / deposit', payosAmount: 1_500_000, ledgerAmount: 1_500_000, date: '2026-07-27T02:10:00Z', status: 'matched' },
    { id: 'RC-2', reference: 'BK-88214 / remaining', payosAmount: 900_000, ledgerAmount: 900_000, date: '2026-07-27T01:50:00Z', status: 'matched' },
    { id: 'RC-3', reference: 'BK-88190 / deposit', payosAmount: 900_000, ledgerAmount: 850_000, date: '2026-07-26T09:20:00Z', status: 'mismatch', note: 'PayOS webhook về trễ — chênh lệch phí cổng đối soát chưa khớp.' },
    { id: 'RC-4', reference: 'BK-88170 / refund', payosAmount: null, ledgerAmount: 600_000, date: '2026-07-26T10:05:00Z', status: 'missing_gateway', note: 'Ledger ghi hoàn tiền nhưng chưa thấy giao dịch hoàn ở PayOS.' },
    { id: 'RC-5', reference: 'BK-88055 / deposit', payosAmount: 450_000, ledgerAmount: null, date: '2026-07-25T08:00:00Z', status: 'missing_ledger', note: 'PayOS báo thành công nhưng chưa ghi nhận wallet transaction.' },
];
