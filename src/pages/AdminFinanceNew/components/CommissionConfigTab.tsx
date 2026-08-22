import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { DataTable } from '../../../components/shared';
import type { DataTableColumn } from '../../../components/shared';
import {
    getCommissionConfig,
    updateCommissionConfig,
    type CommissionConfigHistoryItem,
    type CommissionConfigWithHistory,
} from '../../../services/adminCommission.service';
import { formatDate } from '../../../utils/formatters';

const historyColumns: DataTableColumn<CommissionConfigHistoryItem>[] = [
    { key: 'date', title: 'Ngày áp dụng', render: (r) => formatDate(r.changedAt) },
    { key: 'parent', title: 'Phí phụ huynh', render: (r) => `${r.parentFeePercent}%` },
    { key: 'tutor', title: 'Phí gia sư', render: (r) => `${r.tutorFeePercent}%` },
    { key: 'by', title: 'Người cập nhật', render: (r) => r.changedByName ?? '—' },
];

const CommissionConfigTab = () => {
    const [config, setConfig] = useState<CommissionConfigWithHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [parentFeePercent, setParentFeePercent] = useState('');
    const [tutorFeePercent, setTutorFeePercent] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getCommissionConfig();
                if (cancelled) return;
                setConfig(data);
                setParentFeePercent(String(data.parentFeePercent));
                setTutorFeePercent(String(data.tutorFeePercent));
            } catch {
                if (!cancelled) toast.error('Không tải được cấu hình hoa hồng.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleCancel = () => {
        if (!config) return;
        setParentFeePercent(String(config.parentFeePercent));
        setTutorFeePercent(String(config.tutorFeePercent));
    };

    const handleSave = async () => {
        const parent = Number(parentFeePercent);
        const tutor = Number(tutorFeePercent);
        if (!Number.isFinite(parent) || !Number.isFinite(tutor) || parent < 0 || parent > 100 || tutor < 0 || tutor > 100) {
            toast.warning('Phí sàn phải là số trong khoảng 0-100%.');
            return;
        }

        setSaving(true);
        try {
            const updated = await updateCommissionConfig(parent, tutor);
            setConfig(updated);
            setParentFeePercent(String(updated.parentFeePercent));
            setTutorFeePercent(String(updated.tutorFeePercent));
            toast.success('Đã cập nhật phí sàn.');
        } catch {
            toast.error('Không thể lưu cấu hình hoa hồng.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="fin2-hint">Đang tải cấu hình...</div>;
    }

    return (
        <div className="fin2-stack">
            <div className="fin2-panel">
                <h4>Hoa hồng nền tảng</h4>
                <p className="fin2-hint">
                    Đổi trực tiếp ở đây, không cần deploy lại backend — <code>BookingFeeCalculator.cs</code> giờ đọc
                    giá trị từ đây.
                </p>
                <div className="fin2-grid-2">
                    <label className="financial-filter-field">
                        <span>Phí phụ huynh (cộng thêm vào giá)</span>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={parentFeePercent}
                            onChange={(e) => setParentFeePercent(e.target.value)}
                        />
                    </label>
                    <label className="financial-filter-field">
                        <span>Phí gia sư (trừ vào doanh thu)</span>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            value={tutorFeePercent}
                            onChange={(e) => setTutorFeePercent(e.target.value)}
                        />
                    </label>
                    <label className="financial-filter-field">
                        <span>Cập nhật lần cuối</span>
                        <input type="text" disabled value={config?.updatedAt ? formatDate(config.updatedAt) : '—'} />
                    </label>
                    <label className="financial-filter-field">
                        <span>Tổng hoa hồng nền tảng</span>
                        <input
                            type="text"
                            disabled
                            value={`${(Number(parentFeePercent) || 0) + (Number(tutorFeePercent) || 0)}%`}
                        />
                    </label>
                </div>
                <div className="admin-ui-actions" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
                    <button type="button" className="admin-ui-button admin-ui-button-secondary" onClick={handleCancel} disabled={saving}>
                        Huỷ thay đổi
                    </button>
                    <button
                        type="button"
                        className="admin-ui-button admin-ui-button-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                    </button>
                </div>
            </div>

            <div>
                <h4>Lịch sử thay đổi</h4>
                <DataTable
                    columns={historyColumns}
                    data={config?.history ?? []}
                    rowKey="changedAt"
                    variant="embedded"
                    density="compact"
                    adaptive
                    minWidth={560}
                />
            </div>
        </div>
    );
};

export default CommissionConfigTab;
