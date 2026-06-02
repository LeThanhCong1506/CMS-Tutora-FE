import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// --- Static imports (layouts, infrastructure, always-needed components) ---
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import SessionExpiredModal from './components/SessionExpiredModal';
import PageLoader from './components/PageLoader/PageLoader';
import { ErrorBoundary } from './components/shared';
import axios from 'axios';
import { getCurrentUser, isTokenExpired, updateTokens, clearUserFromStorage } from './services/auth.service';

const BACKEND_API = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';
import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// TUTORA brand override — phải import SAU default CSS để cascade thắng.
import './styles/toastify.css';

// --- Lazy-loaded pages ---
// Auth
const LoginPage = lazy(() => import('./pages/Login/LoginPage'));

// Error pages
const NotFoundPage = lazy(() => import('./pages/Error/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./pages/Error/UnauthorizedPage'));
const ForbiddenPage = lazy(() => import('./pages/Error/ForbiddenPage'));

// Admin pages
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboard/AdminDashboardPageEnhanced'));
const UserManagementPage = lazy(() => import('./pages/AdminUserManagement/UserManagementPage'));
const AdminVettingPage = lazy(() => import('./pages/AdminVetting/AdminVettingPage'));
const AdminBookingsPage = lazy(() => import('./pages/AdminBookings/AdminBookingsPage'));
const AdminBookingDetailPage = lazy(() => import('./pages/AdminBookings/AdminBookingDetailPage'));
const AdminFinancialsPage = lazy(() => import('./pages/AdminFinancials/AdminFinancialsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettings/AdminSettingsPage'));
const AdminWarningsPage = lazy(() => import('./pages/AdminWarnings/AdminWarningsPage'));
const PayoutOverviewPage = lazy(() => import('./pages/AdminPayout/PayoutOverview/PayoutOverviewPage'));
const PayoutDetailPage = lazy(() => import('./pages/AdminPayout/PayoutDetail/PayoutDetailPage'));
const PendingReviewPage = lazy(() => import('./pages/AdminPayout/PendingReview/PendingReviewPage'));
const AllPayoutRequestsPage = lazy(() => import('./pages/AdminPayout/AllRequests/AllPayoutRequestsPage'));
const FraudLogsPage = lazy(() => import('./pages/AdminPayout/FraudLogs/FraudLogsPage'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));

function App() {
  const location = useLocation();
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  const checkTokenExpiry = useCallback(async () => {
    const user = getCurrentUser();
    if (!user?.accessToken || !isTokenExpired()) return;

    // Thử silent refresh trước khi show modal
    if (user.refreshToken) {
      try {
        const response = await axios.post(`${BACKEND_API}/tokens/refresh`, {
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
        });
        const { token, refreshToken } = response.data.content;
        await updateTokens(token, refreshToken);
        return;
      } catch {
        await clearUserFromStorage();
      }
    }

    setShowSessionExpired(true);
  }, []);

  // Check token expiry khi route thay đổi
  useEffect(() => {
    checkTokenExpiry();
  }, [location.pathname, checkTokenExpiry]);

  // Check token expiry định kỳ mỗi 30 giây
  useEffect(() => {
    const interval = setInterval(checkTokenExpiry, 30000);
    return () => clearInterval(interval);
  }, [checkTokenExpiry]);

  return (
    <div>
      <SessionExpiredModal
        isOpen={showSessionExpired}
        onClose={() => setShowSessionExpired(false)}
      />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        limit={3}
        theme="light"
        transition={Slide}
        closeOnClick
        pauseOnHover
        pauseOnFocusLoss
        newestOnTop
        draggable
        style={{ zIndex: 99999 }}
      />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Root → redirect login (ProtectedRoute sẽ tự lo nếu đã đăng nhập Admin) */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin Layout - PROTECTED */}
            <Route
              path="/admin-portal"
              element={
                <ProtectedRoute allowedRoles={["Admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin-portal/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="vetting" element={<AdminVettingPage />} />
              <Route path="bookings" element={<AdminBookingsPage />} />
              <Route path="bookings/:id" element={<AdminBookingDetailPage />} />
              <Route path="financials" element={<AdminFinancialsPage />} />
              <Route path="warnings" element={<AdminWarningsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="payouts" element={<PayoutOverviewPage />} />
              <Route path="payouts/history" element={<AllPayoutRequestsPage />} />
              <Route path="payouts/:id" element={<PayoutDetailPage />} />
              <Route path="payout/review" element={<PendingReviewPage />} />
              <Route
                path="payout/review/:id"
                element={<div className="p-6">Payout Request Detail Page (Coming Soon)</div>}
              />
              <Route path="payout/fraud-logs" element={<FraudLogsPage />} />
            </Route>

            {/* Error Pages */}
            <Route path="/401" element={<UnauthorizedPage />} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/* Catch-all Route - Must be last */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default App;
