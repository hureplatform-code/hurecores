import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import EmployerSidebar from '../components/employer/EmployerSidebar';
import EmployerTopBar from '../components/employer/EmployerTopBar';
import SubscriptionGuard from '../components/common/SubscriptionGuard';

import DashboardHome from '../components/employer/DashboardHome';
import StaffManagement from '../components/employer/StaffManagement';
import ScheduleManager from '../components/employer/ScheduleManager';
import AttendanceView from '../components/employer/AttendanceView';
import PayrollView from '../components/employer/PayrollView';
import LeaveManager from '../components/employer/LeaveManager';
import BillingView from '../components/employer/BillingView';
import OrgDetails from '../components/employer/OrgDetails';
import LocationsManager from '../components/employer/LocationsManager';
import PermissionsManager from '../components/employer/PermissionsManager';
import SettingsView from '../components/employer/SettingsView';
import SettingsRulesView from '../components/employer/SettingsRulesView';
import DocumentsPoliciesManager from '../components/employer/DocumentsPoliciesManager';
import AuditLogView from '../components/employer/AuditLogView';
import ReportsView from '../components/employer/ReportsView';

import { organizationService } from '../lib/services/organization.service';
import type { Organization, Location } from '../types';

interface EmployerDashboardProps {
  user: any;
}

const EmployerDashboard: React.FC<EmployerDashboardProps> = ({ user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Organization and locations state
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.organizationId) {
      loadOrganizationData();
    }
  }, [user?.organizationId]);

  const loadOrganizationData = async () => {
    if (!user?.organizationId) return;

    setLoading(true);
    try {
      const [org, locs] = await Promise.all([
        organizationService.getById(user.organizationId),
        organizationService.getLocations(user.organizationId)
      ]);
      setOrganization(org);
      setLocations(locs);
    } catch (err) {
      console.error('Error loading organization data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (locationId: string) => {
    setSelectedLocationId(locationId);
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-inter overflow-hidden">
      <EmployerSidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        userRole={user.role}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <EmployerTopBar
          organization={organization}
          locations={locations}
          selectedLocationId={selectedLocationId}
          onLocationChange={handleLocationChange}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* Billing route - always accessible (even when suspended) */}
            <Route path="/billing" element={
              <SubscriptionGuard allowBillingAccess={true}>
                <BillingView organization={organization} />
              </SubscriptionGuard>
            } />

            {/* Protected routes - blocked when suspended */}
            <Route path="/" element={
              <SubscriptionGuard>
                <DashboardHome />
              </SubscriptionGuard>
            } />
            <Route path="/staff" element={
              <SubscriptionGuard>
                <StaffManagement selectedLocationId={selectedLocationId} />
              </SubscriptionGuard>
            } />
            <Route path="/schedule" element={
              <SubscriptionGuard>
                <ScheduleManager />
              </SubscriptionGuard>
            } />
            <Route path="/attendance" element={
              <SubscriptionGuard>
                <AttendanceView />
              </SubscriptionGuard>
            } />
            <Route path="/payroll" element={
              <SubscriptionGuard>
                <PayrollView />
              </SubscriptionGuard>
            } />
            <Route path="/leave" element={
              <SubscriptionGuard>
                <LeaveManager />
              </SubscriptionGuard>
            } />
            <Route path="/reports" element={
              <SubscriptionGuard>
                <ReportsView />
              </SubscriptionGuard>
            } />
            <Route path="/organization" element={
              <SubscriptionGuard allowVerificationAccess={true}>
                <OrgDetails />
              </SubscriptionGuard>
            } />
            <Route path="/verification" element={
              <SubscriptionGuard allowVerificationAccess={true}>
                <OrgDetails />
              </SubscriptionGuard>
            } />
            <Route path="/locations" element={
              <SubscriptionGuard>
                <LocationsManager onLocationUpdate={loadOrganizationData} />
              </SubscriptionGuard>
            } />
            <Route path="/permissions" element={
              <SubscriptionGuard>
                <PermissionsManager />
              </SubscriptionGuard>
            } />
            <Route path="/settings" element={
              <SubscriptionGuard>
                <SettingsView />
              </SubscriptionGuard>
            } />
            <Route path="/settings-rules" element={
              <SubscriptionGuard>
                <SettingsRulesView />
              </SubscriptionGuard>
            } />
            <Route path="/documents" element={
              <SubscriptionGuard>
                <DocumentsPoliciesManager />
              </SubscriptionGuard>
            } />
            <Route path="/audit" element={
              <SubscriptionGuard>
                <AuditLogView />
              </SubscriptionGuard>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboard;

