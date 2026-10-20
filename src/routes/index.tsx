import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { RequireAuth, RequireRole, homePathForRole } from '@/routes/guards';
import NotFoundPage from '@/pages/NotFoundPage';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const RegisterInstitutionPage = lazy(() => import('@/pages/auth/RegisterInstitutionPage'));
const ActivatePage = lazy(() => import('@/pages/auth/ActivatePage'));
const PendingAccountPage = lazy(() => import('@/pages/PendingAccountPage'));
const ComingSoonPage = lazy(() => import('@/pages/ComingSoonPage'));
const OwnerDashboardPage = lazy(() => import('@/pages/owner/OwnerDashboardPage'));
const InstitutionRequestsPage = lazy(() => import('@/pages/owner/InstitutionRequestsPage'));
const InstitutionsPage = lazy(() => import('@/pages/owner/InstitutionsPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const StudentsPage = lazy(() => import('@/pages/admin/StudentsPage'));
const TeachersPage = lazy(() => import('@/pages/admin/TeachersPage'));
const ClassesPage = lazy(() => import('@/pages/admin/ClassesPage'));
const SubjectsPage = lazy(() => import('@/pages/admin/SubjectsPage'));
const AttendancePage = lazy(() => import('@/pages/admin/AttendancePage'));
const TestListPage = lazy(() => import('@/pages/admin/TestListPage'));
const TestBuilderPage = lazy(() => import('@/pages/admin/TestBuilderPage'));
const TestResultsPage = lazy(() => import('@/pages/admin/TestResultsPage'));
const StudentTestListPage = lazy(() => import('@/pages/student/TestListPage'));
const TakeTestPage = lazy(() => import('@/pages/student/TakeTestPage'));
const StudentTestResultPage = lazy(() => import('@/pages/student/TestResultPage'));
const StudentHomePage = lazy(() => import('@/pages/student/StudentHomePage'));
const AdminMaterialListPage = lazy(() => import('@/pages/admin/MaterialListPage'));
const AdminMaterialEditPage = lazy(() => import('@/pages/admin/MaterialEditPage'));
const StudentMaterialListPage = lazy(() => import('@/pages/student/MaterialListPage'));

function HomeRedirect() {
  const { authUser, userRecord, loading, configError } = useAuth();
  const location = useLocation();
  if (configError) return <LoadingSpinner fullPage />;
  if (loading) return <LoadingSpinner fullPage />;
  if (!authUser) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Navigate to={homePathForRole(userRecord?.role ?? null)} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Institution registration — pending users only */}
        <Route
          path="/register-institution"
          element={
            <RequireRole roles={['pending']}>
              <RegisterInstitutionPage />
            </RequireRole>
          }
        />
        {/* Account activation via invitation code */}
        <Route
          path="/activate"
          element={
            <RequireAuth>
              <ActivatePage />
            </RequireAuth>
          }
        />

        {/* Shared */}
        <Route
          path="/pending"
          element={
            <RequireAuth>
              <PendingAccountPage />
            </RequireAuth>
          }
        />

        {/* Platform owner */}
        <Route
          path="/owner"
          element={
            <RequireRole roles={['platformOwner']}>
              <OwnerDashboardPage />
            </RequireRole>
          }
        />
        <Route
          path="/owner/requests"
          element={
            <RequireRole roles={['platformOwner']}>
              <InstitutionRequestsPage />
            </RequireRole>
          }
        />
        <Route
          path="/owner/institutions"
          element={
            <RequireRole roles={['platformOwner']}>
              <InstitutionsPage />
            </RequireRole>
          }
        />

        {/* Institution admin + teacher */}
        <Route
          path="/admin"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <AdminDashboardPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/students"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <StudentsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/teachers"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <TeachersPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/classes"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <ClassesPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/subjects"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <SubjectsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <AttendancePage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/tests"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <TestListPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/tests/:testId"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <TestBuilderPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/results"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <TestResultsPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/materials"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <AdminMaterialListPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/materials/:materialId"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <AdminMaterialEditPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin/:section"
          element={
            <RequireRole roles={['institutionAdmin', 'teacher']}>
              <ComingSoonPage area="admin" />
            </RequireRole>
          }
        />

        {/* Student */}
        <Route
          path="/student"
          element={
            <RequireRole roles={['student']}>
              <StudentHomePage />
            </RequireRole>
          }
        />
        <Route
          path="/student/tests"
          element={
            <RequireRole roles={['student']}>
              <StudentTestListPage />
            </RequireRole>
          }
        />
        <Route
          path="/student/tests/:testId"
          element={
            <RequireRole roles={['student']}>
              <TakeTestPage />
            </RequireRole>
          }
        />
        <Route
          path="/student/tests/:testId/result"
          element={
            <RequireRole roles={['student']}>
              <StudentTestResultPage />
            </RequireRole>
          }
        />
        <Route
          path="/student/materials"
          element={
            <RequireRole roles={['student']}>
              <StudentMaterialListPage />
            </RequireRole>
          }
        />
        <Route
          path="/student/:section"
          element={
            <RequireRole roles={['student']}>
              <ComingSoonPage area="student" />
            </RequireRole>
          }
        />

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
