import { Toaster } from "@/components/ui/toaster"
import InstallPrompt from "@/components/koyoo/InstallPrompt"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Public pages
import LandingPage from '@/pages/LandingPage';
import DriverApply from '@/pages/DriverApply';

// App pages
import AuthenticatedHome from '@/pages/AuthenticatedHome';
import Home from '@/pages/Home';
import RoleSelect from '@/pages/RoleSelect';
import RideHistory from '@/pages/RideHistory';
import Profile from '@/pages/Profile';
import DriverDashboard from '@/pages/DriverDashboard';
import DriverHistory from '@/pages/DriverHistory';
import DriverFinance from '@/pages/DriverFinance';
import DriverProfilePage from '@/pages/DriverProfile';
import AdminDashboard from '@/pages/AdminDashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public pages — no auth check */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />} />
      <Route path="/driver-apply" element={<DriverApply />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/home" element={<AuthenticatedHome />} />
        <Route path="/ride" element={<Home />} />
        <Route path="/role-select" element={<RoleSelect />} />
        <Route path="/history" element={<RideHistory />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/driver" element={<DriverDashboard />} />
        <Route path="/driver/finance" element={<DriverFinance />} />
        <Route path="/driver/history" element={<DriverHistory />} />
        <Route path="/driver/profile" element={<DriverProfilePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <InstallPrompt />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App