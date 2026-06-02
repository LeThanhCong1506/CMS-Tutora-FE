import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Breadcrumb, Card, Input, DatePicker, Select } from 'antd';
import { toast } from 'react-toastify';
import { SearchOutlined } from '@ant-design/icons';
import { getAllPayoutRequests } from '../../../services/adminPayout.service';
import WithdrawalRequestTable from '../PayoutOverview/components/WithdrawalRequestTable';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AllPayoutRequestsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]); // Using any for table compatibility or will map
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Filters
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<string | undefined>(undefined);
    const [dateRange, setDateRange] = useState<[string, string] | undefined>(undefined);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: currentPage,
                pageSize: pageSize,
                ...(status && { status }),
                ...(search && { search }),
                ...(dateRange && { from: dateRange[0], to: dateRange[1] })
            };
            const response = await getAllPayoutRequests(params);

            // Map to the format expected by WithdrawalRequestTable if necessary
            // In a real app, the backend might return WithdrawalRequestItem which includes tutor names
            setData(response.items);
            setTotal(response.total);
        } catch (error) {
            console.error('Failed to fetch payout requests:', error);
            toast.error('Không thể tải danh sách yêu cầu');
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, search, status, dateRange]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleSearch = (value: string) => {
        setSearch(value);
        setCurrentPage(1);
    };

    const handleStatusChange = (value: string) => {
        setStatus(value === 'all' ? undefined : value);
        setCurrentPage(1);
    };

    const handleDateChange = (dates: any) => {
        if (!dates) {
            setDateRange(undefined);
        } else {
            setDateRange([dates[0].toISOString(), dates[1].toISOString()]);
        }
        setCurrentPage(1);
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <Breadcrumb
                    items={[
                        { title: 'Quản trị' },
                        { title: 'Quản lý thanh toán' },
                        { title: 'Lịch sử rút tiền' },
                    ]}
                    style={{ marginBottom: '16px' }}
                />
                <Title level={2}>Lịch sử rút tiền</Title>
                <Text type="secondary">Tra cứu toàn bộ các giao dịch rút tiền trong hệ thống</Text>
            </div>

            <Card variant="borderless" style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                    <Col xs={24} md={8}>
                        <Text strong style={{ display: 'block', marginBottom: '8px' }}>Tìm kiếm</Text>
                        <Input
                            placeholder="Mã yêu cầu, tên gia sư, email..."
                            prefix={<SearchOutlined />}
                            onPressEnter={(e) => handleSearch(e.currentTarget.value)}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <Text strong style={{ display: 'block', marginBottom: '8px' }}>Trạng thái</Text>
                        <Select
                            style={{ width: '100%' }}
                            defaultValue="all"
                            onChange={handleStatusChange}
                        >
                            <Option value="all">Tất cả trạng thái</Option>
                            <Option value="Pending">Chờ xử lý</Option>
                            <Option value="Approved">Đã phê duyệt</Option>
                            <Option value="Completed">Hoàn thành</Option>
                            <Option value="Rejected">Đã từ chối</Option>
                            <Option value="Cancelled">Đã hủy</Option>
                        </Select>
                    </Col>
                    <Col xs={24} md={10}>
                        <Text strong style={{ display: 'block', marginBottom: '8px' }}>Thời gian</Text>
                        <RangePicker
                            style={{ width: '100%' }}
                            onChange={handleDateChange}
                            placeholder={['Từ ngày', 'Đến ngày']}
                        />
                    </Col>
                </Row>
            </Card>

            <Card variant="borderless">
                <WithdrawalRequestTable
                    data={data}
                    loading={loading}
                    total={total}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    }}
                />
            </Card>
        </div>
    );
};

// Simple row to work around the missing import in the script
import { Row, Col } from 'antd';

export default AllPayoutRequestsPage;
