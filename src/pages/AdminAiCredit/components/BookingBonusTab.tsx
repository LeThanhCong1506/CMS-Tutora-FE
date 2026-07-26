import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { SectionCard } from '../../../components/shared';
import { useAccess } from '../../../contexts/AccessContext';
import { getBookingBonus, updateBookingBonus } from '../../../services/aiCredit.service';

import '../../../styles/pages/admin-shared.css';
import '../../../styles/pages/admin-ai-credit.css';

export const BookingBonusTab: React.FC = () => {
  const { can } = useAccess();
  const canWrite = can('promotion.manage');

  const [amount, setAmount] = useState<number | ''>('');
  const [savedAmount, setSavedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cfg = await getBookingBonus();
        setAmount(cfg.amount);
        setSavedAmount(cfg.amount);
      } catch {
        toast.error('Không thể tải cấu hình hạn mức. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isDirty = amount !== '' && Number(amount) !== savedAmount;

  const handleSave = async () => {
    const val = Number(amount);
    if (amount === '' || isNaN(val) || val < 0) {
      toast.error('Số lượt phải là số nguyên không âm.');
      return;
    }
    setSaving(true);
    try {
      const cfg = await updateBookingBonus(val);
      setSavedAmount(cfg.amount);
      setAmount(cfg.amount);
      toast.success('Đã lưu cấu hình hạn mức booking.');
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { status?: number; data?: { errorCode?: string; message?: string } };
      };
      const code = apiErr?.response?.data?.errorCode;
      if (apiErr?.response?.status === 400 || code === 'AI_CREDIT_INVALID_AMOUNT') {
        toast.error('Số lượt không hợp lệ. Phải ≥ 0.');
      } else {
        toast.error(apiErr?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard>
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {loading ? (
          <div className="admin-ui-muted-state">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32, display: 'block', marginBottom: 8 }}
            >
              hourglass_empty
            </span>
            Đang tải cấu hình…
          </div>
        ) : (
          <>
            {/* Field */}
            <div className="ai-credit-settings-panel">
              <div className="ai-credit-settings-field-wrap">
                <div className="ai-credit-settings-field-title">Lượt tặng khi đặt gia sư</div>
                <div className="ai-credit-settings-field-desc">
                  Học viên nhận được số lượt này khi đặt lịch thành công.
                </div>
                <div className="ai-credit-settings-input-row">
                  <input
                    id="ai-credit-booking-bonus-input"
                    className="ai-credit-settings-number-input"
                    type="number"
                    min={0}
                    step={1}
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    disabled={!canWrite || saving}
                    aria-label="Số lượt AI tặng mỗi booking"
                  />
                  <span className="ai-credit-settings-unit">lượt / lần đặt</span>
                </div>

                {/* Current value */}
                {!isDirty && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span className="admin-ui-code-chip">Hiện tại: {savedAmount} lượt</span>
                    {savedAmount === 0 && (
                      <span className="ai-credit-badge ai-credit-badge-inactive">Đang tắt</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {canWrite && (
                <div style={{ display: 'flex', gap: 10 }}>
                  {isDirty && (
                    <button
                      id="ai-credit-settings-discard"
                      className="admin-ui-button admin-ui-button-secondary"
                      onClick={() => setAmount(savedAmount)}
                      disabled={saving}
                    >
                      Hủy thay đổi
                    </button>
                  )}
                  <button
                    id="ai-credit-settings-save"
                    className="admin-ui-button admin-ui-button-primary"
                    onClick={handleSave}
                    disabled={saving || !isDirty}
                    style={{ opacity: !isDirty ? 0.45 : 1 }}
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          progress_activity
                        </span>
                        Đang lưu…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">check</span>
                        Lưu thay đổi
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Callout */}
              <div className="ai-credit-settings-callout">
                <span className="material-symbols-outlined">info</span>
                <div className="text-black">
                  <strong>Lưu ý:</strong> Thay đổi chỉ áp dụng cho lần đặt gia sư <em>mới</em> sau khi
                  lưu. Các booking đã tồn tại không bị ảnh hưởng.
                  {!canWrite && (
                    <div style={{ marginTop: 6, color: '#b45309' }}>
                      Bạn cần quyền <code>promotion.manage</code> để thay đổi cấu hình này.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Overview cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              {[
                { icon: 'package_2', label: 'Gói Free', desc: 'Tặng khi tạo tài khoản học viên' },
                { icon: 'shopping_cart', label: 'Gói trả phí', desc: 'Plus / Pro' },
                {
                  icon: 'event_note',
                  label: 'Thưởng booking',
                  desc: 'Tặng tự động khi có lịch đặt xác nhận',
                },
              ].map((item) => (
                <div
                  key={item.icon}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(62,47,40,0.08)',
                    background: 'rgba(250,249,246,0.5)',
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 22, color: 'var(--color-burgundy)', flexShrink: 0 }}
                  >
                    {item.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-navy)' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-navy-100)', marginTop: 2 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
};
