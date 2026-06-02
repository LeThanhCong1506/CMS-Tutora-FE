import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDisputes, getDisputeStats } from '../../services/admin.service';
import type { DisputeForAdmin, DisputeStatsDto } from '../../types/admin.types';
import { formatCurrency, formatRelativeTime, formatDisputeType } from '../../utils/formatters';

import '../../styles/pages/admin-dashboard.css';

const AdminDisputesPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    const [disputes, setDisputes] = useState<DisputeForAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DisputeStatsDto | null>(null);

    // Fetch disputes on mount and when tab changes
    useEffect(() => {
        fetchDisputes();
        fetchStats();
    }, []);

    useEffect(() => {
        fetchDisputes();
    }, [activeTab]);

    const fetchDisputes = async () => {
        try {
            setLoading(true);
            const statusFilter = activeTab === 'all' ? undefined : activeTab;
            const data = await getDisputes({
                status: statusFilter,
                page: 1,
                pageSize: 20,
            });
            setDisputes(data);
        } catch (err) {
            console.error('Error fetching disputes:', err);
            setDisputes([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const data = await getDisputeStats();
            setStats(data);
        } catch (err) {
            console.error('Error fetching dispute stats:', err);
        }
    };

    const totalActive = stats ? stats.totalPending + stats.totalInvestigating : 0;

    return (
        <>

            <main className="admin-main">
                <div className="admin-content" style={{ paddingTop: '40px' }}>
                    <div className="admin-content-inner">
                        {/* Header */}
                        <header className="dispute-header">
                            <div className="dispute-title-section">
                                <h1 className="dispute-title">Trung tâm Giải quyết Khiếu nại</h1>
                                <p className="dispute-subtitle">Quản lý và giải quyết xung đột giữa học viên và gia sư một cách minh bạch.</p>
                            </div>
                            <div className="dispute-header-actions">
                                <button className="admin-action-btn admin-action-btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>file_download</span>
                                    Xuất báo cáo
                                </button>
                            </div>
                        </header>

                        {/* Stats Grid */}
                        <div className="dispute-stats-grid">
                            {/* Card 1 - Active */}
                            <div className="dispute-stat-card">
                                <div className="dispute-stat-header">
                                    <div className="dispute-stat-icon-wrapper dispute-icon-navy">
                                        <span className="material-symbols-outlined">folder_open</span>
                                    </div>
                                    <span className="material-symbols-outlined dispute-more-icon">more_horiz</span>
                                </div>
                                <p className="dispute-stat-label">Chờ xử lý</p>
                                <p className="dispute-stat-value dispute-value-navy">{stats?.totalPending ?? '—'}</p>
                                <div className="dispute-stat-meta dispute-meta-gray">
                                    Cần xem xét và phân loại
                                </div>
                            </div>

                            {/* Card 2 - Investigating */}
                            <div className="dispute-stat-card">
                                <div className="dispute-glow dispute-glow-gold"></div>
                                <div className="dispute-stat-header">
                                    <div className="dispute-stat-icon-wrapper dispute-icon-gold">
                                        <span className="material-symbols-outlined">search</span>
                                    </div>
                                    <span className="material-symbols-outlined dispute-more-icon">more_horiz</span>
                                </div>
                                <p className="dispute-stat-label">Đang điều tra</p>
                                <p className="dispute-stat-value dispute-value-gold">{stats?.totalInvestigating ?? '—'}</p>
                                <div className="dispute-stat-meta dispute-meta-gray">
                                    Đang thu thập bằng chứng
                                </div>
                            </div>

                            {/* Card 3 - Resolved */}
                            <div className="dispute-stat-card">
                                <div className="dispute-stat-header">
                                    <div className="dispute-stat-icon-wrapper dispute-icon-crimson">
                                        <span className="material-symbols-outlined">check_circle</span>
                                    </div>
                                    <span className="material-symbols-outlined dispute-more-icon">more_horiz</span>
                                </div>
                                <p className="dispute-stat-label">Đã giải quyết (tháng này)</p>
                                <p className="dispute-stat-value dispute-value-crimson">{stats?.resolvedThisMonth ?? '—'}</p>
                                <div className="dispute-stat-meta dispute-meta-gray">
                                    Tổng hoàn tiền: {stats ? formatCurrency(stats.totalRefundedThisMonth) : '—'}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="dispute-tabs-section">
                            <div className="dispute-tabs">
                                <button
                                    className={`dispute-tab ${activeTab === 'all' ? 'dispute-tab-active' : ''}`}
                                    onClick={() => setActiveTab('all')}
                                >
                                    <span className={`dispute-tab-label ${activeTab === 'all' ? 'dispute-tab-label-active' : ''}`}>Tất cả</span>
                                    <span className="dispute-tab-count dispute-count-navy">{totalActive || ''}</span>
                                </button>
                                <button
                                    className={`dispute-tab ${activeTab === 'pending' ? 'dispute-tab-active' : ''}`}
                                    onClick={() => setActiveTab('pending')}
                                >
                                    <span className={`dispute-tab-label ${activeTab === 'pending' ? 'dispute-tab-label-active' : ''}`}>Chờ xử lý</span>
                                    <span className="dispute-tab-count dispute-count-crimson">{stats?.totalPending || ''}</span>
                                </button>
                                <button
                                    className={`dispute-tab ${activeTab === 'investigating' ? 'dispute-tab-active' : ''}`}
                                    onClick={() => setActiveTab('investigating')}
                                >
                                    <span className={`dispute-tab-label ${activeTab === 'investigating' ? 'dispute-tab-label-active' : ''}`}>Đang điều tra</span>
                                </button>
                                <button
                                    className={`dispute-tab ${activeTab === 'resolved' ? 'dispute-tab-active' : ''}`}
                                    onClick={() => setActiveTab('resolved')}
                                >
                                    <span className={`dispute-tab-label ${activeTab === 'resolved' ? 'dispute-tab-label-active' : ''}`}>Đã giải quyết</span>
                                </button>
                            </div>
                        </div>

                        {/* Table Section */}
                        <div className="dispute-table-section">
                            {/* Controls */}
                            <div className="dispute-table-controls">
                                <div className="dispute-search-wrapper">
                                    <span className="material-symbols-outlined dispute-search-icon">search</span>
                                    <input
                                        className="dispute-search-input"
                                        placeholder="Tìm theo Mã hồ sơ hoặc Tên..."
                                        type="text"
                                    />
                                </div>
                                <div className="dispute-control-actions">
                                    <button className="dispute-control-btn" title="Filter">
                                        <span className="material-symbols-outlined">filter_list</span>
                                    </button>
                                    <button className="dispute-control-btn" title="Sort">
                                        <span className="material-symbols-outlined">sort</span>
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="dispute-table-container">
                                <table className="dispute-table">
                                    <thead className="dispute-thead">
                                        <tr>
                                            <th className="dispute-th" style={{ width: '80px' }}>Mã</th>
                                            <th className="dispute-th" style={{ minWidth: '180px' }}>Người khiếu nại</th>
                                            <th className="dispute-th" style={{ minWidth: '180px' }}>Gia sư</th>
                                            <th className="dispute-th" style={{ minWidth: '140px' }}>Loại</th>
                                            <th className="dispute-th">Số tiền</th>
                                            <th className="dispute-th">Trạng thái</th>
                                            <th className="dispute-th">Thời gian</th>
                                            <th className="dispute-th dispute-th-right" style={{ width: '120px' }}>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                                    Đang tải danh sách khiếu nại...
                                                </td>
                                            </tr>
                                        ) : disputes.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                                    Không có khiếu nại nào
                                                </td>
                                            </tr>
                                        ) : (
                                            disputes.map((dispute) => (
                                                <tr key={dispute.disputeId} className="dispute-tr">
                                                    <td className="dispute-td dispute-td-id">
                                                        #{dispute.disputeId}
                                                    </td>
                                                    <td className="dispute-td">
                                                        <span style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                                                            {dispute.createdByName || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="dispute-td">
                                                        <span style={{ fontWeight: 600, color: '#475569' }}>
                                                            {dispute.tutorName || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="dispute-td">
                                                        <span className="dispute-reason-title">
                                                            {dispute.disputeTypeDisplay || formatDisputeType(dispute.disputeType || '')}
                                                        </span>
                                                        {dispute.reason && (
                                                            <p className="dispute-reason-desc" style={{
                                                                maxWidth: '200px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {dispute.reason}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="dispute-td">
                                                        <div className={`dispute-amount-badge ${(dispute.lessonPrice || 0) > 1000000 ? 'dispute-amount-gold' : 'dispute-amount-gray'}`}>
                                                            {formatCurrency(dispute.lessonPrice || 0)}
                                                        </div>
                                                    </td>
                                                    <td className="dispute-td">
                                                        <span
                                                            className="dispute-priority-badge"
                                                            style={{
                                                                backgroundColor: dispute.statusColor + '20',
                                                                color: dispute.statusColor,
                                                                border: `1px solid ${dispute.statusColor}40`
                                                            }}
                                                        >
                                                            {dispute.statusDisplay || dispute.status}
                                                        </span>
                                                    </td>
                                                    <td className="dispute-td">
                                                        <div className="dispute-time dispute-time-gray">
                                                            <span className="material-symbols-outlined dispute-time-icon">calendar_clock</span>
                                                            {dispute.createdAt ? formatRelativeTime(dispute.createdAt) : 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td className="dispute-td dispute-td-right">
                                                        <button
                                                            className="dispute-action-btn"
                                                            onClick={() => navigate(`/admin-portal/disputes/${dispute.disputeId}`)}
                                                        >
                                                            Xem chi tiết
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="dispute-pagination">
                                <span className="dispute-pagination-info">Hiển thị {disputes.length} hồ sơ</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
};

export default AdminDisputesPage;
