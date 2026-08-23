import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { PageContainer, SectionCard, StatCard, StatusBadge } from '../../components/shared';
import { getCommissionConfig, updateCommissionConfig } from '../../services/adminCommission.service';
import { getWithdrawalLimitConfig, updateWithdrawalLimitConfig } from '../../services/adminWithdrawalLimit.service';
import { formatVNDNumber } from '../../utils/formatters';
import { apiErrorMessage } from '../../utils/apiError';

import '../../styles/pages/admin-settings.css';

const COMMISSION_RATE_MAX = 30;
const clampCommissionRate = (value: number) =>
    Number.isFinite(value) ? Math.min(COMMISSION_RATE_MAX, Math.max(0, value)) : 0;

export const AdminSettingsPage = () => {
    // Hoa hồng nền tảng là cấu hình thật duy nhất trên trang này — hai % tách riêng phụ huynh/gia
    // sư, khớp đúng model BE (system_configs + commission_config_history). Các mục còn lại (rút
    // tối thiểu, escrow, VAT, đóng băng payout) chưa có API nên vẫn giữ nguyên dạng mock cũ.
    const [parentFeePercent, setParentFeePercent] = useState<number>(5);
    const [tutorFeePercent, setTutorFeePercent] = useState<number>(5);
    const [loadingCommission, setLoadingCommission] = useState(true);
    const [savingCommission, setSavingCommission] = useState(false);

    const [minWithdrawal, setMinWithdrawal] = useState<number>(10000);
    const [loadingWithdrawalLimit, setLoadingWithdrawalLimit] = useState(true);
    const [escrowPeriod, setEscrowPeriod] = useState<string>('3 Ngày');
    const [vatEnabled, setVatEnabled] = useState<boolean>(true);
    const [vatRate, setVatRate] = useState<string>('20.0');
    const [payoutsFrozen, setPayoutsFrozen] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const config = await getCommissionConfig();
                if (cancelled) return;
                setParentFeePercent(config.parentFeePercent);
                setTutorFeePercent(config.tutorFeePercent);
            } catch (error) {
                if (!cancelled) toast.error(apiErrorMessage(error, 'Không tải được cấu hình hoa hồng.'));
            } finally {
                if (!cancelled) setLoadingCommission(false);
            }
        })();
        (async () => {
            try {
                const config = await getWithdrawalLimitConfig();
                if (cancelled) return;
                setMinWithdrawal(config.minWithdrawalAmount);
            } catch (error) {
                if (!cancelled) toast.error(apiErrorMessage(error, 'Không tải được ngưỡng rút tiền tối thiểu.'));
            } finally {
                if (!cancelled) setLoadingWithdrawalLimit(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleSave = async () => {
        setSavingCommission(true);
        try {
            const [commission, withdrawalLimit] = await Promise.all([
                updateCommissionConfig(parentFeePercent, tutorFeePercent),
                updateWithdrawalLimitConfig(minWithdrawal),
            ]);
            setParentFeePercent(commission.parentFeePercent);
            setTutorFeePercent(commission.tutorFeePercent);
            setMinWithdrawal(withdrawalLimit.minWithdrawalAmount);
            toast.success('Đã lưu cấu hình tài chính');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Không thể lưu cấu hình tài chính.'));
        } finally {
            setSavingCommission(false);
        }
    };

    const handleDiscard = async () => {
        try {
            const [config, withdrawalLimit] = await Promise.all([
                getCommissionConfig(),
                getWithdrawalLimitConfig(),
            ]);
            setParentFeePercent(config.parentFeePercent);
            setTutorFeePercent(config.tutorFeePercent);
            setMinWithdrawal(withdrawalLimit.minWithdrawalAmount);
        } catch {
            // Không tải lại được thì thôi giữ nguyên state hiện tại thay vì đè giá trị sai.
        }
        setEscrowPeriod('3 Ngày');
        setVatEnabled(true);
        setVatRate('20.0');
        setPayoutsFrozen(false);
        toast.info('Đã khôi phục cấu hình mặc định');
    };

    return (
        <PageContainer
            eyebrow="Hệ thống"
            eyebrowInfo="Quản lý cấu hình vận hành và các quy tắc tài chính của nền tảng."
            title="Cài đặt"
            headerAction={
                <div className="admin-ui-actions">
                    <button
                        className="admin-ui-button admin-ui-button-secondary"
                        onClick={handleDiscard}
                        disabled={savingCommission}
                    >
                        Hủy thay đổi
                    </button>
                    <button
                        className="admin-ui-button admin-ui-button-primary"
                        onClick={handleSave}
                        disabled={savingCommission || loadingCommission || loadingWithdrawalLimit}
                    >
                        <span className="material-symbols-outlined">check</span>
                        {savingCommission ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            }
        >
            <SectionCard className="settings-overview-card" headerBorder={false}>
                <div className="admin-ui-toolbar settings-admin-toolbar">
                    <span className="admin-ui-code-chip">Tài chính & thanh toán</span>
                </div>
            </SectionCard>

            <div className="settings-financial-stack">
                <div className="admin-ui-kpi-grid">
                    <StatCard
                        icon={<span className="material-symbols-outlined">percent</span>}
                        value={loadingCommission ? '—' : `${parentFeePercent}% + ${tutorFeePercent}%`}
                        label="Hoa hồng nền tảng"
                        subLabel="Phụ huynh + Gia sư, áp dụng trên mỗi booking"
                        badge="Đang dùng"
                        badgeVariant="dark"
                    />
                    <StatCard
                        icon={<span className="material-symbols-outlined">payments</span>}
                        value={loadingWithdrawalLimit ? '—' : `₫${formatVNDNumber(minWithdrawal)}`}
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
                    subtitle="Thiết lập phần trăm nền tảng khấu trừ trước khi thanh toán cho tutor — tách riêng phía phụ huynh và phía gia sư."
                    headerAction={
                        <StatusBadge variant="success">Đã kết nối dữ liệu thật — các mục khác trên trang vẫn là mẫu</StatusBadge>
                    }
                    padded
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="settings-slider-layout">
                            <div className="settings-slider-header">
                                <label className="settings-label" htmlFor="parent-fee-rate">
                                    Phí phụ huynh (cộng thêm vào giá)
                                </label>
                                <span className="settings-slider-value">
                                    <input
                                        type="number"
                                        min={0}
                                        max={COMMISSION_RATE_MAX}
                                        step="0.5"
                                        value={parentFeePercent}
                                        disabled={loadingCommission || savingCommission}
                                        onChange={(event) => setParentFeePercent(clampCommissionRate(Number(event.target.value)))}
                                        className="settings-slider-value-input"
                                        aria-label="Phí phụ huynh, phần trăm"
                                    />
                                    %
                                </span>
                            </div>
                            <input
                                id="parent-fee-rate"
                                type="range"
                                min="0"
                                max={COMMISSION_RATE_MAX}
                                step="0.5"
                                value={parentFeePercent}
                                disabled={loadingCommission || savingCommission}
                                onChange={(event) => setParentFeePercent(Number(event.target.value))}
                                className="settings-range-input"
                            />
                            <div className="settings-slider-labels">
                                <span>0%</span>
                                <span>30%</span>
                            </div>
                        </div>

                        <div className="settings-slider-layout">
                            <div className="settings-slider-header">
                                <label className="settings-label" htmlFor="tutor-fee-rate">
                                    Phí gia sư (trừ vào doanh thu)
                                </label>
                                <span className="settings-slider-value">
                                    <input
                                        type="number"
                                        min={0}
                                        max={COMMISSION_RATE_MAX}
                                        step="0.5"
                                        value={tutorFeePercent}
                                        disabled={loadingCommission || savingCommission}
                                        onChange={(event) => setTutorFeePercent(clampCommissionRate(Number(event.target.value)))}
                                        className="settings-slider-value-input"
                                        aria-label="Phí gia sư, phần trăm"
                                    />
                                    %
                                </span>
                            </div>
                            <input
                                id="tutor-fee-rate"
                                type="range"
                                min="0"
                                max={COMMISSION_RATE_MAX}
                                step="0.5"
                                value={tutorFeePercent}
                                disabled={loadingCommission || savingCommission}
                                onChange={(event) => setTutorFeePercent(Number(event.target.value))}
                                className="settings-range-input"
                            />
                            <div className="settings-slider-labels">
                                <span>0%</span>
                                <span>30%</span>
                            </div>
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
                                Số tiền rút tối thiểu <StatusBadge variant="success">Dữ liệu thật</StatusBadge>
                            </label>
                            <div className="settings-input-wrapper">
                                <span className="settings-input-prefix">₫</span>
                                <input
                                    id="min-withdrawal"
                                    className="settings-input settings-input-with-prefix"
                                    type="number"
                                    min={0}
                                    step="1000"
                                    value={minWithdrawal}
                                    disabled={loadingWithdrawalLimit || savingCommission}
                                    onChange={(event) => setMinWithdrawal(Math.max(0, Number(event.target.value) || 0))}
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
        </PageContainer>
    );
};

export default AdminSettingsPage;
