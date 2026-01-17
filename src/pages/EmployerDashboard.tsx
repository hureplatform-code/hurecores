import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import EmployerSidebar from '../components/employer/EmployerSidebar';
import EmployerTopBar from '../components/employer/EmployerTopBar';

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
            <Route path="/" element={<DashboardHome />} />
            <Route path="/staff" element={<StaffManagement />} />
            <Route path="/schedule" element={<ScheduleManager />} />
            <Route path="/attendance" element={<AttendanceView />} />
            <Route path="/payroll" element={<PayrollView />} />
            <Route path="/leave" element={<LeaveManager />} />
            <Route path="/billing" element={<BillingView organization={organization} />} />
            <Route path="/organization" element={<OrgDetails />} />
            <Route path="/verification" element={<OrgDetails />} />
            <Route path="/locations" element={<LocationsManager />} />
            <Route path="/permissions" element={<PermissionsManager />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboard;
