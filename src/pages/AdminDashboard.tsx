import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import AdminDashboardHome from '../components/admin/AdminDashboardHome';
import PendingOnboarding from '../components/admin/PendingOnboarding';
import VerificationsManager from '../components/admin/VerificationsManager';
import ClinicsManager from '../components/admin/ClinicsManager';
import AdminTransactions from '../components/admin/AdminTransactions';
import SubscriptionManager from '../components/admin/SubscriptionManager';
import AuditLog from '../components/admin/AuditLog';

// Placeholder components for routes we haven't built yet
const Placeholder = ({ title }: { title: string }) => (
    <div className="p-8 text-center text-slate-500 font-bold text-xl border-2 border-dashed border-slate-300 rounded-3xl h-64 flex items-center justify-center">
        {title} Feature Coming Soon
    </div>
);

const AdminDashboard: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-72 transition-all duration-300">
                <AdminTopBar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-grow p-4 lg:p-8 overflow-x-hidden">
                    <Routes>
                        <Route index element={<AdminDashboardHome />} />
                        <Route path="onboarding" element={<PendingOnboarding />} />
                        <Route path="verifications" element={<VerificationsManager />} />
                        <Route path="clinics" element={<ClinicsManager />} />
                        <Route path="transactions" element={<AdminTransactions />} />
                        <Route path="subscriptions" element={<SubscriptionManager />} />
                        <Route path="audit" element={<AuditLog />} />
                        <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
