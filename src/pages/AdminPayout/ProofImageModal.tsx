import React, { useEffect } from 'react';
import { useProtectedImage } from '../../components/shared';

interface ProofImageModalProps {
    /** Signed URL của ảnh cần xem (endpoint file private). Truyền null để đóng modal. */
    imageUrl: string | null;
    title: string;
    /** Mô tả ảnh cho trình đọc màn hình. */
    alt: string;
    onClose: () => void;
}

/**
 * Xem ảnh chứng minh ngay tại chỗ. Trước đây nút "Xem ảnh" là thẻ <a target="_blank">, mỗi lần
 * đối chiếu một dòng là mất một tab mới và phải quay lại bảng — mở modal giữ được ngữ cảnh.
 *
 * Chỉ xem rồi đóng: không còn lối "mở ảnh gốc" sang tab mới.
 */
const ProofImageModal: React.FC<ProofImageModalProps> = ({ imageUrl, title, alt, onClose }) => {
    // Ảnh nằm sau endpoint có [Authorize]; thẻ <img> không gửi được token nên phải tải bằng JS
    // rồi dùng blob URL — cho CẢ ảnh hiển thị lẫn nút "Mở ảnh gốc".
    const { objectUrl, loading, failed } = useProtectedImage(imageUrl);

    useEffect(() => {
        if (!imageUrl) return undefined;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [imageUrl, onClose]);

    if (!imageUrl) return null;

    return (
        <div
            className="payout-modal-overlay"
            role="presentation"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="payout-modal-dialog" role="dialog" aria-modal="true" aria-label={title}>
                <header className="payout-modal-header">
                    <div className="payout-modal-title-group">
                        <span className="payout-modal-icon success material-symbols-outlined" aria-hidden="true">
                            receipt_long
                        </span>
                        <div>
                            <h2>{title}</h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="payout-modal-close"
                        onClick={onClose}
                        aria-label="Đóng modal"
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                </header>

                <div className="payout-modal-body payout-proof-modal-body">
                    {failed ? (
                        <p className="payout-proof-image-note">Không tải được ảnh. Vui lòng thử lại.</p>
                    ) : loading || !objectUrl ? (
                        <p className="payout-proof-image-note">Đang tải ảnh…</p>
                    ) : (
                        <img className="payout-proof-image" src={objectUrl} alt={alt} />
                    )}
                </div>

                <div className="payout-modal-footer">
                    <button type="button" className="admin-ui-button admin-ui-button-primary" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProofImageModal;
