import { useProtectedImage } from './useProtectedImage';

interface ProtectedImageProps {
  /** Signed URL trỏ tới /api/files/private. */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Bấm vào ảnh — dùng để mở lightbox xem phóng to. */
  onClick: () => void;
}

/**
 * Ảnh nằm sau endpoint file private — tự tải bằng JS rồi hiển thị qua blob URL.
 * Chi tiết vì sao không dùng thẳng `<img src>` xem trong `useProtectedImage`.
 *
 * Ảnh luôn là NÚT mở lightbox, không phải link sang tab mới: xem tại chỗ giữ được ngữ cảnh
 * đang đối chiếu, và điều hướng tới file private vốn cũng không mang theo token.
 */
const ProtectedImage = ({ src, alt, className, onClick }: ProtectedImageProps) => {
  const { objectUrl, failed } = useProtectedImage(src);

  if (!src) return null;
  if (failed) return <span className="payout-proof-image-note">Không tải được ảnh. Vui lòng thử lại.</span>;
  if (!objectUrl) return <span className="payout-proof-image-note">Đang tải ảnh…</span>;

  return (
    <button
      type="button"
      className="payout-proof-image-trigger"
      onClick={onClick}
      aria-label={`Phóng to: ${alt}`}
    >
      <img className={className} src={objectUrl} alt={alt} />
    </button>
  );
};

export default ProtectedImage;
