import { ADMIN_PAGE_SIZE } from '@/constants/pagination';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getPayoutOverview, getAllPayoutRequests } from '../../../services/adminPayout.service';
import type { PayoutOverview, WithdrawalRequestItem } from '../../../types/adminPayout.types';
import { FilterTabs, PageContainer, SectionCard } from '../../../components/shared';
import PayoutStatsCards from './components/PayoutStatsCards';
import WithdrawalRequestTable from './components/WithdrawalRequestTable';
import '../../../styles/pages/admin-payout.css';
import { apiErrorMessage } from '../../../utils/apiError';

const payoutTabs = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xử lý' },
  { key: 'pending_review', label: 'Chờ xét duyệt' },
  { key: 'delayed', label: 'Đang tạm giữ' },
  { key: 'approved', label: 'Đang xử lý' },
  { key: 'rejected', label: 'Đã từ chối' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const PayoutOverviewPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<PayoutOverview | null>(null);
  const [requests, setRequests] = useState<WithdrawalRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);
  // Tab + trang sống trong URL (không phải useState cục bộ) — để "Xem chi tiết" rồi bấm back
  // trả về đúng tab/trang đang xem, thay vì luôn reset về "Tất cả"/trang 1.
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get('page')) || 1;
  const activeTab = searchParams.get('status') || 'all';
  const searchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [pageSize, setPageSize] = useState(ADMIN_PAGE_SIZE);
  const navigate = useNavigate();

  const updateQuery = (patch: { status?: string; page?: number; q?: string }) => {
    const next = new URLSearchParams(searchParams);
    if (patch.status !== undefined) {
      if (patch.status && patch.status !== 'all') next.set('status', patch.status);
      else next.delete('status');
    }
    if (patch.q !== undefined) {
      if (patch.q) next.set('q', patch.q);
      else next.delete('q');
    }
    if (patch.page !== undefined) {
      if (patch.page > 1) next.set('page', String(patch.page));
      else next.delete('page');
    }
    setSearchParams(next);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, reqResponse] = await Promise.all([
        getPayoutOverview(),
        getAllPayoutRequests({
          page: currentPage,
          pageSize,
          status: activeTab === 'all' ? undefined : activeTab,
          search: searchQuery || undefined,
        }),
      ]);
      setOverview(overviewRes);
      setRequests(reqResponse.items);
      setTotal(reqResponse.total);
      setLastLoadedAt(new Date());
    } catch (error) {
      console.error('Failed to fetch payout data:', error);
      toast.error(apiErrorMessage(error, 'Không thể tải dữ liệu thanh toán'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, pageSize, searchQuery]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const handleTabChange = (key: string) => {
    updateQuery({ status: key, page: 1 });
  };

  return (
    <PageContainer
      className="payout-overview-page"
      eyebrow="Tài chính"
      eyebrowInfo="Theo dõi yêu cầu rút tiền và lịch sử thanh toán cho gia sư."
      title="Payout"
      maxWidth="wide"
      headerAction={
        <div className="admin-ui-actions">
          <button
            type="button"
            className="admin-ui-button admin-ui-button-secondary"
            onClick={() => void fetchData()}
            disabled={loading}
          >
            <span className="material-symbols-outlined">refresh</span>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          {/* Tạm ẩn nút "Chuyển tiền chủ động" (route /admin-portal/payouts/transfers vẫn còn)
          <button
            type="button"
            className="admin-ui-button admin-ui-button-secondary"
            onClick={() => navigate('/admin-portal/payouts/transfers')}
          >
            <span className="material-symbols-outlined">send_money</span>
            Chuyển tiền chủ động
          </button>
          */}
          <button
            type="button"
            className="admin-ui-button admin-ui-button-secondary"
            onClick={() => navigate('/admin-portal/payouts/history')}
          >
            <span className="material-symbols-outlined">history</span>
            Lịch sử
          </button>
        </div>
      }
    >
      <PayoutStatsCards
        overview={overview}
        loading={loading}
        onSelectStatus={(status) => updateQuery({ status, page: 1 })}
      />

      <SectionCard
        className="payout-requests-card"
        footer={`Hiển thị ${requests.length} / ${total.toLocaleString('vi-VN')} yêu cầu`}
      >
        <div className="admin-ui-toolbar payout-filter-toolbar">
          <form
            className="payout-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              updateQuery({ q: searchInput.trim(), page: 1 });
            }}
          >
            <div className="admin-ui-search">
              <span className="material-symbols-outlined admin-ui-search-icon">search</span>
              <input
                className="admin-ui-search-input"
                aria-label="Tìm yêu cầu rút tiền"
                placeholder="Mã yêu cầu, tên người dùng hoặc email..."
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <button type="submit" className="admin-ui-button admin-ui-button-secondary">
              Tìm kiếm
            </button>
            {(searchInput || searchQuery) && (
              <button
                type="button"
                className="admin-ui-button admin-ui-button-secondary"
                onClick={() => {
                  setSearchInput('');
                  updateQuery({ q: '', page: 1 });
                }}
              >
                Xóa
              </button>
            )}
          </form>
          <div className="payout-filter-tabs">
            <FilterTabs
              tabs={payoutTabs}
              activeKey={activeTab}
              onChange={handleTabChange}
              className="payout-status-tabs"
              ariaLabel="Lọc yêu cầu theo trạng thái"
            />
          </div>
          {lastLoadedAt && (
            <span className="payout-last-updated">
              Cập nhật lúc{' '}
              {lastLoadedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <WithdrawalRequestTable
          data={requests}
          loading={loading}
          total={total}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={(page, size) => {
            updateQuery({ page });
            setPageSize(size);
          }}
        />
      </SectionCard>
    </PageContainer>
  );
};

export default PayoutOverviewPage;
