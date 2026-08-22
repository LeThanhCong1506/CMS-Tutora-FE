import { useEffect, useState } from 'react';
import { fetchProtectedImage, releaseProtectedImage } from '../../../services/admin.service';

export interface ProtectedImageState {
  /** Blob URL dùng cho <img src>. `null` khi chưa tải xong hoặc lỗi. */
  objectUrl: string | null;
  loading: boolean;
  failed: boolean;
}

/**
 * Tải ảnh nằm sau endpoint file private (`/api/files/private`) và trả về blob URL.
 *
 * KHÔNG gán thẳng signed URL vào `<img src>` được: endpoint có `[Authorize]`, mà thẻ `<img>` của
 * trình duyệt không gửi được header Authorization → luôn nhận 401 và ảnh vỡ. Cũng vì vậy, đừng
 * điều hướng (link/`window.open`) tới signed URL — xem ảnh tại chỗ bằng lightbox.
 */
export function useProtectedImage(src: string | null | undefined): ProtectedImageState {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Đổi src thì phải xoá kết quả cũ NGAY trong lúc render, không để sang effect: làm ở effect
  // sẽ có một nhịp render hiển thị blob của ảnh trước (đã bị thu hồi ở cleanup nên vỡ ảnh).
  // Đây là pattern React khuyến nghị cho "reset state khi input đổi".
  const [lastSrc, setLastSrc] = useState(src);
  if (lastSrc !== src) {
    setLastSrc(src);
    setObjectUrl(null);
    setFailed(false);
    setLoading(Boolean(src));
  }

  useEffect(() => {
    if (!src) return undefined;

    // Blob phải được thu hồi khi src đổi hoặc component unmount, nếu không nó nằm lại trong
    // bộ nhớ cho tới khi tải lại trang.
    let created: string | null = null;
    let cancelled = false;

    fetchProtectedImage(src)
      .then((url) => {
        // Đổi src giữa chừng: kết quả về sau đã vô nghĩa, thu hồi ngay để khỏi rò.
        if (cancelled) {
          releaseProtectedImage(url);
          return;
        }
        created = url;
        setObjectUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      releaseProtectedImage(created);
    };
  }, [src]);

  return { objectUrl, loading, failed };
}
