import React, { useState } from 'react';
import { SubjectsManagement } from './components';
import UnderDevelopment from '../../components/UnderDevelopment/UnderDevelopment';

import '../../styles/pages/admin-settings.css';

type SettingsTab = 'financial' | 'subjects';

export const AdminSettingsPage = () => {
    // Active tab
    const [activeTab, setActiveTab] = useState<SettingsTab>('subjects');

    // State management
    const [commissionRate, setCommissionRate] = useState<number>(15);
    const [minWithdrawal, setMinWithdrawal] = useState<string>('50.00');
    const [escrowPeriod, setEscrowPeriod] = useState<string>('3 Days');
    const [vatEnabled, setVatEnabled] = useState<boolean>(true);
    const [vatRate, setVatRate] = useState<string>('20.0');
    const [payoutsFrozen, setPayoutsFrozen] = useState<boolean>(false);

    // Handlers
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCommissionRate(Number(e.target.value));
    };

    const handleSave = () => {
        console.log('Saving settings:', {
            commissionRate,
            minWithdrawal,
            escrowPeriod,
            vatEnabled,
            vatRate,
            payoutsFrozen
        });
        // Implement actual save logic here
    };

    const handleDiscard = () => {
        console.log('Discarding changes');
        // Implement reset logic here or navigation
    };

    return (
        <>
            {/* MAIN CONTENT */}

            {/* MAIN CONTENT */}
            <main className="settings-main">
                <div className="settings-scroll-area">
                    {/* Split Layout Card */}
                    <div className="settings-card">
                        {/* Left Settings Menu (25%) */}
                        <div className="settings-menu">
                            <h3 className="settings-menu-title">Cấu hình hệ thống</h3>
                            <div className="settings-nav">
                                <button
                                    className={`settings-nav-btn ${activeTab === 'subjects' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('subjects')}
                                >
                                    {activeTab === 'subjects' && <div className="settings-nav-active-indicator"></div>}
                                    <div className="settings-nav-content">
                                        <span className="material-symbols-outlined settings-nav-icon">library_books</span>
                                        <span className="settings-nav-text">Môn học</span>
                                    </div>
                                    {activeTab === 'subjects' && (
                                        <span className="material-symbols-outlined settings-nav-chevron">chevron_right</span>
                                    )}
                                </button>
                                <button
                                    className={`settings-nav-btn ${activeTab === 'financial' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('financial')}
                                >
                                    {activeTab === 'financial' && <div className="settings-nav-active-indicator"></div>}
                                    <div className="settings-nav-content">
                                        <span className="material-symbols-outlined settings-nav-icon">account_balance_wallet</span>
                                        <span className="settings-nav-text">Logic tài chính</span>
                                    </div>
                                    {activeTab === 'financial' && (
                                        <span className="material-symbols-outlined settings-nav-chevron">chevron_right</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Right Configuration Panel (75%) */}
                        <div className="settings-panel">
                            {/* Under Development Modal */}
                            <UnderDevelopment featureName="cài đặt hệ thống" />

                            {/* Subjects Tab - Full Width Layout */}
                            {activeTab === 'subjects' && (
                                <div className="settings-panel-full">
                                    <SubjectsManagement />
                                </div>
                            )}

                            {/* Financial Tab - Form Layout */}
                            {activeTab === 'financial' && (
                                <>
                                    {/* Header */}
                                    <div className="settings-panel-header">
                                        <div>
                                            <h2 className="settings-page-title">Cấu hình tài chính</h2>
                                            <p className="settings-page-desc">Quản lý tỷ lệ hoa hồng, quy tắc thanh toán và thông số thuế cho nền tảng.</p>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <span className="settings-last-updated">Cập nhật lần cuối: Hôm nay, 10:23 SA</span>
                                        </div>
                                    </div>

                                    {/* Scrollable Form Content */}
                                    <div className="settings-form-content">
                                        <div className="settings-section-container">
                                            {/* Section 1: Commission Rate */}
                                            <section>
                                                <div className="settings-section-header">
                                                    <div className="settings-section-icon">
                                                        <span className="material-symbols-outlined">percent</span>
                                                    </div>
                                                    <h3 className="settings-section-title">Tỷ lệ hoa hồng</h3>
                                                </div>
                                                <div className="settings-section-card">
                                                    <div className="slider-container">
                                                        <div className="slider-header">
                                                            <label className="settings-label">Phí nền tảng (%)</label>
                                                            <div className="settings-input-wrapper" style={{ width: 'auto' }}>
                                                                <input
                                                                    className="settings-input slider-input-small"
                                                                    type="text"
                                                                    value={`${commissionRate}%`}
                                                                    readOnly
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Custom Slider Component */}
                                                        <div className="slider-track-container">
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="30"
                                                                value={commissionRate}
                                                                onChange={handleSliderChange}
                                                                className="slider-range-input"
                                                            />

                                                            {/* Visual Track */}
                                                            <div className="slider-track-bg"></div>
                                                            <div
                                                                className="slider-track-fill"
                                                                style={{ width: `${(commissionRate / 30) * 100}%` }}
                                                            ></div>
                                                            <div
                                                                className="slider-thumb"
                                                                style={{ left: `${(commissionRate / 30) * 100}%` }}
                                                            ></div>
                                                        </div>

                                                        <div className="slider-labels">
                                                            <span>0%</span>
                                                            <span>15% (Hiện tại)</span>
                                                            <span>30%</span>
                                                        </div>

                                                        <div>
                                                            <div className="slider-info-box">
                                                                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-primary)' }}>info</span>
                                                                Tỷ lệ phần trăm này được khấu trừ từ mỗi khóa học bán được trước khi thanh toán cho giảng viên.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            {/* Section 2: Payout Rules */}
                                            <section>
                                                <div className="settings-section-header">
                                                    <div className="settings-section-icon">
                                                        <span className="material-symbols-outlined">payments</span>
                                                    </div>
                                                    <h3 className="settings-section-title">Quy tắc thanh toán</h3>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                                    <div className="settings-form-group">
                                                        <label className="settings-label">Số tiền rút tối thiểu</label>
                                                        <div className="settings-input-wrapper">
                                                            <span className="settings-input-prefix">₫</span>
                                                            <input
                                                                className="settings-input settings-input-with-prefix"
                                                                type="text"
                                                                value={minWithdrawal}
                                                                onChange={(e) => setMinWithdrawal(e.target.value)}
                                                            />
                                                        </div>
                                                        <p className="settings-helper-text">Giảng viên phải đạt số tiền này trước khi yêu cầu thanh toán.</p>
                                                    </div>
                                                    <div className="settings-form-group">
                                                        <label className="settings-label">Thời gian giữ tiền</label>
                                                        <div className="settings-input-wrapper">
                                                            <select
                                                                className="settings-select"
                                                                value={escrowPeriod}
                                                                onChange={(e) => setEscrowPeriod(e.target.value)}
                                                            >
                                                                <option>Thanh toán tức thì</option>
                                                                <option>3 Ngày</option>
                                                                <option>7 Ngày</option>
                                                                <option>14 Ngày</option>
                                                                <option>30 Ngày</option>
                                                            </select>
                                                            <span className="material-symbols-outlined settings-select-chevron">expand_more</span>
                                                        </div>
                                                        <p className="settings-helper-text">Thời gian tiền được giữ sau giao dịch trước khi khả dụng.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            {/* Section 3: Tax Settings */}
                                            <section>
                                                <div className="settings-section-header">
                                                    <div className="settings-section-icon">
                                                        <span className="material-symbols-outlined">account_balance</span>
                                                    </div>
                                                    <h3 className="settings-section-title">Cài đặt thuế</h3>
                                                </div>
                                                <div className="settings-section-card">
                                                    <div className="tax-settings-row">
                                                        <div className="tax-info">
                                                            <div className="tax-header">
                                                                <h4 className="settings-label" style={{ margin: 0 }}>Thuế giá trị gia tăng (VAT)</h4>
                                                                {vatEnabled && <span className="tax-status-badge">Hoạt động</span>}
                                                            </div>
                                                            <p className="settings-page-desc">Bật tính toán VAT tự động cho các khu vực áp dụng.</p>
                                                        </div>
                                                        <div className="tax-controls">
                                                            {/* Toggle */}
                                                            <div className="toggle-wrapper">
                                                                <input
                                                                    type="checkbox"
                                                                    id="vat-toggle"
                                                                    className="toggle-input"
                                                                    checked={vatEnabled}
                                                                    onChange={() => setVatEnabled(!vatEnabled)}
                                                                />
                                                                <label htmlFor="vat-toggle" className="toggle-label"></label>
                                                            </div>

                                                            {vatEnabled && (
                                                                <div className="tax-rate-input-group">
                                                                    <label className="settings-label" style={{ fontSize: '12px', color: '#94a3b8' }}>Tỷ lệ mặc định</label>
                                                                    <div className="settings-input-wrapper">
                                                                        <input
                                                                            className="settings-input settings-input-with-suffix"
                                                                            type="text"
                                                                            value={vatRate}
                                                                            onChange={(e) => setVatRate(e.target.value)}
                                                                        />
                                                                        <span className="settings-input-suffix">%</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>

                                            {/* Section 4: Danger Zone */}
                                            <section>
                                                <div className="danger-zone">
                                                    <div className="danger-stripe"></div>
                                                    <div className="danger-content">
                                                        <div style={{ flex: 1 }}>
                                                            <div className="danger-header">
                                                                <span className="material-symbols-outlined" style={{ color: '#991b1b' }}>warning</span>
                                                                <h3 className="danger-title">Kiểm soát khẩn cấp</h3>
                                                            </div>
                                                            <p className="danger-text">Đóng băng tất cả thanh toán</p>
                                                            <p className="danger-subtext">Dừng tất cả các giao dịch đi ngay lập tức. Hành động này sẽ ghi lại nhật ký sự cố.</p>
                                                        </div>
                                                        {/* Red Toggle */}
                                                        <div className="toggle-wrapper">
                                                            <input
                                                                type="checkbox"
                                                                id="freeze-toggle"
                                                                className="toggle-input toggle-input-red"
                                                                checked={payoutsFrozen}
                                                                onChange={() => setPayoutsFrozen(!payoutsFrozen)}
                                                            />
                                                            <label htmlFor="freeze-toggle" className="toggle-label"></label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </div>

                                    {/* Sticky Footer */}
                                    <div className="settings-footer">
                                        <button className="btn-discard" onClick={handleDiscard}>Hủy thay đổi</button>
                                        <button className="btn-save" onClick={handleSave}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check</span>
                                            Lưu thay đổi
                                        </button>
                                    </div>
                                </>
                            )}


                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default AdminSettingsPage;
