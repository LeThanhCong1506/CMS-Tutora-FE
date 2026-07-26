import { useState } from 'react';
import { toast } from 'react-toastify';
import { FilterTabs, PageContainer, SectionCard, StatCard, StatusBadge } from '../../components/shared';
import UnderDevelopment from '../../components/UnderDevelopment/UnderDevelopment';
import { SubjectsManagement } from './components';

import '../../styles/pages/admin-settings.css';

type SettingsTab = 'subjects' | 'financial';

const SETTINGS_TABS = [
    { key: 'subjects', label: 'Môn học' },
    { key: 'financial', label: 'Logic tài chính' },
];

export const AdminSettingsPage = () => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('subjects');
    const [commissionRate, setCommissionRate] = useState<number>(15);
    const [minWithdrawal, setMinWithdrawal] = useState<string>('50,000');
    const [escrowPeriod, setEscrowPeriod] = useState<string>('3 Ngày');
    const [vatEnabled, setVatEnabled] = useState<boolean>(true);
    const [vatRate, setVatRate] = useState<string>('20.0');
    const [payoutsFrozen, setPayoutsFrozen] = useState<boolean>(false);

    const handleSave = () => {
        toast.success('Đã lưu cấu hình tài chính');
    };

    const handleDiscard = () => {
        setCommissionRate(15);
        setMinWithdrawal('50,000');
        setEscrowPeriod('3 Ngày');
        setVatEnabled(true);
        setVatRate('20.0');
        setPayoutsFrozen(false);
        toast.info('Đã khôi phục cấu hình mặc định');
    };

    return (
        <PageContainer
            title="Cài đặt hệ thống"
            subtitle="Quản lý cấu hình vận hành, danh mục môn học và quy tắc tài chính của nền tảng."
            headerAction={
                activeTab === 'financial' ? (
                    <div className="admin-ui-actions">
                        <button className="admin-ui-button admin-ui-button-secondary" onClick={handleDiscard}>
                            Hủy thay đổi
                        </button>
                        <button className="admin-ui-button admin-ui-button-primary" onClick={handleSave}>
                            <span className="material-symbols-outlined">check</span>
                            Lưu thay đổi
                        </button>
                    </div>
                ) : undefined
            }
        >
            <SectionCard className="settings-overview-card" headerBorder={false}>
                <div className="settings-under-dev-wrap">
                    <UnderDevelopment featureName="cài đặt hệ thống" />
                </div>
                <div className="admin-ui-toolbar settings-admin-toolbar">
                    <FilterTabs
                        tabs={SETTINGS_TABS}
                        activeKey={activeTab}
                        onChange={(key) => setActiveTab(key as SettingsTab)}
                    />
                    <span className="admin-ui-code-chip">
                        {activeTab === 'subjects' ? 'Danh mục học thuật' : 'Tài chính & thanh toán'}
                    </span>
                </div>
            </SectionCard>

            {activeTab === 'subjects' ? (
                <SubjectsManagement />
            ) : (
                <div className="settings-financial-stack">
                    <div className="admin-ui-kpi-grid">
                        <StatCard
                            icon={<span className="material-symbols-outlined">percent</span>}
                            value={`${commissionRate}%`}
                            label="Hoa hồng nền tảng"
                            subLabel="Áp dụng trên mỗi khóa học bán được"
                            badge="Đang dùng"
                            badgeVariant="dark"
                        />
                        <StatCard
                            icon={<span className="material-symbols-outlined">payments</span>}
                            value={`₫${minWithdrawal}`}
                            label="Rút tối thiểu"
                            subLabel="Ngưỡng trước khi tutor tạo yêu cầu thanh toán"
                            badge="Payout"
                            badgeVariant="blue"
                        />
                        <StatCard
                            icon={<span className="material-symbols-outlined">hourglass_top</span>}
                            value={escrowPeriod}
                            label="Thời gian giữ tiền"
                            subLabel="Khoảng chờ sau giao dịch"
                            badge="Escrow"
                            badgeVariant="orange"
                        />
                        <StatCard
                            icon={<span className="material-symbols-outlined">account_balance</span>}
                            value={vatEnabled ? `${vatRate}%` : 'Tắt'}
                            label="VAT mặc định"
                            subLabel="Tự động tính thuế ở khu vực áp dụng"
                            badge={vatEnabled ? 'Hoạt động' : 'Tắt'}
                            badgeVariant={vatEnabled ? 'green' : 'red'}
                        />
                    </div>

                    <SectionCard
                        title="Tỷ lệ hoa hồng"
                        subtitle="Thiết lập phần trăm nền tảng khấu trừ trước khi thanh toán cho tutor."
                        padded
                    >
                        <div className="settings-slider-layout">
                            <div className="settings-slider-header">
                                <label className="settings-label" htmlFor="commission-rate">
                                    Phí nền tảng
                                </label>
                                <span className="settings-slider-value">{commissionRate}%</span>
                            </div>
                            <input
                                id="commission-rate"
                                type="range"
                                min="0"
                                max="30"
                                value={commissionRate}
                                onChange={(event) => setCommissionRate(Number(event.target.value))}
                                className="settings-range-input"
                            />
                            <div className="settings-slider-labels">
                                <span>0%</span>
                                <span>15% hiện tại</span>
                                <span>30%</span>
                            </div>
                            <div className="settings-info-callout">
                                <span className="material-symbols-outlined">info</span>
                                Tỷ lệ này ảnh hưởng trực tiếp đến doanh thu tutor và biên lợi nhuận nền tảng.
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Quy tắc thanh toán"
                        subtitle="Kiểm soát điều kiện tutor có thể rút tiền khỏi ví."
                        padded
                    >
                        <div className="settings-form-grid">
                            <div className="settings-form-group">
                                <label className="settings-label" htmlFor="min-withdrawal">
                                    Số tiền rút tối thiểu
                                </label>
                                <div className="settings-input-wrapper">
                                    <span className="settings-input-prefix">₫</span>
                                    <input
                                        id="min-withdrawal"
                                        className="settings-input settings-input-with-prefix"
                                        type="text"
                                        value={minWithdrawal}
                                        onChange={(event) => setMinWithdrawal(event.target.value)}
                                    />
                                </div>
                                <p className="settings-helper-text">
                                    Tutor phải đạt số dư này trước khi tạo yêu cầu payout.
                                </p>
                            </div>

                            <div className="settings-form-group">
                                <label className="settings-label" htmlFor="escrow-period">
                                    Thời gian giữ tiền
                                </label>
                                <div className="settings-input-wrapper">
                                    <select
                                        id="escrow-period"
                                        className="settings-select"
                                        value={escrowPeriod}
                                        onChange={(event) => setEscrowPeriod(event.target.value)}
                                    >
                                        <option>Thanh toán tức thì</option>
                                        <option>3 Ngày</option>
                                        <option>7 Ngày</option>
                                        <option>14 Ngày</option>
                                        <option>30 Ngày</option>
                                    </select>
                                    <span className="material-symbols-outlined settings-select-chevron">
                                        expand_more
                                    </span>
                                </div>
                                <p className="settings-helper-text">
                                    Khoảng thời gian tiền được giữ sau giao dịch trước khi khả dụng.
                                </p>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Cài đặt thuế"
                        subtitle="Bật hoặc tắt cơ chế tính VAT tự động."
                        headerAction={
                            <StatusBadge variant={vatEnabled ? 'success' : 'neutral'}>
                                {vatEnabled ? 'Hoạt động' : 'Đang tắt'}
                            </StatusBadge>
                        }
                        padded
                    >
                        <div className="settings-tax-row">
                            <div>
                                <h4 className="settings-inline-title">Thuế giá trị gia tăng (VAT)</h4>
                                <p className="settings-helper-text">
                                    Khi bật, hệ thống dùng tỷ lệ mặc định này cho các giao dịch áp dụng VAT.
                                </p>
                            </div>
                            <div className="settings-tax-controls">
                                <label className="settings-toggle">
                                    <input
                                        type="checkbox"
                                        checked={vatEnabled}
                                        onChange={() => setVatEnabled((current) => !current)}
                                    />
                                    <span />
                                </label>

                                {vatEnabled && (
                                    <div className="settings-tax-rate">
                                        <label className="settings-label" htmlFor="vat-rate">
                                            Tỷ lệ mặc định
                                        </label>
                                        <div className="settings-input-wrapper">
                                            <input
                                                id="vat-rate"
                                                className="settings-input settings-input-with-suffix"
                                                type="text"
                                                value={vatRate}
                                                onChange={(event) => setVatRate(event.target.value)}
                                            />
                                            <span className="settings-input-suffix">%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Kiểm soát khẩn cấp"
                        subtitle="Dùng cho tình huống cần tạm dừng payout trên toàn hệ thống."
                        className="settings-danger-section"
                        padded
                    >
                        <div className="settings-danger-layout">
                            <div className="settings-danger-copy">
                                <span className="material-symbols-outlined">warning</span>
                                <div>
                                    <h4 className="settings-inline-title">Đóng băng tất cả thanh toán</h4>
                                    <p className="settings-helper-text">
                                        Dừng toàn bộ giao dịch đi ngay lập tức. Hành động này nên được ghi nhận trong nhật ký sự cố.
                                    </p>
                                </div>
                            </div>
                            <label className="settings-toggle settings-toggle-danger">
                                <input
                                    type="checkbox"
                                    checked={payoutsFrozen}
                                    onChange={() => setPayoutsFrozen((current) => !current)}
                                />
                                <span />
                            </label>
                        </div>
                    </SectionCard>
                </div>
            )}
        </PageContainer>
    );
};

export default AdminSettingsPage;
