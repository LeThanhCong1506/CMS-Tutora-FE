import { useState } from 'react';

import '../../styles/pages/admin-dashboard.css';
import '../../styles/pages/admin-dispute-detail.css';

const AdminDisputeDetailPage = () => {
    const [activeTab, setActiveTab] = useState('chat');
    const [verdict, setVerdict] = useState('refund');

    return (
        <>

            <main className="admin-main">
                {/* Header */}
                <header className="dispute-detail-header">
                    <div className="dispute-detail-header-inner">
                        <div className="dispute-detail-top-row">
                            <div className="dispute-header-content">
                                <div className="dispute-breadcrumbs">
                                    <span className="dispute-breadcrumb-item">Giải quyết khiếu nại</span>
                                    <span style={{ color: '#81786a' }}>•</span>
                                    <span className="dispute-breadcrumb-item">Hồ sơ #8821</span>
                                </div>
                                <h1 className="dispute-detail-title">Hồ sơ #8821: Buổi học không diễn ra</h1>
                                <div className="dispute-detail-meta">
                                    <span>Tạo ngày 24/10/2023</span>
                                    <span>•</span>
                                    <span>Ưu tiên cao</span>
                                    <span>•</span>
                                    <span className="dispute-action-required">Cần xử lý</span>
                                </div>
                            </div>
                            <div className="dispute-detail-actions">
                                <div className="dispute-live-status">
                                    <div className="dispute-pulse-dot"></div>
                                    Đang xem xét trực tiếp
                                </div>
                                <div className="dispute-escrow-badge">
                                    Tiền giữ: $50.00
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="dispute-detail-content">
                    <div className="dispute-detail-container">
                        <div className="dispute-grid">
                            {/* LEFT COLUMN: The Parties */}
                            <div className="dispute-col-left">
                                {/* Plaintiff Card */}
                                <div className="dispute-party-card">
                                    <div className="dispute-border-indicator dispute-indicator-blue"></div>
                                    <div className="dispute-party-header">
                                        <span className="dispute-role-badge dispute-role-plaintiff">Nguyên đơn</span>
                                        <span className="material-symbols-outlined dispute-party-icon dispute-icon-blue">person</span>
                                    </div>
                                    <div className="dispute-party-info">
                                        <div className="dispute-party-avatar" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuArhHfB7OBL1OfbCsQ2JwHRqdXdSzoKC-i5x32K8gYi1l9hrjagdt8qGAMAli4W4rZh08kXrrc2oxSqrRMtwkhOjGdFZnqXYreckD51yhP-SRARCDlzvDiW0TetRt-VeXk94gkwauXZw_UOwVZeok0HoS_hV_3Ps2_q-XBl3hwEvQt1gZS48lsMTrtLWiIvyJ4qng1ObxL8eVRns11ufOWuPyUm2ji3d7TGx7fnD95bzxFTWgqv67bXH1yzEn6QHu31ykS07417oC0')" }}></div>
                                        <div>
                                            <h3 className="dispute-party-name">Học viên A</h3>
                                            <p className="dispute-party-id">ID: #9921</p>
                                        </div>
                                    </div>
                                    <div className="dispute-party-stats">
                                        <span className="material-symbols-outlined dispute-rating-star">star</span>
                                        <span className="dispute-stat-bold">4.8</span>
                                        <span className="dispute-stat-meta">(12 buổi học)</span>
                                    </div>
                                </div>

                                {/* Arrow Connector */}
                                <div className="dispute-connector">
                                    <span className="material-symbols-outlined dispute-connector-icon">arrow_downward</span>
                                </div>

                                {/* Defendant Card */}
                                <div className="dispute-party-card">
                                    <div className="dispute-border-indicator dispute-indicator-orange"></div>
                                    <div className="dispute-party-header">
                                        <span className="dispute-role-badge dispute-role-defendant">Bị đơn</span>
                                        <span className="material-symbols-outlined dispute-party-icon dispute-icon-orange">school</span>
                                    </div>
                                    <div className="dispute-party-info">
                                        <div className="dispute-party-avatar" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBAI8gPU3OSGyrtyGVpdKYbsB1bZ4jOfeByH1CzSHDISosXPoaX6zFD4oLjxhhKvpCmkjW7ckYp4UkJWs7uQdmOiqBXka8hJfEs2Ec7sGK2bUCbcxox8cU1tLF5xemU6KFx2BMou8f20BbhNVo6d959CaZ84oxtbuX4FPYhcyjM4jhfzx-ClAMiKwWHjcPa8dA3YhuCyzWUj6wkg8W789DZq3bEB9-gx9SnOmFB6AGTFAvaUIMhzOi30_YurwP1aAWiZqmwi1PeUUA')" }}></div>
                                        <div>
                                            <h3 className="dispute-party-name">Gia sư B</h3>
                                            <p className="dispute-party-id">ID: #3321</p>
                                        </div>
                                    </div>
                                    <div className="dispute-party-details">
                                        <div className="dispute-stat-row">
                                            <span style={{ color: '#81786a' }}>Môn học</span>
                                            <span className="dispute-stat-bold">Giải tích nâng cao</span>
                                        </div>
                                        <div className="dispute-stat-row">
                                            <span style={{ color: '#81786a' }}>Điểm danh</span>
                                            <span className="dispute-stat-green">98%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Claim Summary */}
                                <div className="dispute-claim-summary">
                                    <h4 className="dispute-claim-label">Nội dung khiếu nại</h4>
                                    <p className="dispute-claim-text">"Gia sư không xuất hiện trong buổi học lúc 2:00 PM EST. Tôi đã đợi 30 phút."</p>
                                </div>
                            </div>

                            {/* CENTER COLUMN: Evidence */}
                            <div className="dispute-col-center">
                                {/* Tabs */}
                                <div className="dispute-evidence-tabs">
                                    <button
                                        className={`dispute-evidence-tab ${activeTab === 'chat' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('chat')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">chat</span>
                                        Nhật ký chat
                                    </button>
                                    <button
                                        className={`dispute-evidence-tab ${activeTab === 'files' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('files')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">attach_file</span>
                                        Tệp tin (2)
                                    </button>
                                    <button
                                        className={`dispute-evidence-tab ${activeTab === 'recordings' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('recordings')}
                                    >
                                        <span className="material-symbols-outlined dispute-evidence-tab-icon">videocam</span>
                                        Ghi hình buổi học
                                    </button>
                                </div>

                                {/* Chat Simulation */}
                                <div className="dispute-chat-area">
                                    <div className="dispute-chat-date">
                                        <span>24 Tháng 10, 2023</span>
                                    </div>

                                    {/* Msg 1: Student */}
                                    <div className="dispute-message dispute-message-left">
                                        <div className="dispute-msg-content-wrapper">
                                            <div className="dispute-msg-avatar" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBjGsr1rX2CUArMgQG00FxYIH_rIJpAhZbaRZzn57afn6BHJHb4WGwc5U9rOuIenXE1vQV49LBXlYGC_DWyS-CqEHwLqOB-hZLGldycwnh-OYQFfQP1DXJtfSgukbfbvWZuvIwF0w-r5b7KZU4MG0lHfCyj3nov0OWylLiJcJddC9Dv2-3HQLCuo8kOySCYBJkOqwhZn4Z5GT2xaSQLzb5wazB2TEmIM7kfFPdCVeyu9NlE0rkbLdBCccqv_CklAIPhE-63tAbwMy0')" }}></div>
                                            <div className="dispute-msg-bubble">
                                                Xin chào, tôi đã vào lớp. Bạn có tham gia không?
                                            </div>
                                        </div>
                                        <span className="dispute-msg-time">2:00 PM</span>
                                    </div>

                                    {/* Msg 2: Student */}
                                    <div className="dispute-message dispute-message-left">
                                        <div className="dispute-msg-content-wrapper">
                                            <div className="dispute-msg-avatar" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBwLiOrfqdnWXbfI9M6mBdMfRK-q05L2wE4-r34uN74ZczLlnQh828xEx6WONgBPowTIXSHIm7-RVMJAIPsghyMyKiT7-9RyPbjXHHWpnwdx9heOoyBtZlZFJls1jJMpP24sN0s-ldJyC5_s6VMvF9bXeCeWoJxmNsWDwIv062C22RddjPiA74qgjchtXRpQjEIrmjPgvqzZna0A26ZBayMMwDeRO_ZrSZzO3wiCFiFGPHnBZruTwwT8p5PDM-BtG9dKKIomlU-5l4')" }}></div>
                                            <div className="dispute-msg-bubble">
                                                Đã 10 phút trôi qua...
                                            </div>
                                        </div>
                                        <span className="dispute-msg-time">2:10 PM</span>
                                    </div>

                                    {/* Msg 3: Tutor */}
                                    <div className="dispute-message dispute-message-right">
                                        <div className="dispute-msg-content-wrapper">
                                            <div className="dispute-msg-avatar" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCokUqzkwIPt-ZyVaaxm27WBoDMe448kDgOnQVerVZnpLmI5mucV8WYAsri6aVy29Iy5UjQntTW2504H9OENHOFm6sRzB_-ApO3aKoPP6DIFiyEmi_FuAdBp_zYWvL1PsnmVVVshn_efvs-hH9XrMPFefv9lAFrphu4Ntzx982_kYv95CTqOkVyrPDMXcEc2ppjQOiGBgWOY57nAGTBQzoDgaVsbkTs4XegllFVt50_6yhpVk0B8OVftHQWzqFVtJoCiePPtSMYM3M')" }}></div>
                                            <div className="dispute-msg-bubble">
                                                Xin lỗi! Mạng của tôi bị mất hoàn toàn. Tôi đang cố kết nối lại bằng 4G.
                                            </div>
                                        </div>
                                        <span className="dispute-msg-time">2:15 PM</span>
                                    </div>

                                    {/* System Msg */}
                                    <div className="dispute-system-msg">
                                        <div className="dispute-system-bubble">
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>info</span>
                                            Hệ thống: Học viên A đã kết thúc buổi học.
                                        </div>
                                    </div>

                                    {/* Msg 4: Student */}
                                    <div className="dispute-message dispute-message-left">
                                        <div className="dispute-msg-content-wrapper">
                                            <div className="dispute-msg-avatar" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAOiEwMwtWeA8UYvjkSV3Gf-xpmixZOUogeFf2xUy0AkJ9o-sjM0qfvf8AjaO7kLiKf5w34L2ia4yfKWK7JT5mGltClOuVWB2cNNK_yzTCw8dY8ytFPmZxk7M26CfU1y9py8JCGQW7JNVQsblWbslaqKvJjsf-zEtP2KDdRUaD3wcEpdxC1kNeRctNCOAYsHvUpSkZxayKBnXGIwFmNEMr4BJqsAR4G-bBUdRVHm4TeAzDtkQ9Bo749TD6zYmHa1sIuxSTwO6qj688')" }}></div>
                                            <div className="dispute-msg-bubble">
                                                Tôi không thể đợi thêm nữa, tôi có lớp khác. Vui lòng hoàn tiền cho tôi.
                                            </div>
                                        </div>
                                        <span className="dispute-msg-time">2:31 PM</span>
                                    </div>
                                </div>

                                <div className="dispute-chat-input">
                                    <div className="dispute-input-wrapper">
                                        <input
                                            className="dispute-input-field"
                                            placeholder="Phiên chat đã đóng. Khiếu nại đang được xử lý."
                                            disabled
                                            type="text"
                                        />
                                        <span className="material-symbols-outlined dispute-input-icon">lock</span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Verdict */}
                            <div className="dispute-col-right">
                                <div className="dispute-verdict-card">
                                    <div className="dispute-verdict-header">
                                        <h2 className="dispute-verdict-title">
                                            <span className="material-symbols-outlined">gavel</span>
                                            Phán quyết của Quản trị viên
                                        </h2>
                                        <p className="dispute-verdict-subtitle">Xem xét bằng chứng và đưa ra quyết định cuối cùng.</p>
                                    </div>

                                    <div className="dispute-verdict-form">
                                        <div className="dispute-options-group">
                                            <label className="dispute-radio-label">
                                                <input
                                                    type="radio"
                                                    name="verdict"
                                                    className="dispute-radio-input"
                                                    checked={verdict === 'refund'}
                                                    onChange={() => setVerdict('refund')}
                                                />
                                                <div className="dispute-radio-content">
                                                    <span className="dispute-radio-title">Hoàn tiền cho Học viên</span>
                                                    <span className="dispute-radio-desc">Hoàn lại $50.00 về nguồn</span>
                                                </div>
                                            </label>

                                            <label className="dispute-radio-label">
                                                <input
                                                    type="radio"
                                                    name="verdict"
                                                    className="dispute-radio-input"
                                                    checked={verdict === 'release'}
                                                    onChange={() => setVerdict('release')}
                                                />
                                                <div className="dispute-radio-content">
                                                    <span className="dispute-radio-title">Chuyển tiền cho Gia sư</span>
                                                    <span className="dispute-radio-desc">Chuyển $50.00 cho Gia sư B</span>
                                                </div>
                                            </label>

                                            <label className="dispute-radio-label">
                                                <input
                                                    type="radio"
                                                    name="verdict"
                                                    className="dispute-radio-input"
                                                    checked={verdict === 'split'}
                                                    onChange={() => setVerdict('split')}
                                                />
                                                <div className="dispute-radio-content">
                                                    <span className="dispute-radio-title">Chia tiền</span>
                                                    <span className="dispute-radio-desc">50% cho Học viên, 50% cho Gia sư</span>
                                                </div>
                                            </label>
                                        </div>

                                        <div className="dispute-reasoning-group">
                                            <span className="dispute-label">Lý do ra quyết định</span>
                                            <textarea
                                                className="dispute-textarea"
                                                placeholder="Vui lòng trích dẫn bằng chứng cụ thể từ nhật ký chat hoặc ghi hình..."
                                            ></textarea>
                                        </div>

                                        <button className="dispute-submit-btn">
                                            <span className="material-symbols-outlined" style={{ fontWeight: 'bold' }}>check_circle</span>
                                            Thực thi quyết định
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default AdminDisputeDetailPage;
