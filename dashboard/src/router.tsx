import { lazy, Suspense, useEffect, type ReactElement } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { RequireAuth } from '@/features/auth/RequireAuth';
import { RequireRole } from '@/features/auth/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { RouteFallback, FullPageFallback } from '@/components/common/RouteFallback';

// Route components are lazy-loaded so each page ships as its own chunk — the
// dashboard home no longer pays for the wizards, kanban boards, and detail
// pages on first paint. AppShell + RequireAuth stay eager so the shell chrome
// renders immediately and only the page content suspends.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const ChangePasswordGatePage = lazy(() => import('@/features/auth/ChangePasswordGatePage'));
const UsersPage = lazy(() => import('@/features/users/UsersPage'));
const AuditLogPage = lazy(() => import('@/features/audit/AuditLogPage'));
// DashboardHome import removed while "/" redirects to /dashboard2 (see RootRedirect).
// Restore `const DashboardHome = lazy(() => import('@/features/dashboard-home/DashboardHome'));`
// and put <DashboardHome/> back on the "/" route to revert.
const CertificatesPage = lazy(() => import('@/features/certificates/CertificatesPage'));
const CertificateUploadPage = lazy(() => import('@/features/certificates/CertificateUploadPage'));
const ApprovalsQueuePage = lazy(() => import('@/features/documents/ApprovalsQueuePage'));
const DocumentDetailPage = lazy(() => import('@/features/documents/detail/DocumentDetailPage'));
const DocumentsPage = lazy(() => import('@/features/documents/DocumentsPage'));
const DocumentWizardPage = lazy(() => import('@/features/documents/wizard/DocumentWizardPage'));
const EmployeeListPage = lazy(() => import('@/features/employees/list/EmployeeListPage'));
const EmployeeWizardPage = lazy(() => import('@/features/employees/wizard/EmployeeWizardPage'));
const EmployeeProfilePage = lazy(() => import('@/features/employees/profile/EmployeeProfilePage'));
const EmployeeTransferPage = lazy(() => import('@/features/employees/assignments/EmployeeTransferPage'));
const LettersPage = lazy(() => import('@/features/letters/LettersPage'));
const RegisterLetterPage = lazy(() => import('@/features/letters/RegisterLetterPage'));
const LetterDetailPage = lazy(() => import('@/features/letters/detail/LetterDetailPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const TasksPage = lazy(() => import('@/features/tasks/TasksPage'));
const CreateTaskPage = lazy(() => import('@/features/tasks/CreateTaskPage'));
const TaskDetailPage = lazy(() => import('@/features/tasks/detail/TaskDetailPage'));
const UnitsPage = lazy(() => import('@/features/units/UnitsPage'));

// TEMPORARY (per request): the root path redirects to /dashboard2, which is
// served separately (not a route in this SPA). A full-page redirect is used
// on purpose — a react-router <Navigate to="/dashboard2"> would find no match,
// fall through to the catch-all, bounce back to "/", and loop. `window.location`
// leaves the SPA and hits the server-served /dashboard2. Remove this and restore
// `<DashboardHome />` on "/" once the redirect is no longer wanted.
function RootRedirect(): null {
  useEffect(() => {
    window.location.replace('/dashboard2');
  }, []);
  return null;
}

// In-shell route: sidebar + topbar render immediately; only the lazy page
// content suspends, showing a skeleton in the content area.
function Protected({ children }: { children: ReactElement }) {
  return (
    <RequireAuth>
      <AppShell>
        <Suspense fallback={<RouteFallback />}>{children}</Suspense>
      </AppShell>
    </RequireAuth>
  );
}

// The employee creation wizard renders its own chrome (top bar + stepper +
// sticky footer) and goes full-screen on mobile. Wrapping it in AppShell
// would double the topbar + waste vertical room. Auth gate still required.
// The lazy page suspends behind a centered spinner rather than the in-shell
// skeleton.
function ProtectedNoShell({ children }: { children: ReactElement }) {
  return (
    <RequireAuth>
      <Suspense fallback={<FullPageFallback />}>{children}</Suspense>
    </RequireAuth>
  );
}

// Admin-only in-shell route (e.g. /users — PLAN_AUTH_ROLES.md §2.5): same as
// `Protected`, plus a role check. `RequireAuth` still owns the forced
// change-password redirect, so an admin who must change their password
// lands on /change-password before ever reaching the role check.
function ProtectedAdmin({ children }: { children: ReactElement }) {
  return (
    <RequireAuth>
      <RequireRole allowedRoles={['ROLE_SUPER_ADMIN', 'ROLE_HR_ADMIN']}>
        <AppShell>
          <Suspense fallback={<RouteFallback />}>{children}</Suspense>
        </AppShell>
      </RequireRole>
    </RequireAuth>
  );
}

export default function Router() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<FullPageFallback />}>
            <LoginPage />
          </Suspense>
        }
      />

      <Route
        path="/change-password"
        element={
          <ProtectedNoShell>
            <ChangePasswordGatePage />
          </ProtectedNoShell>
        }
      />

      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/users"
        element={
          <ProtectedAdmin>
            <UsersPage />
          </ProtectedAdmin>
        }
      />
      <Route
        path="/units"
        element={
          <Protected>
            <UnitsPage />
          </Protected>
        }
      />
      <Route
        path="/employees"
        element={
          <Protected>
            <EmployeeListPage />
          </Protected>
        }
      />
      <Route
        path="/employees/new"
        element={
          <ProtectedNoShell>
            <EmployeeWizardPage />
          </ProtectedNoShell>
        }
      />
      <Route
        path="/employees/:uuid"
        element={
          <Protected>
            <EmployeeProfilePage />
          </Protected>
        }
      />
      <Route
        path="/employees/:uuid/transfer"
        element={
          <ProtectedNoShell>
            <EmployeeTransferPage />
          </ProtectedNoShell>
        }
      />
      <Route
        path="/certificates"
        element={
          <Protected>
            <CertificatesPage />
          </Protected>
        }
      />
      <Route
        path="/certificates/upload"
        element={
          <ProtectedNoShell>
            <CertificateUploadPage />
          </ProtectedNoShell>
        }
      />
      <Route
        path="/profile"
        element={
          <Protected>
            <ProfilePage />
          </Protected>
        }
      />
      <Route
        path="/audit"
        element={
          <Protected>
            <AuditLogPage />
          </Protected>
        }
      />
      <Route
        path="/documents"
        element={
          <Protected>
            <DocumentsPage />
          </Protected>
        }
      />
      <Route
        path="/documents/new"
        element={
          <ProtectedNoShell>
            <DocumentWizardPage />
          </ProtectedNoShell>
        }
      />
      <Route
        path="/documents/:uuid"
        element={
          <Protected>
            <DocumentDetailPage />
          </Protected>
        }
      />
      <Route
        path="/approvals"
        element={
          <Protected>
            <ApprovalsQueuePage />
          </Protected>
        }
      />
      <Route
        path="/letters"
        element={
          <Protected>
            <LettersPage />
          </Protected>
        }
      />
      <Route
        path="/letters/new"
        element={
          <ProtectedNoShell>
            <RegisterLetterPage />
          </ProtectedNoShell>
        }
      />
      <Route
        path="/letters/:uuid"
        element={
          <Protected>
            <LetterDetailPage />
          </Protected>
        }
      />
      <Route
        path="/tasks"
        element={
          <Protected>
            <TasksPage />
          </Protected>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <ProtectedNoShell>
            <CreateTaskPage />
          </ProtectedNoShell>
        }
      />
      <Route
        path="/tasks/:uuid"
        element={
          <Protected>
            <TaskDetailPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
