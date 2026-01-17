import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import EmployeeSidebar from '../components/employee/EmployeeSidebar';
import EmployeeTopBar from '../components/employee/EmployeeTopBar';

import MySchedule from '../components/employee/MySchedule';
import MyAttendance from '../components/employee/MyAttendance';
import MyLeave from '../components/employee/MyLeave';
import MyProfile from '../components/employee/MyProfile';

import ManagerDashboard from '../components/employee/ManagerDashboard';
import ManagerSchedule from '../components/employee/ManagerSchedule';
import ManagerStaff from '../components/employee/ManagerStaff';
import ManagerLeave from '../components/employee/ManagerLeave';
import ManagerPayroll from '../components/employee/ManagerPayroll';
import ManagerDocuments from '../components/employee/ManagerDocuments';
import ManagerAttendance from '../components/employee/ManagerAttendance';
import ManagerSettings from '../components/employee/ManagerSettings';

interface EmployeeDashboardProps {
   user: any;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ user }) => {
   const [sidebarOpen, setSidebarOpen] = useState(true);

   // Check if user has admin access
   const isOwner = user.systemRole === 'OWNER';
   const isAdmin = user.systemRole === 'ADMIN';
   const permissions = user.permissions;
   const hasAnyAdminPermission = permissions && Object.values(permissions).some(v => v);
   const canAccessManager = isOwner || (isAdmin && hasAnyAdminPermission);

   return (
      <div className="flex h-screen bg-slate-50 font-inter overflow-hidden">
         <EmployeeSidebar
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
            userRole={user.role || user.systemRole}
            systemRole={user.systemRole}
            permissions={user.permissions}
            userName={user.name}
         />

         <div className="flex-1 flex flex-col min-w-0">
            <EmployeeTopBar
               user={user}
               sidebarOpen={sidebarOpen}
               setSidebarOpen={setSidebarOpen}
            />

            <main className="flex-1 overflow-y-auto">
               <Routes>
                  {/* Personal Routes - Always available */}
                  <Route path="/" element={<MySchedule />} />
                  <Route path="/attendance" element={<MyAttendance />} />
                  <Route path="/leave" element={<MyLeave />} />
                  <Route path="/profile" element={<MyProfile />} />

                  {/* Manager Routes - Permission-based */}
                  {canAccessManager && (
                     <>
                        <Route path="/manager" element={<ManagerDashboard />} />

                        {/* Staff Management */}
                        {(isOwner || permissions?.staffManagement) && (
                           <Route path="/manager/staff" element={<ManagerStaff />} />
                        )}

                        {/* Scheduling */}
                        {(isOwner || permissions?.scheduling) && (
                           <Route path="/manager/schedule" element={<ManagerSchedule />} />
                        )}

                        {/* Attendance */}
                        {(isOwner || permissions?.attendance) && (
                           <Route path="/manager/attendance" element={<ManagerAttendance />} />
                        )}

                        {/* Leave Approvals */}
                        {(isOwner || permissions?.leave) && (
                           <Route path="/manager/leave" element={<ManagerLeave />} />
                        )}

                        {/* Documents */}
                        {(isOwner || permissions?.documentsAndPolicies) && (
                           <Route path="/manager/documents" element={<ManagerDocuments />} />
                        )}

                        {/* Payroll */}
                        {(isOwner || permissions?.payroll) && (
                           <Route path="/manager/payroll" element={<ManagerPayroll />} />
                        )}

                        {/* Settings */}
                        {(isOwner || permissions?.settingsAdmin) && (
                           <Route path="/manager/settings" element={<ManagerSettings />} />
                        )}
                     </>
                  )}
               </Routes>
            </main>
         </div>
      </div>
   );
};

export default EmployeeDashboard;
