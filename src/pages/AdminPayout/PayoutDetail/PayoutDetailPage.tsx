import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Typography, Breadcrumb, Card, Row, Col, Space,
    Button, Descriptions, Tag, Divider, Skeleton
} from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    UserOutlined,
    BankOutlined,
    WalletOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import {
    getPayoutRequestDetail,
    approvePayoutRequest,
    rejectPayoutRequest
} from '../../../services/adminPayout.service';
import type { AdminWithdrawalDetail } from '../../../types/adminPayout.types';
import { formatCurrency, formatDateTime } from '../../../utils/formatters';
import WithdrawalStatusBadge from '../WithdrawalStatusBadge';
import FraudFlagsCard from './components/FraudFlagsCard';
import TrustScoreCard from './components/TrustScoreCard';
import PayoutTimeline from './components/PayoutTimeline';
import ApproveWithdrawalModal from './components/ApproveWithdrawalModal';
import RejectWithdrawalModal from './components/RejectWithdrawalModal';
import '../../../styles/pages/admin-payout.css';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;

const PayoutDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState<AdminWithdrawalDetail | null>(null);

    // Modal states
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await getPayoutRequestDetail(parseInt(id));
            setDetail(data);
        } catch (error) {
            console.error('Failed to fetch payout detail:', error);
            toast.error('Không thể tải chi tiết yêu cầu');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    const handleApprove = async (note: string) => {
        if (!id) return;
        setActionLoading(true);
        try {
            const result = await approvePayoutRequest(parseInt(id), note);
            if (result.success) {
                toast.success(result.message || 'Đã phê duyệt và chuyển tiền thành công');
                fetchDetail(); // Refresh data
                setApproveModalOpen(false);
            } else {
                toast.error(result.message || 'Phê duyệt thất bại');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (reason: string) => {
        if (!id) return;
        setActionLoading(true);
        try {
            const result = await rejectPayoutRequest(parseInt(id), reason);
            if (result.success) {
                toast.success('Đã từ chối yêu cầu rút tiền');
                fetchDetail();
                setRejectModalOpen(false);
            } else {
                toast.error(result.message || 'Từ chối thất bại');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi từ chối');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !detail) {
        return (
            <div className="admin-payout-container">
                <Skeleton active paragraph={{ rows: 10 }} />
            </div>
        );
    }

    if (!detail) return null;

    const { requestInfo, tutorInfo, scoreBreakdown, fraudFlags, walletInfo, timeline } = detail;
    const isPending = ['pending', 'pending_review', 'delayed'].includes(requestInfo.status);

    return (
        <div className="admin-payout-container">
            <div className="payout-header">
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Breadcrumb
                        items={[
                            { title: 'Quản trị' },
                            { title: 'Quản lý thanh toán', onClick: () => navigate('/admin-portal/payouts'), className: 'clickable' },
                            { title: `Yêu cầu #${id}` },
                        ]}
                    />
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={2} style={{ margin: 0 }}>
                                <Button
                                    icon={<ArrowLeftOutlined />}
                                    type="text"
                                    onClick={() => navigate('/admin-portal/payouts')}
                                    style={{ marginRight: '8px' }}
                                />
                                Yêu cầu rút tiền #{id}
                            </Title>
                        </Col>
                        <Col>
                            <Space>
                                {isPending && (
                                    <>
                                        <Button
                                            danger
                                            icon={<CloseCircleOutlined />}
                                            onClick={() => setRejectModalOpen(true)}
                                        >
                                            Từ chối
                                        </Button>
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            onClick={() => setApproveModalOpen(true)}
                                        >
                                            Phê duyệt & Chuyển tiền
                                        </Button>
                                    </>
                                )}
                                {!isPending && (
                                    <WithdrawalStatusBadge status={requestInfo.status} />
                                )}
                            </Space>
                        </Col>
                    </Row>
                </Space>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Space orientation="vertical" style={{ width: '100%' }} size={16}>
                        {/* Main Info Card */}
                        <Card title={<Space><InfoCircleOutlined /><span>Thông tin yêu quyết toán</span></Space>}>
                            <Descriptions column={{ xs: 1, sm: 2 }}>
                                <Descriptions.Item label="Số tiền yêu cầu">
                                    <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>{formatCurrency(requestInfo.amount)}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">
                                    <WithdrawalStatusBadge status={requestInfo.status} />
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngày tạo">
                                    {formatDateTime(requestInfo.createdAt)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngày xử lý">
                                    {requestInfo.processedAt ? formatDateTime(requestInfo.processedAt) : '---'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Hình thức duyệt">
                                    <Tag color={requestInfo.decision === 'AUTO_APPROVE' ? 'green' : 'orange'}>
                                        {requestInfo.decision || 'N/A'}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Mã Giao dịch PayOS">
                                    {requestInfo.payosTransactionId ? <Tag color="blue">{requestInfo.payosTransactionId}</Tag> : '---'}
                                </Descriptions.Item>
                            </Descriptions>

                            <Divider style={{ margin: '16px 0' }} />

                            <Title level={5}><BankOutlined /> Thông tin tài khoản nhận</Title>
                            <div className="bank-info-display">
                                <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                                    <Descriptions.Item label="Ngân hàng">{requestInfo.bankName || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Số tài khoản"><Text strong>{requestInfo.accountNumber || 'N/A'}</Text></Descriptions.Item>
                                    <Descriptions.Item label="Chủ tài khoản">{requestInfo.accountHolderName || 'N/A'}</Descriptions.Item>
                                </Descriptions>
                            </div>
                        </Card>

                        {/* Tutor Info */}
                        <Card title={<Space><UserOutlined /><span>Thông tin Gia sư</span></Space>}>
                            <Row gutter={24}>
                                <Col span={12}>
                                    <Descriptions column={1} size="small">
                                        <Descriptions.Item label="Họ tên"><Text strong>{tutorInfo.name}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Email">{tutorInfo.email}</Descriptions.Item>
                                        <Descriptions.Item label="Số điện thoại">{tutorInfo.phone}</Descriptions.Item>
                                        <Descriptions.Item label="Ngày tham gia">{formatDateTime(tutorInfo.joinedAt)}</Descriptions.Item>
                                    </Descriptions>
                                </Col>
                                <Col span={12} style={{ borderLeft: '1px solid #f0f0f0' }}>
                                    <Title level={5}><WalletOutlined /> Số dư ví hiện tại</Title>
                                    <Descriptions column={1} size="small">
                                        <Descriptions.Item label="Số dư khả dụng">
                                            <Text strong color="green">{formatCurrency(walletInfo.availableBalance)}</Text>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Tổng thu nhập">
                                            {formatCurrency(tutorInfo.totalEarnings)}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Số buổi học hoàn thành">
                                            {tutorInfo.completedLessons}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Col>
                            </Row>
                        </Card>

                        {/* Timeline */}
                        <PayoutTimeline events={timeline} loading={loading} />
                    </Space>
                </Col>

                <Col xs={24} lg={8}>
                    <Space direction="vertical" style={{ width: '100%' }} size={16}>
                        {/* Trust Score */}
                        <TrustScoreCard scoreData={scoreBreakdown} loading={loading} />

                        {/* Fraud Flags */}
                        <FraudFlagsCard flags={fraudFlags} loading={loading} />
                    </Space>
                </Col>
            </Row>

            {/* Modals */}
            <ApproveWithdrawalModal
                open={approveModalOpen}
                onCancel={() => setApproveModalOpen(false)}
                onConfirm={handleApprove}
                confirmLoading={actionLoading}
                amount={requestInfo.amount}
                tutorName={tutorInfo.name}
            />

            <RejectWithdrawalModal
                open={rejectModalOpen}
                onCancel={() => setRejectModalOpen(false)}
                onConfirm={handleReject}
                confirmLoading={actionLoading}
                tutorName={tutorInfo.name}
            />
        </div>
    );
};

export default PayoutDetailPage;
