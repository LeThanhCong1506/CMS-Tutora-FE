import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, Slide } from 'react-toastify';

import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute/PermissionRoute';
import SessionExpiredModal from './components/SessionExpiredModal';
import PageLoader from './components/PageLoader/PageLoader';
import { ErrorBoundary } from './components/shared';
import { useAccess } from './contexts/AccessContext';
import { getCurrentUser, isTokenExpired, updateTokens, clearUserFromStorage } from './services/auth.service';

import 'react-toastify/dist/ReactToastify.css';
import './styles/toastify.css';

const BACKEND_API = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5166') + '/api';

const LoginPage = lazy(() => import('./pages/Login/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/Error/NotFoundPage'));
const UnauthorizedPage = lazy(() => import('./pages/Error/UnauthorizedPage'));
const ForbiddenPage = lazy(() => import('./pages/Error/ForbiddenPage'));
const NoAccessPage = lazy(() => import('./pages/Error/NoAccessPage'));

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboard/AdminDashboardPageEnhanced'));
const UserManagementPage = lazy(() => import('./pages/AdminUserManagement/UserManagementPage'));
const StaffManagementPage = lazy(() => import('./pages/AdminStaffManagement/StaffManagementPage'));
const PermissionGroupsPage = lazy(() => import('./pages/AdminPermissionGroups/PermissionGroupsPage'));
const AdminVettingPage = lazy(() => import('./pages/AdminVetting/AdminVettingPage'));
const AdminCertificateVettingPage = lazy(() => import('./pages/AdminVetting/AdminCertificateVettingPage'));
const AdminBookingsPage = lazy(() => import('./pages/AdminBookings/AdminBookingsPage'));
const AdminBookingDetailPage = lazy(() => import('./pages/AdminBookings/AdminBookingDetailPage'));
const AdminFinancialsPage = lazy(() => import('./pages/AdminFinancials/AdminFinancialsPage'));
// TEMP: proposal page, running on mock data — see src/mocks/taxMockData.ts
const AdminTaxPage = lazy(() => import('./pages/AdminTax/AdminTaxPage'));
// TEMP: proposal page, running on mock data — see src/mocks/financeManagementMockData.ts
const AdminFinanceNewPage = lazy(() => import('./pages/AdminFinanceNew/AdminFinanceNewPage'));
const AdminRevenueReportsPage = lazy(() => import('./pages/AdminRevenueReports/AdminRevenueReportsPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettings/AdminSettingsPage'));
const AdminWarningsPage = lazy(() => import('./pages/AdminWarnings/AdminWarningsPage'));
const AdminFeedbacksPage = lazy(() => import('./pages/AdminFeedbacks/AdminFeedbacksPage'));
const AdminPoliciesPage = lazy(() => import('./pages/AdminPolicies/AdminPoliciesPage'));
const QuestionBankPage = lazy(() => import('./pages/QuestionBank/QuestionBankPage'));
const TestBankPage = lazy(() => import('./pages/TestBank/TestBankPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBase/KnowledgeBasePage'));
const UploadPdfPage = lazy(() => import('./pages/QuestionBank/UploadPdfPage'));
const AdminSubjectsPage = lazy(() => import('./pages/AdminSubjects/AdminSubjectsPage'));
const AdminChaptersPage = lazy(() => import('./pages/AdminChapters/AdminChaptersPage'));
const AdminDisputesPage = lazy(() => import('./pages/AdminDisputes/AdminDisputesPage'));
const AdminDisputeDetailPage = lazy(() => import('./pages/AdminDisputes/AdminDisputeDetailPage'));
const PayoutOverviewPage = lazy(() => import('./pages/AdminPayout/PayoutOverview/PayoutOverviewPage'));
const TransferHistoryPage = lazy(() => import('./pages/AdminPayout/Transfer/TransferHistoryPage'));
const PayoutDetailPage = lazy(() => import('./pages/AdminPayout/PayoutDetail/PayoutDetailPage'));
const PendingReviewPage = lazy(() => import('./pages/AdminPayout/PendingReview/PendingReviewPage'));
const AllPayoutRequestsPage = lazy(() => import('./pages/AdminPayout/AllRequests/AllPayoutRequestsPage'));
const NotificationsPage = lazy(() => import('./pages/Notifications/NotificationsPage'));
const AdminAiCreditPage = lazy(() => import('./pages/AdminAiCredit/AdminAiCreditPage'));
const AdminSupportInboxPage = lazy(() => import('./pages/AdminSupport/AdminSupportInboxPage'));

const guard = (element: ReactNode, permission?: string, adminOnly = false) => (
  <PermissionRoute permission={permission} adminOnly={adminOnly}>{element}</PermissionRoute>
);

const PortalIndexRedirect = () => {
  const { loading, isAdmin, can } = useAccess();
  if (loading) return <PageLoader />;
  if (isAdmin || can('dashboard.view')) return <Navigate to="/admin-portal/dashboard" replace />;

  const firstAllowed = [
    ['user.view', '/admin-portal/users'],
    ['booking.view', '/admin-portal/bookings'],
    ['tutor_approval.view', '/admin-portal/vetting/profiles'],
    ['tutor_profile_update.view', '/admin-portal/vetting/profiles'],
    ['certificate.view', '/admin-portal/vetting/certificates'],
    ['dispute.view', '/admin-portal/disputes'],
    ['warning.view', '/admin-portal/warnings'],
    ['feedback.view', '/admin-portal/feedbacks'],
    ['policy.view', '/admin-portal/policies'],
    ['question_bank.view', '/admin-portal/question-bank'],
    ['knowledge_base.view', '/admin-portal/knowledge-base'],
    ['financial.view', '/admin-portal/financials'],
    ['payout.view', '/admin-portal/payouts'],
    ['lookup.view', '/admin-portal/resources/subjects'],
    ['notification.view', '/admin-portal/notifications'],
    ['support.view', '/admin-portal/support'],
  ].find(([permission]) => can(permission));

  return <Navigate to={firstAllowed?.[1] ?? '/admin-portal/no-access'} replace />;
};

function App() {
  const location = useLocation();
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  const checkTokenExpiry = useCallback(async () => {
    const user = getCurrentUser();
    if (!user?.accessToken || !isTokenExpired()) return;

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

  useEffect(() => {
    // Route changes re-check the stored token and may open the expiry modal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkTokenExpiry();
  }, [location.pathname, checkTokenExpiry]);

  useEffect(() => {
    const interval = setInterval(checkTokenExpiry, 30000);
    return () => clearInterval(interval);
  }, [checkTokenExpiry]);

  return (
    <div>
      <SessionExpiredModal isOpen={showSessionExpired} onClose={() => setShowSessionExpired(false)} />
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
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/admin-portal"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Staff']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PortalIndexRedirect />} />
              <Route path="no-access" element={<NoAccessPage />} />
              <Route path="dashboard" element={guard(<AdminDashboardPage />, 'dashboard.view')} />
              <Route path="users" element={guard(<UserManagementPage />, 'user.view')} />
              <Route path="users/students" element={guard(<UserManagementPage lockedRole="Student" />, 'user.view')} />
              <Route path="users/parents" element={guard(<UserManagementPage lockedRole="Parent" />, 'user.view')} />
              <Route path="users/tutors" element={guard(<UserManagementPage lockedRole="Tutor" />, 'user.view')} />
              <Route path="staff" element={guard(<StaffManagementPage />, undefined, true)} />
              <Route path="permission-groups" element={guard(<PermissionGroupsPage />, undefined, true)} />
              <Route path="vetting" element={<Navigate to="/admin-portal/vetting/profiles" replace />} />
              <Route
                path="vetting/profiles"
                element={
                  <PermissionRoute anyOf={['tutor_approval.view', 'tutor_profile_update.view']}>
                    <AdminVettingPage />
                  </PermissionRoute>
                }
              />
              <Route path="vetting/certificates" element={guard(<AdminCertificateVettingPage />, 'certificate.view')} />
              <Route path="bookings" element={guard(<AdminBookingsPage />, 'booking.view')} />
              <Route path="bookings/:id" element={guard(<AdminBookingDetailPage />, 'booking.view')} />
              <Route path="financials" element={guard(<AdminFinancialsPage />, 'financial.view')} />
              <Route path="tax" element={guard(<AdminTaxPage />, 'financial.view')} />
              <Route path="finance-new" element={guard(<AdminFinanceNewPage />, 'financial.view')} />
              <Route
                path="revenue-reports"
                element={<Navigate to="/admin-portal/revenue-reports/overview" replace />}
              />
              <Route
                path="revenue-reports/:tab"
                element={guard(<AdminRevenueReportsPage />, 'financial.view')}
              />
              <Route path="warnings" element={guard(<AdminWarningsPage />, 'warning.view')} />
              <Route path="feedbacks" element={guard(<AdminFeedbacksPage />, 'feedback.view')} />
              <Route path="policies" element={guard(<AdminPoliciesPage />, 'policy.view')} />
              <Route path="resources" element={<Navigate to="/admin-portal/resources/subjects" replace />} />
              <Route path="resources/subjects" element={guard(<AdminSubjectsPage />, 'lookup.view')} />
              <Route path="resources/grade-levels" element={guard(<AdminSubjectsPage />, 'lookup.view')} />
              <Route
                path="resources/chapters"
                element={guard(<AdminChaptersPage />, 'lookup.view')}
              />
              <Route
                path="resources/question-types"
                element={guard(<AdminChaptersPage />, 'lookup.view')}
              />
              <Route path="question-bank" element={guard(<QuestionBankPage />, 'question_bank.view')} />
              <Route path="test-bank" element={guard(<TestBankPage />, 'question_bank.view')} />
              <Route path="question-bank/upload" element={guard(<UploadPdfPage />, 'question_document.upload')} />
              <Route path="question-bank/upload/:id" element={guard(<UploadPdfPage />, 'question_document.upload')} />
              <Route path="knowledge-base" element={guard(<KnowledgeBasePage />, 'knowledge_base.view')} />
              <Route path="disputes" element={guard(<AdminDisputesPage />, 'dispute.view')} />
              <Route path="disputes/:id" element={guard(<AdminDisputeDetailPage />, 'dispute.view')} />
              <Route path="settings" element={guard(<AdminSettingsPage />, 'lookup.view')} />
              <Route path="notifications" element={guard(<NotificationsPage />, 'notification.view')} />
              <Route path="support" element={guard(<AdminSupportInboxPage />, 'support.view')} />
              <Route path="ai-credit/packages" element={guard(<AdminAiCreditPage />, 'financial.view')} />
              <Route path="ai-credit/settings" element={guard(<AdminAiCreditPage />, 'financial.view')} />
              <Route path="payouts" element={guard(<PayoutOverviewPage />, 'payout.view')} />
              <Route path="payouts/transfers" element={guard(<TransferHistoryPage />, 'payout.view')} />
              <Route path="payouts/history" element={guard(<AllPayoutRequestsPage />, 'payout.view')} />
              <Route path="payouts/:id" element={guard(<PayoutDetailPage />, 'payout.view')} />
              <Route path="payout/review" element={guard(<PendingReviewPage />, 'payout.view')} />
              <Route path="payout/review/:id" element={guard(<PayoutDetailPage />, 'payout.view')} />
            </Route>

            <Route path="/401" element={<UnauthorizedPage />} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default App;
