import type { AdminBookingWalletTransactionItem, WalletOwnerRole } from '../../types/adminBooking.types';
import { formatDateTime } from '../../utils/formatters';
import { formatVND } from './bookingDisplay';
import styles from './AdminBookings.module.css';

interface Props {
    /** Optional on purpose: a renamed or missing backend field must not white-screen the page. */
    transactions?: AdminBookingWalletTransactionItem[];
}

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
    deposit: 'Nạp tiền',
    depositpayment: 'Thanh toán cọc',
    remainingpayment: 'Thanh toán còn lại',
    escrowcredit: 'Đóng băng escrow',
    escrowrelease: 'Giải ngân cho gia sư',
    escrowreversal: 'Rút escrow (hủy/hoàn)',
    refund: 'Hoàn tiền',
    withdrawal: 'Rút tiền',
    admincredit: 'Admin cộng tiền',
};

const WALLET_OWNER_LABELS: Record<WalletOwnerRole, string> = {
    tutor: 'Gia sư',
    parent: 'Phụ huynh',
    student: 'Học sinh',
};

function getTransactionTypeLabel(type?: string): string {
    if (!type) return 'Không rõ';
    return TRANSACTION_TYPE_LABELS[type.toLowerCase()] ?? type;
}

function getWalletOwnerLabel(role?: WalletOwnerRole | null): string {
    if (!role) return '—';
    return WALLET_OWNER_LABELS[role] ?? role;
}

/**
 * Lịch sử từng dòng Wallettransaction (ghi sổ ví) gắn với booking này — vd Refund,
 * EscrowRelease, EscrowReversal phát sinh khi hủy/hoàn tiền/giải ngân. Đây là bằng chứng chi
 * tiết để đối chiếu, khác với các số liệu tổng hợp ở PaymentBreakdownCard.
 */
export default function TransactionHistoryCard({ transactions = [] }: Props) {
    if (!transactions.length) {
        return (
            <section className={`${styles.card} ${styles.cardFull}`}>
                <h2 className={styles.cardTitle}>Lịch sử giao dịch</h2>
                <div className={styles.emptyMini}>Chưa có giao dịch nào gắn với booking này.</div>
            </section>
        );
    }

    return (
        <section className={`${styles.card} ${styles.cardFull}`}>
            <h2 className={styles.cardTitle}>Lịch sử giao dịch ({transactions.length})</h2>
            <div className={styles.lessonsScroll}>
                <table className={styles.lessonsTable}>
                    <thead>
                        <tr>
                            <th>Loại giao dịch</th>
                            <th>Chủ ví</th>
                            <th>Số tiền</th>
                            <th>Mô tả</th>
                            <th>Thời gian</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx) => {
                            const isNegative = (tx.amount ?? 0) < 0;
                            return (
                                <tr key={tx.transactionId}>
                                    <td>{getTransactionTypeLabel(tx.transactionType)}</td>
                                    <td>
                                        {getWalletOwnerLabel(tx.walletOwnerRole)}
                                        {tx.walletOwnerName && (
                                            <span className={styles.lessonTimeSecondary}>
                                                {' '}
                                                — {tx.walletOwnerName}
                                            </span>
                                        )}
                                    </td>
                                    <td
                                        className={styles.lessonMoney}
                                        style={{ color: isNegative ? '#b91c1c' : '#065f46' }}
                                    >
                                        {isNegative ? '−' : '+'}
                                        {formatVND(Math.abs(tx.amount ?? 0))}
                                    </td>
                                    <td>{tx.description || <span className={styles.dim}>—</span>}</td>
                                    <td>{tx.createdAt ? formatDateTime(tx.createdAt) : <span className={styles.dim}>—</span>}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
