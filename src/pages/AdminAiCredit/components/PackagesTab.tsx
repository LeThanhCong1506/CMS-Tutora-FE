import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { SectionCard, ConfirmDialog } from '../../../components/shared';
import { useAccess } from '../../../contexts/AccessContext';
import {
  getAiCreditPackages,
  createAiCreditPackage,
  updateAiCreditPackage,
  deleteAiCreditPackage,
  uploadAiCreditPackageIcon,
} from '../../../services/aiCredit.service';
import type {
  AiCreditPackage,
  CreateAiCreditPackageBody,
  UpdateAiCreditPackageBody,
  PackageFormValues,
} from '../../../types/aiCredit.types';
import { PACKAGE_FORM_DEFAULT } from '../../../types/aiCredit.types';
import { formatVNDNumber } from '../../../utils/formatters';

import '../../../styles/pages/admin-shared.css';
import '../../../styles/pages/admin-ai-credit.css';

const formatPrice = (price: number, currency: string) =>
  price === 0
    ? 'Miễn phí'
    : currency.toUpperCase() === 'VND'
      ? `${formatVNDNumber(price)} ₫`
      : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);

interface PackageModalProps {
  mode: 'create' | 'edit';
  initialData?: AiCreditPackage;
  onClose: () => void;
  onSaved: () => void;
}

const PackageModal: React.FC<PackageModalProps> = ({ mode, initialData, onClose, onSaved }) => {
  const [form, setForm] = useState<PackageFormValues>(() => {
    if (mode === 'edit' && initialData) {
      return {
        code: initialData.code,
        name: initialData.name,
        creditAmount: String(initialData.creditAmount),
        price: String(initialData.price),
        currency: initialData.currency,
        isPurchasable: initialData.isPurchasable,
        isActive: initialData.isActive,
        sortOrder: String(initialData.sortOrder),
        description: initialData.description ?? '',
        iconUrl: initialData.iconUrl ?? '',
      };
    }
    return PACKAGE_FORM_DEFAULT;
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const setField = (key: keyof PackageFormValues, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Upload icon lên Cloudinary. Chỉ khả dụng ở chế độ SỬA (cần packageId đã tồn tại).
  const handleIconFile = async (file: File) => {
    if (mode !== 'edit' || !initialData) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh.');
      return;
    }
    setUploadingIcon(true);
    try {
      const updated = await uploadAiCreditPackageIcon(initialData.packageId, file);
      setField('iconUrl', updated.iconUrl ?? '');
      toast.success('Đã tải icon lên.');
      onSaved(); // refresh list để icon mới hiện ở bảng
    } catch {
      toast.error('Tải icon thất bại. Vui lòng thử lại.');
    } finally {
      setUploadingIcon(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.code.trim()) errs.code = 'Bắt buộc';
    else if (!/^[a-z0-9_-]{1,30}$/.test(form.code.trim()))
      errs.code = 'Chỉ chữ thường/số/-/_ tối đa 30 ký tự';
    if (!form.name.trim()) errs.name = 'Bắt buộc';
    if (Number(form.creditAmount) < 0) errs.creditAmount = 'Phải ≥ 0';
    if (Number(form.price) < 0) errs.price = 'Phải ≥ 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        creditAmount: Number(form.creditAmount),
        price: Number(form.price),
        currency: form.currency || 'VND',
        isPurchasable: form.isPurchasable,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder),
        description: form.description.trim() || null,
        iconUrl: form.iconUrl.trim() || null,
      };
      if (mode === 'create') {
        await createAiCreditPackage({ code: form.code.trim(), ...payload } as CreateAiCreditPackageBody);
        toast.success('Đã tạo gói AI Credit mới.');
      } else {
        await updateAiCreditPackage(initialData!.packageId, payload as UpdateAiCreditPackageBody);
        toast.success('Đã cập nhật gói AI Credit.');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { status?: number; data?: { errorCode?: string; message?: string } };
      };
      const code = apiErr?.response?.data?.errorCode;
      if (apiErr?.response?.status === 409 || code === 'AI_CREDIT_PACKAGE_CODE_EXISTS') {
        toast.error('Mã gói đã tồn tại. Vui lòng chọn mã khác.');
        setErrors({ code: 'Mã gói đã tồn tại' });
      } else {
        toast.error(apiErr?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="ai-credit-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ai-credit-modal" role="dialog" aria-modal="true" aria-labelledby="pkg-modal-title">
        {/* Header */}
        <div className="ai-credit-modal-header">
          <div className="ai-credit-modal-title" id="pkg-modal-title">
            <span className="material-symbols-outlined">
              {mode === 'create' ? 'add_circle' : 'edit'}
            </span>
            {mode === 'create' ? 'Tạo gói AI Credit' : `Sửa gói "${initialData?.name}"`}
          </div>
          <button
            id="pkg-modal-close"
            className="ai-credit-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div className="ai-credit-modal-body">
          {/* Icon (tải ảnh lên Cloudinary) — ở TOP modal, căn trái */}
          <div className="ai-credit-form-field full-width" style={{ alignItems: 'flex-start', display: 'flex', flexDirection: 'row', gap: 12 }}>
            <div className="ai-credit-icon-upload-preview">
              {form.iconUrl ? (
                <img
                  src={form.iconUrl}
                  alt="icon"
                  onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                />
              ) : (
                <span className="material-symbols-outlined">image</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleIconFile(f); }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <label className="ai-credit-form-label">Icon gói</label>
              {mode === 'edit' ? (
                <button
                  type="button"
                  className="admin-ui-button admin-ui-button-secondary"
                  disabled={uploadingIcon}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {uploadingIcon ? 'progress_activity' : 'upload'}
                  </span>
                  {uploadingIcon ? 'Đang tải…' : form.iconUrl ? 'Đổi icon' : 'Tải icon lên'}
                </button>
              ) : (
                <span className="ai-credit-form-hint">Lưu gói trước, sau đó mở lại để tải icon lên.</span>
              )}
            </div>
          </div>

          {/* Code + Name */}
          <div className="ai-credit-form-row">
            <div className="ai-credit-form-field">
              <label className="ai-credit-form-label ai-credit-form-label-required" htmlFor="pkg-code">
                Mã gói (code)
              </label>
              <input
                id="pkg-code"
                className={`ai-credit-form-input${errors.code ? ' error' : ''}`}
                value={form.code}
                onChange={(e) => setField('code', e.target.value.toLowerCase())}
                disabled={mode === 'edit'}
                placeholder="vd: plus"
                maxLength={30}
              />
              {errors.code && (
                <span className="ai-credit-form-hint" style={{ color: '#dc2626' }}>{errors.code}</span>
              )}
              {mode === 'edit' && (
                <span className="ai-credit-form-hint">Code không thể thay đổi sau khi tạo.</span>
              )}
            </div>

            <div className="ai-credit-form-field">
              <label className="ai-credit-form-label ai-credit-form-label-required" htmlFor="pkg-name">
                Tên gói
              </label>
              <input
                id="pkg-name"
                className={`ai-credit-form-input${errors.name ? ' error' : ''}`}
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="vd: Plus"
                maxLength={100}
              />
              {errors.name && (
                <span className="ai-credit-form-hint" style={{ color: '#dc2626' }}>{errors.name}</span>
              )}
            </div>
          </div>

          {/* Credits + Price */}
          <div className="ai-credit-form-row">
            <div className="ai-credit-form-field">
              <label className="ai-credit-form-label ai-credit-form-label-required" htmlFor="pkg-credits">
                Số lượt AI
              </label>
              <input
                id="pkg-credits"
                className={`ai-credit-form-input${errors.creditAmount ? ' error' : ''}`}
                type="number"
                min={0}
                value={form.creditAmount}
                onChange={(e) => setField('creditAmount', e.target.value)}
              />
              {errors.creditAmount && (
                <span className="ai-credit-form-hint" style={{ color: '#dc2626' }}>
                  {errors.creditAmount}
                </span>
              )}
            </div>

            <div className="ai-credit-form-field">
              <label className="ai-credit-form-label ai-credit-form-label-required" htmlFor="pkg-price">
                Giá (VND)
              </label>
              <input
                id="pkg-price"
                className={`ai-credit-form-input${errors.price ? ' error' : ''}`}
                type="number"
                min={0}
                step={1000}
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
              />
              {errors.price && (
                <span className="ai-credit-form-hint" style={{ color: '#dc2626' }}>{errors.price}</span>
              )}
              <span className="ai-credit-form-hint">Nhập 0 cho gói miễn phí.</span>
            </div>
          </div>

          {/* Sort order */}
          <div className="ai-credit-form-row">
            <div className="ai-credit-form-field">
              <label className="ai-credit-form-label" htmlFor="pkg-sort">Thứ tự hiển thị</label>
              <input
                id="pkg-sort"
                className="ai-credit-form-input"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setField('sortOrder', e.target.value)}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="ai-credit-toggle-row">
            <div className="ai-credit-toggle-info">
              <span className="ai-credit-toggle-label">Đang hoạt động</span>
              <span className="ai-credit-toggle-desc">Gói hiển thị trong hệ thống.</span>
            </div>
            <label className="ai-credit-toggle-switch">
              <input
                type="checkbox"
                id="pkg-active"
                checked={form.isActive}
                onChange={(e) => setField('isActive', e.target.checked)}
              />
              <span className="ai-credit-toggle-track" />
            </label>
          </div>

          <div className="ai-credit-toggle-row">
            <div className="ai-credit-toggle-info">
              <span className="ai-credit-toggle-label">Có thể mua</span>
              <span className="ai-credit-toggle-desc">
                Bật để cho phép user mua. Gói Free thường để tắt.
              </span>
            </div>
            <label className="ai-credit-toggle-switch">
              <input
                type="checkbox"
                id="pkg-purchasable"
                checked={form.isPurchasable}
                onChange={(e) => setField('isPurchasable', e.target.checked)}
              />
              <span className="ai-credit-toggle-track" />
            </label>
          </div>

          {/* Description */}
          <div className="ai-credit-form-field full-width">
            <label className="ai-credit-form-label" htmlFor="pkg-desc">Mô tả (tuỳ chọn)</label>
            <textarea
              id="pkg-desc"
              className="ai-credit-form-textarea"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Mô tả ngắn về gói này…"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="ai-credit-modal-footer">
          <button
            id="pkg-modal-cancel"
            className="admin-ui-button admin-ui-button-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>
          <button
            id="pkg-modal-save"
            className="admin-ui-button admin-ui-button-primary"
            onClick={handleSubmit}
            disabled={saving}
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
                {mode === 'create' ? 'Tạo gói' : 'Lưu thay đổi'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────
// PackagesTab
// ─────────────────────────────────────
export const PackagesTab: React.FC = () => {
  const { can } = useAccess();
  const canWrite = can('promotion.manage');

  const [packages, setPackages] = useState<AiCreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    pkg?: AiCreditPackage;
  }>({ open: false, mode: 'create' });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    pkg?: AiCreditPackage;
  }>({ open: false });
  const [deleting, setDeleting] = useState(false);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAiCreditPackages();
      data.sort((a, b) => a.sortOrder - b.sortOrder || a.packageId - b.packageId);
      setPackages(data);
    } catch {
      toast.error('Không thể tải danh sách gói AI Credit.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPackages();
  }, [loadPackages]);

  const filtered = packages.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.code.includes(q);
  });

  const handleSoftDelete = async () => {
    if (!deleteConfirm.pkg) return;
    setDeleting(true);
    try {
      await deleteAiCreditPackage(deleteConfirm.pkg.packageId);
      toast.success('Đã vô hiệu hóa gói.');
      setDeleteConfirm({ open: false });
      await loadPackages();
    } catch {
      toast.error('Không thể vô hiệu hóa gói. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <SectionCard>
        {/* Toolbar */}
        <div className="admin-ui-toolbar">
          <div className="admin-ui-search">
            <span className="material-symbols-outlined admin-ui-search-icon">search</span>
            <input
              id="ai-credit-pkg-search"
              className="admin-ui-search-input"
              placeholder="Tìm theo tên hoặc mã gói…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-ui-actions">
            <span className="admin-ui-code-chip">
              {packages.filter((p) => p.isActive).length} đang hoạt động ·{' '}
              {packages.filter((p) => p.isPurchasable).length} có thể mua
            </span>
            {canWrite && (
              <button
                id="ai-credit-create-pkg-btn"
                className="admin-ui-button admin-ui-button-primary"
                onClick={() => setModal({ open: true, mode: 'create' })}
              >
                <span className="material-symbols-outlined">add</span>
                Tạo gói mới
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="admin-ui-muted-state">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32, display: 'block', marginBottom: 8 }}
            >
              hourglass_empty
            </span>
            Đang tải…
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-ui-muted-state">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32, display: 'block', marginBottom: 8 }}
            >
              inbox
            </span>
            {search ? 'Không tìm thấy gói phù hợp.' : 'Chưa có gói nào. Hãy tạo gói đầu tiên!'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.2px solid rgba(62,47,40,0.08)' }}>
                  {['Icon', 'Mã gói', 'Tên', 'Số lượt AI', 'Giá', 'Trạng thái', 'Mua được', ''].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 16px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: 'var(--color-navy-50)',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          background: 'rgba(250,249,246,0.6)',
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((pkg) => (
                  <tr
                    key={pkg.packageId}
                    style={{ borderBottom: '1px solid rgba(62,47,40,0.06)', transition: 'background 0.12s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(250,249,246,0.5)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      {pkg.iconUrl ? (
                        <img
                          src={pkg.iconUrl}
                          alt={pkg.name}
                          className="ai-credit-pkg-icon"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span
                        className="material-symbols-outlined ai-credit-pkg-icon-fallback"
                        style={{ display: pkg.iconUrl ? 'none' : 'flex' }}
                      >
                        auto_awesome
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="ai-credit-code-chip">{pkg.code}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="admin-ui-entity">
                        <span className="admin-ui-entity-primary">{pkg.name}</span>
                        {pkg.description && (
                          <span className="admin-ui-entity-secondary" style={{ maxWidth: 200 }}>
                            {pkg.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div className="ai-credit-amount-cell">
                        <span className="ai-credit-amount-value">
                          {pkg.creditAmount.toLocaleString('vi-VN')}
                        </span>
                        <span className="ai-credit-amount-unit">lượt</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {pkg.price === 0 ? (
                        <span className="ai-credit-price ai-credit-price-free">Miễn phí</span>
                      ) : (
                        <span className="ai-credit-price">
                          {formatPrice(pkg.price, pkg.currency)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className={`ai-credit-badge ${
                          pkg.isActive ? 'ai-credit-badge-active' : 'ai-credit-badge-inactive'
                        }`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                          {pkg.isActive ? 'check_circle' : 'cancel'}
                        </span>
                        {pkg.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className={`ai-credit-badge ${
                          pkg.isPurchasable
                            ? 'ai-credit-badge-purchasable'
                            : 'ai-credit-badge-free'
                        }`}
                      >
                        {pkg.isPurchasable ? 'Có thể mua' : 'Không bán'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {canWrite && (
                        <div className="ai-credit-table-actions">
                          <button
                            id={`ai-credit-edit-pkg-${pkg.packageId}`}
                            className="ai-credit-action-btn"
                            title="Sửa gói"
                            onClick={() => setModal({ open: true, mode: 'edit', pkg })}
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          {pkg.isActive && (
                            <button
                              id={`ai-credit-disable-pkg-${pkg.packageId}`}
                              className="ai-credit-action-btn danger"
                              title="Vô hiệu hóa gói"
                              onClick={() => setDeleteConfirm({ open: true, pkg })}
                            >
                              <span className="material-symbols-outlined">block</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Modals */}
      {modal.open && (
        <PackageModal
          mode={modal.mode}
          initialData={modal.pkg}
          onClose={() => setModal({ open: false, mode: 'create' })}
          onSaved={loadPackages}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Vô hiệu hóa gói"
        description={
          <span>
            Bạn chắc chắn muốn vô hiệu hóa gói{' '}
            <strong>{deleteConfirm.pkg?.name}</strong>?
            <br />
            <span style={{ fontSize: 13, color: 'var(--color-navy-50)' }}>
              Gói sẽ không còn xuất hiện để mua. Lịch sử giao dịch vẫn được giữ nguyên.
            </span>
          </span>
        }
        confirmLabel="Vô hiệu hóa"
        destructive
        busy={deleting}
        onConfirm={handleSoftDelete}
        onCancel={() => setDeleteConfirm({ open: false })}
      />
    </>
  );
};
