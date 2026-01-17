
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AcceptInvite from './pages/AcceptInvite';
import EmployerDashboard from './pages/EmployerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminLogin from './pages/SuperAdminLogin';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  // Helper to check if user is Owner (full employer access)
  const isOwner = user?.systemRole === 'OWNER' || user?.role === 'Owner';

  // Helper to check if user is Admin (permission-based access via employee dashboard)
  const isAdmin = user?.systemRole === 'ADMIN' ||
    ['HR Manager', 'Shift Manager', 'Payroll Officer'].includes(user?.role || '');

  // Helper to check if user is Super Admin
  const isSuperAdmin = user?.isSuperAdmin || user?.role === 'SuperAdmin';

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/super-login" element={<SuperAdminLogin />} />

      {/* Protected Employer Routes - ONLY for OWNER */}
      <Route
        path="/employer/*"
        element={
          user && isOwner ? (
            <EmployerDashboard user={user} />
          ) : user && isAdmin ? (
            // Admin users should go to employee dashboard, not employer
            <Navigate to="/employee" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Protected Employee Routes - For ADMIN and EMPLOYEE */}
      <Route
        path="/employee/*"
        element={
          user ? (
            <EmployeeDashboard user={user} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Protected Super Admin Routes */}
      <Route
        path="/admin/*"
        element={
          user && isSuperAdmin ? (
            <SuperAdminDashboard />
          ) : (
            <Navigate to="/super-login" replace />
          )
        }
      />

      {/* Redirect based on role */}
      <Route
        path="/dashboard"
        element={
          !user ? <Navigate to="/login" /> :
            isSuperAdmin ? <Navigate to="/admin" /> :
              isOwner ? <Navigate to="/employer" /> :
                <Navigate to="/employee" />
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
