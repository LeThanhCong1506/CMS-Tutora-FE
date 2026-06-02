import React from 'react';
import { Modal, Form, Input, Alert, Space } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface Props {
    open: boolean;
    onCancel: () => void;
    onConfirm: (reason: string) => void;
    confirmLoading: boolean;
    tutorName: string;
}

const RejectWithdrawalModal: React.FC<Props> = ({
    open,
    onCancel,
    onConfirm,
    confirmLoading,
    tutorName
}) => {
    const [form] = Form.useForm();

    const handleOk = () => {
        form.validateFields().then(values => {
            onConfirm(values.reason);
        });
    };

    return (
        <Modal
            title={
                <Space>
                    <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    <span>Từ chối yêu cầu rút tiền</span>
                </Space>
            }
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            confirmLoading={confirmLoading}
            okText="Xác nhận từ chối"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
        >
            <Alert
                message={`Yêu cầu của ${tutorName} sẽ bị hủy và số tiền sẽ được hoàn lại vào ví của gia sư. Một thông báo lỗi sẽ được gửi tới tutor.`}
                type="error"
                showIcon
                style={{ marginBottom: '16px' }}
            />

            <Form form={form} layout="vertical">
                <Form.Item
                    name="reason"
                    label="Lý do từ chối (Gửi tới Tutor)"
                    rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối' }]}
                >
                    <TextArea
                        rows={4}
                        placeholder="Ví dụ: Thông tin tài khoản ngân hàng không chính xác. Tên chủ tài khoản không khớp với hồ sơ gia sư."
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default RejectWithdrawalModal;
