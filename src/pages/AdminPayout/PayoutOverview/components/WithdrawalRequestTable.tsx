import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../../components/shared';
import type { DataTableColumn } from '../../../../components/shared';
import type { WithdrawalRequestItem } from '../../../../types/adminPayout.types';
import { formatCurrency, formatDateTime } from '../../../../utils/formatters';
import WithdrawalStatusBadge from '../../WithdrawalStatusBadge';

interface Props {
  data: WithdrawalRequestItem[];
  loading: boolean;
  total: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, size: number) => void;
}

const getTutorInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GS';

  return parts
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const WithdrawalRequestTable: React.FC<Props> = ({ data, loading, total, currentPage, pageSize, onPageChange }) => {
  const navigate = useNavigate();

  const openRequest = (record: WithdrawalRequestItem) => {
    navigate(`/admin-portal/payouts/${record.withdrawalId}`);
  };

  const columns: DataTableColumn<WithdrawalRequestItem>[] = [
    {
      key: 'withdrawalId',
      title: 'Mã yêu cầu',
      render: (record) => <span className="admin-ui-code-chip">#{record.withdrawalId}</span>,
      minWidth: 120,
    },
    {
      key: 'tutor',
      title: 'Gia sư',
      render: (record) => (
        <div className="payout-tutor-cell">
          <span className="payout-tutor-avatar" aria-hidden="true">
            {getTutorInitials(record.tutorName || '')}
          </span>
          <div className="admin-ui-entity">
            <span className="admin-ui-entity-primary">{record.tutorName || 'Chưa có tên'}</span>
            <span className="admin-ui-entity-secondary">{record.tutorEmail || record.tutorId}</span>
          </div>
        </div>
      ),
      minWidth: 240,
    },
    {
      key: 'amount',
      title: 'Số tiền',
      render: (record) => <span className="admin-ui-amount">{formatCurrency(record.amount)}</span>,
      align: 'right',
      minWidth: 140,
    },
    {
      key: 'bank',
      title: 'Ngân hàng',
      render: (record) => (
        <span className="payout-bank-cell">
          <span className="material-symbols-outlined" aria-hidden="true">
            account_balance
          </span>
          <span>{record.bankName || 'Chưa cập nhật'}</span>
        </span>
      ),
      hideOnMobile: true,
      minWidth: 140,
    },
    {
      key: 'requestedAt',
      title: 'Ngày yêu cầu',
      render: (record) => <span className="admin-ui-table-meta">{formatDateTime(record.requestedAt)}</span>,
      hideOnMobile: true,
      minWidth: 160,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (record) => <WithdrawalStatusBadge status={record.status} />,
      minWidth: 140,
    },
    {
      key: 'action',
      title: 'Thao tác',
      align: 'right',
      render: (record) => (
        <button
          type="button"
          className="payout-row-action"
          aria-label={`Mở chi tiết yêu cầu #${record.withdrawalId}`}
          onClick={(event) => {
            event.stopPropagation();
            openRequest(record);
          }}
        >
          <span className="payout-row-action__label">Chi tiết</span>
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_forward
          </span>
        </button>
      ),
      minWidth: 110,
    },
  ];

  return (
    <DataTable<WithdrawalRequestItem>
      columns={columns}
      data={data}
      rowKey="withdrawalId"
      loading={loading}
      loadingText="Đang tải yêu cầu rút tiền..."
      emptyText="Không có yêu cầu rút tiền nào"
      emptyIcon={
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>
          payments
        </span>
      }
      onRowClick={openRequest}
      pagination={{
        current: currentPage,
        pageSize,
        total,
        onChange: (page) => onPageChange(page, pageSize),
      }}
      className="payout-request-table"
      minWidth={1040}
      variant="embedded"
    />
  );
};

export default WithdrawalRequestTable;
