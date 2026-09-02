import { cloneElement, type MouseEventHandler, type ReactElement, type ReactNode } from 'react';
import { ConfigProvider, Popconfirm } from 'antd';
import type { PopconfirmProps, ThemeConfig } from 'antd';

/**
 * Token antd kéo về đúng bảng màu CMS (navy/gold, bo góc 8px, font Bricolage).
 *
 * Đặt ConfigProvider ngay trong component thay vì bọc ở App.tsx vì antd hiện chỉ
 * xuất hiện ở đúng các hộp xác nhận này — chưa có lý do bắt cả cây route đi qua
 * một provider nữa. Khi antd được dùng rộng hơn thì nhấc hằng số này lên App.
 */
const CMS_ANTD_THEME: ThemeConfig = {
    token: {
        colorPrimary: '#1a2238', // --color-navy
        colorText: '#1a2238',
        colorTextHeading: '#1a2238',
        // Đỏ mặc định của antd (#ff4d4f) chói hẳn so với bảng màu trầm của CMS;
        // lấy đúng sắc đỏ đang dùng cho cảnh báo trong các trang admin.
        colorError: '#b91c1c',
        borderRadius: 8, // --radius-button
        fontFamily: 'inherit', // thừa hưởng --font-primary từ body
        fontSize: 13,
    },
};

export type ConfirmPopoverProps = {
    /** Câu hỏi ngắn, in đậm ở dòng đầu. */
    title: ReactNode;
    /** Hệ quả của thao tác — số tiền, số buổi, thứ không hoàn tác được. */
    description?: ReactNode;
    okText?: string;
    cancelText?: string;
    /** Nút đồng ý màu đỏ + icon cảnh báo, cho thao tác đụng vào tiền hoặc không quay lại được. */
    danger?: boolean;
    placement?: PopconfirmProps['placement'];
    /**
     * Lần này không cần hỏi lại: click chạy thẳng `onConfirm`.
     *
     * Có prop này vì rc-trigger vẫn gọi `onClick` gốc của child khi popover bật —
     * để onClick trên nút thì hành động chạy ngay lúc mở hộp, hỏi thành vô nghĩa.
     * Nên chỗ gọi KHÔNG đặt onClick lên nút, mọi đường đều đi qua `onConfirm`.
     */
    skip?: boolean;
    onConfirm: () => void | Promise<void>;
    children: ReactElement<{ onClick?: MouseEventHandler<HTMLElement> }>;
};

/**
 * Hộp hỏi lại neo ngay cạnh nút vừa bấm — thay cho `window.confirm`.
 *
 * `window.confirm` khoá cả tab, không đổi được chữ nút hay màu sắc, và Chrome còn
 * kèm ô "chặn trang này hiện hộp thoại": admin tick nhầm một lần là từ đó mọi xác
 * nhận âm thầm trả về false, thao tác nguy hiểm bị huỷ mà không ai biết vì sao.
 */
export const ConfirmPopover = ({
    title,
    description,
    okText = 'Xác nhận',
    cancelText = 'Huỷ',
    danger = false,
    placement = 'topRight',
    skip = false,
    onConfirm,
    children,
}: ConfirmPopoverProps) => {
    if (skip) {
        return cloneElement(children, { onClick: () => void onConfirm() });
    }

    return (
        <ConfigProvider theme={CMS_ANTD_THEME}>
            <Popconfirm
                title={title}
                description={description}
                placement={placement}
                okText={okText}
                cancelText={cancelText}
                okButtonProps={{ danger }}
                icon={(
                    <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                        style={{
                            fontSize: '18px',
                            lineHeight: 1,
                            marginInlineEnd: '4px',
                            color: danger ? '#b91c1c' : '#c9a873',
                        }}
                    >
                        {danger ? 'warning' : 'help'}
                    </span>
                )}
                styles={{ root: { maxWidth: '340px' } }}
                onConfirm={onConfirm}
            >
                {children}
            </Popconfirm>
        </ConfigProvider>
    );
};
