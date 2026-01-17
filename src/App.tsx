
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

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/super-login" element={<SuperAdminLogin />} />

      {/* Protected Employer Routes */}
      <Route
        path="/employer/*"
        element={
          user && (user.role === 'Owner' || user.role === 'HR Manager') ? (
            <EmployerDashboard user={user} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Protected Employee Routes */}
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

      {/* Protected Admin Routes */}
      <Route
        path="/admin/*"
        element={
          user?.isSuperAdmin || user?.role === 'SuperAdmin' ? ( // Handle both property styles
            <SuperAdminDashboard />
          ) : (
            <Navigate to="/super-login" replace />
          )
        }
      />

      {/* Redirect based on role if just '/' but logged in */}
      <Route
        path="/dashboard"
        element={
          !user ? <Navigate to="/login" /> :
            user.role === 'SuperAdmin' ? <Navigate to="/admin" /> :
              (user.role === 'Owner' || user.role === 'HR Manager') ? <Navigate to="/employer" /> :
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
