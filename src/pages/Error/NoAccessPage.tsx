import { useLocation, useNavigate } from 'react-router-dom';
import { useAccess } from '../../contexts/AccessContext';
import './NoAccessPage.css';

const NoAccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { access, error, refresh } = useAccess();
  const state = location.state as { accessError?: boolean } | null;
  const noGroup = !access?.permissionGroup;

  return (
    <div className="no-access-page">
      <div className="no-access-card">
        <span className="material-symbols-outlined no-access-icon">shield_lock</span>
        <h1>{error || state?.accessError ? 'Không thể tải quyền truy cập' : 'Chưa được cấp quyền'}</h1>
        <p>
          {error || state?.accessError
            ? 'Hệ thống chưa tải được quyền hiện tại của bạn. Hãy thử lại.'
            : noGroup
              ? 'Tài khoản của bạn chưa thuộc nhóm quyền nào. Vui lòng liên hệ quản trị viên.'
              : 'Nhóm quyền hiện tại không cho phép sử dụng chức năng này.'}
        </p>
        <div className="no-access-actions">
          <button type="button" onClick={() => void refresh()}>Tải lại quyền</button>
          <button type="button" className="secondary" onClick={() => navigate('/admin-portal', { replace: true })}>
            Về trang phù hợp
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoAccessPage;
