import React from 'react';
import { Modal, Form, Input, Typography, Alert, Space } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { formatCurrency } from '../../../../utils/formatters';

const { Text } = Typography;
const { TextArea } = Input;

interface Props {
    open: boolean;
    onCancel: () => void;
    onConfirm: (note: string) => void;
    confirmLoading: boolean;
    amount: number;
    tutorName: string;
}

const ApproveWithdrawalModal: React.FC<Props> = ({
    open,
    onCancel,
    onConfirm,
    confirmLoading,
    amount,
    tutorName
}) => {
    const [form] = Form.useForm();

    const handleOk = () => {
        form.validateFields().then(values => {
            onConfirm(values.note);
        });
    };

    return (
        <Modal
            title={
                <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>Phê duyệt thanh toán</span>
                </Space>
            }
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            confirmLoading={confirmLoading}
            okText="Xác nhận phê duyệt"
            cancelText="Đóng"
            okButtonProps={{ color: 'primary', variant: 'solid' }}
        >
            <Alert
                message="Hành động này sẽ thực hiện chuyển tiền thật thông qua cổng thanh toán PayOS. Vui lòng kiểm tra kỹ số tiền và tài khoản thụ hưởng."
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
            />

            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Text>Gia sư:</Text>
                    <Text strong>{tutorName}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Số tiền quyết toán:</Text>
                    <Text strong style={{ color: '#52c41a', fontSize: '18px' }}>{formatCurrency(amount)}</Text>
                </div>
            </div>

            <Form form={form} layout="vertical">
                <Form.Item
                    name="note"
                    label="Ghi chú nội bộ (không bắt buộc)"
                    tooltip="Ghi chú này sẽ chỉ hiển thị cho Admin trong lịch sử xử lý"
                >
                    <TextArea rows={3} placeholder="Ví dụ: Đã kiểm tra đối soát, thông tin hợp lệ." />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ApproveWithdrawalModal;
