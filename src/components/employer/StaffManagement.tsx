import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { staffService, organizationService, storageService } from '../../lib/services';
import KenyaPhoneInput from '../common/KenyaPhoneInput';
import type {
    Profile,
    CreateStaffInput,
    SystemRole,
    EmploymentType,
    StaffStatus,
    StaffPermissions,
    Location
} from '../../types';
import { JOB_TITLES } from '../../types';
import { formatDateKE } from '../../lib/utils/dateFormat';
import DateInput from '../common/DateInput';
import StaffLeaveManager from './StaffLeaveManager';
import { PrivacyMask, PrivacyToggle } from '../common/PrivacyControl';

// Permission Dialog Component
const PermissionsDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (permissions: StaffPermissions) => void;
    staffName: string;
    jobTitle: string;
    adminSeats: { used: number; max: number };
    initialPermissions?: StaffPermissions;
}> = ({ isOpen, onClose, onSave, staffName, jobTitle, adminSeats, initialPermissions }) => {
    const [permissions, setPermissions] = useState<StaffPermissions>(initialPermissions || {
        staffManagement: false,
        scheduling: false,
        attendance: false,
        leave: false,
        documentsAndPolicies: false,
        payroll: false,
        settingsAdmin: false
    });

    const togglePermission = (key: keyof StaffPermissions) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        const hasAnyPermission = Object.values(permissions).some(v => v);
        if (!hasAnyPermission) {
            alert('At least one permission must be selected for Admin role.');
            return;
        }
        onSave(permissions);
    };

    if (!isOpen) return null;

    const permissionGroups = [
        { key: 'staffManagement', label: 'Staff Management', description: 'Add, edit, and manage staff members' },
        { key: 'scheduling', label: 'Scheduling', description: 'Create and manage shifts and schedules' },
        { key: 'attendance', label: 'Attendance', description: 'View and edit attendance records' },
        { key: 'leave', label: 'Leave', description: 'Approve/reject leave requests' },
        { key: 'documentsAndPolicies', label: 'Documents & Policies', description: 'Manage organization documents' },
        { key: 'payroll', label: 'Payroll', description: 'View and process payroll' },
        { key: 'settingsAdmin', label: 'Settings / Admin', description: 'Access organization settings (restricted)' }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Admin Permissions</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {staffName} • {jobTitle || 'Admin'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-800">Admin Seats Used</span>
                        <span className="font-bold text-blue-900">{adminSeats.used} / {adminSeats.max}</span>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    {permissionGroups.map(({ key, label, description }) => (
                        <label
                            key={key}
                            className={`flex items-start p-4 rounded-xl border cursor-pointer transition-colors ${permissions[key as keyof StaffPermissions]
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={permissions[key as keyof StaffPermissions]}
                                onChange={() => togglePermission(key as keyof StaffPermissions)}
                                className="w-5 h-5 text-blue-600 rounded mt-0.5"
                            />
                            <div className="ml-3">
                                <div className="font-medium text-slate-900">{label}</div>
                                <div className="text-xs text-slate-500">{description}</div>
                            </div>
                        </label>
                    ))}
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                    >
                        Save Permissions
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper to check if license is expired
const isLicenseExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
};

const LicenseBadge: React.FC<{ type?: string; number?: string; expiry?: string }> = ({ type, number, expiry }) => {
    const expired = isLicenseExpired(expiry);

    if (!type && !number) return <span className="text-slate-400">-</span>;

    return (
        <div className="flex flex-col">
            <span className="font-medium text-slate-700">{type || '-'}</span>
            <span className="text-xs text-slate-500">{number || '-'}</span>
            {expired && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1 w-fit">
                    Expired
                </span>
            )}
            {!expired && expiry && (
                <span className="text-xs text-slate-400 mt-0.5">Exp: {formatDateKE(expiry)}</span>
            )}
        </div>
    );
};

const OnboardingBadge: React.FC<{ status?: string }> = ({ status }) => {
    const styles: Record<string, string> = {
        'Completed': 'bg-emerald-100 text-emerald-800',
        'In progress': 'bg-amber-100 text-amber-800',
        'Not started': 'bg-slate-100 text-slate-600'
    };
    const s = status || 'Not started';
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[s] || styles['Not started']}`}>
            {s}
        </span>
    );
};

const VettingBadge: React.FC<{ status?: string }> = ({ status }) => {
    const styles: Record<string, string> = {
        'Verified': 'bg-emerald-100 text-emerald-800',
        'Pending review': 'bg-amber-100 text-amber-800',
        'In progress': 'bg-blue-100 text-blue-800',
        'Not started': 'bg-slate-100 text-slate-600'
    };
    const s = status || 'Not started';
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[s] || styles['Not started']}`}>
            {s}
        </span>
    );
};

// Simplified badges for Account and Invite
const SimpleBadge: React.FC<{ label: string; type: 'success' | 'warning' | 'neutral' }> = ({ label, type }) => {
    const styles = {
        success: 'bg-emerald-100 text-emerald-800',
        warning: 'bg-amber-100 text-amber-800',
        neutral: 'bg-slate-100 text-slate-600'
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${styles[type]}`}>
            {label}
        </span>
    );
};

interface StaffManagementProps {
    selectedLocationId?: string;
}

const ReviewVettingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    staff: Profile | null;
    onUpdateStatus: (status: 'Pending review' | 'In progress' | 'Verified') => void;
    onReject: () => void;
    onExpire: () => void;
}> = ({ isOpen, onClose, staff, onUpdateStatus, onReject, onExpire }) => {
    if (!isOpen || !staff) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="sticky top-0 bg-white flex justify-between items-center p-6 border-b border-slate-100 z-10">
                    <h2 className="text-xl font-bold text-slate-900">Review Vetting / Credentials</h2>
                    <button onClick={onClose} className="px-3 py-1 text-slate-400 hover:text-slate-600 font-bold transition-colors">Close</button>
                </div>

                <div className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                            {(staff.firstName?.[0] || '') + (staff.lastName?.[0] || '')}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{staff.fullName} • {staff.systemRole} • {staff.jobTitle || 'No Title'}</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Email: {staff.email} • Phone: {staff.phone || 'N/A'}
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-700">License</span>
                            <span className="text-sm text-slate-600 font-medium">
                                {staff.license?.type || 'None'} • {staff.license?.number || 'No Number'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-700">Expiry</span>
                            {isLicenseExpired(staff.license?.expiryDate) ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold border border-red-200">Expired</span>
                            ) : (
                                <span className="text-sm text-slate-600">{staff.license?.expiryDate ? formatDateKE(staff.license.expiryDate) : 'N/A'}</span>
                            )}
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-700">Current vetting</span>
                            <VettingBadge status={staff.vettingStatus} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-slate-700">Invite</span>
                            <SimpleBadge label={staff.inviteStatus || 'None'} type={staff.inviteStatus === 'Active' ? 'success' : staff.inviteStatus === 'Pending' ? 'warning' : 'neutral'} />
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-6">
                        Check credentials and update vetting status. (In production: attach documents, view audit history, etc.)
                    </p>

                    <div className="flex flex-wrap gap-2 justify-end">
                        <button
                            onClick={() => onUpdateStatus('Pending review')}
                            className="px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-800 rounded-lg font-extrabold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Mark pending
                        </button>
                        <button
                            onClick={() => onUpdateStatus('In progress')}
                            className="px-4 py-2.5 bg-blue-600 border-2 border-blue-700 text-white rounded-lg font-extrabold text-sm hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            In progress
                        </button>
                        <button
                            onClick={() => onUpdateStatus('Verified')}
                            className="px-4 py-2.5 bg-emerald-600 border-2 border-emerald-700 text-white rounded-lg font-extrabold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            Verify
                        </button>
                        <button
                            onClick={onReject}
                            className="px-4 py-2.5 bg-rose-600 border-2 border-rose-700 text-white rounded-lg font-extrabold text-sm hover:bg-rose-700 transition-colors shadow-sm"
                        >
                            Reject
                        </button>
                        <button
                            onClick={onExpire}
                            className="px-4 py-2.5 bg-orange-500 border-2 border-orange-600 text-white rounded-lg font-extrabold text-sm hover:bg-orange-600 transition-colors shadow-sm"
                        >
                            Mark expired
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StaffManagement: React.FC<StaffManagementProps> = ({ selectedLocationId }) => {
    const { user } = useAuth();
    const [staff, setStaff] = useState<Profile[]>([]);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);

    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
    const [selectedReviewStaff, setSelectedReviewStaff] = useState<Profile | null>(null);
    const [adminSeats, setAdminSeats] = useState({ used: 0, max: 0 });
    const [pendingPermissions, setPendingPermissions] = useState<StaffPermissions | null>(null);
    const [inviteLink, setInviteLink] = useState('');
    const [error, setError] = useState('');
    const [isCustomJobTitle, setIsCustomJobTitle] = useState(false);
    const [phoneValid, setPhoneValid] = useState(true);
    const [staffTab, setStaffTab] = useState<'active' | 'inactive' | 'pendingReview'>('active');
    const [showSalary, setShowSalary] = useState(false);
    const [editingVettingId, setEditingVettingId] = useState<string | null>(null);
    const [editingOnboardingId, setEditingOnboardingId] = useState<string | null>(null);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [editingInviteId, setEditingInviteId] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateStaffInput>({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        systemRole: 'EMPLOYEE',
        jobTitle: '',
        department: '',
        employmentType: 'Full-Time',
        locationId: '',
        monthlySalaryCents: 0,
        dailyRateCents: 0,
        shiftRateCents: 0,
        payMethod: 'Fixed',
        licenseType: '',
        licenseNumber: '',
        licenseAuthority: '',
        licenseExpiry: ''
    });
    const [licenseFile, setLicenseFile] = useState<File | null>(null);

    useEffect(() => {
        loadData();
    }, [user?.organizationId]);

    const loadData = async () => {
        if (!user?.organizationId) return;

        setLoading(true);
        try {
            const [staffData, locationsData, seatData, invitesData] = await Promise.all([
                staffService.getAll(user.organizationId),
                organizationService.getLocations(user.organizationId),
                staffService.checkAdminSeatAvailability(user.organizationId),
                staffService.getPendingInvitations(user.organizationId)
            ]);
            setStaff(staffData);
            setLocations(locationsData);
            setAdminSeats({ used: seatData.used, max: seatData.max });
            setPendingInvites(invitesData);
        } catch (error) {
            console.error('Error loading staff:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResendInvite = async (inviteId: string) => {
        const result = await staffService.resendInvitation(inviteId);
        if (result.success) {
            alert('Invitation resent successfully!');
        } else {
            alert(result.error || 'Failed to resend invitation');
        }
    };

    const handleCancelInvite = async (inviteId: string) => {
        if (!confirm('Are you sure you want to cancel this invitation?')) return;

        const result = await staffService.cancelInvitation(inviteId);
        if (result.success) {
            loadData(); // Reload to update the list
        } else {
            alert(result.error || 'Failed to cancel invitation');
        }
    };

    const handleSystemRoleChange = (role: SystemRole) => {
        setFormData(prev => ({ ...prev, systemRole: role }));

        // If changing to ADMIN, open permissions dialog
        if (role === 'ADMIN') {
            // Check seat availability first
            if (!adminSeats.used || adminSeats.used >= adminSeats.max) {
                if (adminSeats.used >= adminSeats.max) {
                    setError(`Admin limit reached for your plan (${adminSeats.used}/${adminSeats.max}). Upgrade to add more admin seats.`);
                    setFormData(prev => ({ ...prev, systemRole: 'EMPLOYEE' }));
                    return;
                }
            }
            setShowPermissionsModal(true);
        } else {
            // Clear permissions if not admin
            setFormData(prev => ({ ...prev, permissions: undefined }));
        }
    };

    const handlePermissionsSave = (permissions: StaffPermissions) => {
        setFormData(prev => ({ ...prev, permissions }));
        setPendingPermissions(permissions);
        setShowPermissionsModal(false);
    };

    const handlePermissionsClose = () => {
        // Revert to EMPLOYEE if permissions dialog closed without saving
        if (!pendingPermissions) {
            setFormData(prev => ({ ...prev, systemRole: 'EMPLOYEE' }));
        }
        setShowPermissionsModal(false);
    };

    const modalRef = React.useRef<HTMLDivElement>(null);

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.organizationId) {
            setError('Organization ID is missing. Please reload the page.');
            scrollToTop();
            return;
        }

        setError('');

        // Validate admin permissions
        if (formData.systemRole === 'ADMIN' && !formData.permissions) {
            setError('Please assign permissions for the Admin role.');
            scrollToTop();
            return;
        }

        // Validate phone if provided (and ensure it is valid)
        if (formData.phone && !phoneValid) {
            setError('Please enter a valid Kenyan phone number.');
            scrollToTop();
            return;
        }

        try {
            let licenseDocUrl = '';
            if (licenseFile) {
                const result = await storageService.uploadFile(
                    licenseFile,
                    `organizations/${user.organizationId}/staff-licenses/${Date.now()}_${licenseFile.name}`
                );
                if (result.success && result.url) {
                    licenseDocUrl = result.url;
                }
            }

            const payload = {
                ...formData,
                licenseDocumentUrl: licenseDocUrl
            };

            const result = await staffService.createStaffInvitation(payload, user.organizationId);

            if (result.success && result.inviteId) {
                const baseUrl = window.location.origin;
                const link = `${baseUrl}/#/accept-invite?token=${result.inviteId}`;
                setInviteLink(link);
                loadData();
            } else if (result.success) {
                // Fallback if no inviteId returned (legacy behavior)
                setShowAddModal(false);
                resetForm();
                loadData();
            } else {
                setError(result.error || 'Failed to add staff member');
                scrollToTop();
            }
        } catch (err: any) {
            console.error('Add staff error:', err);
            setError(err.message || 'An unexpected error occurred.');
            scrollToTop();
        }
    };

    const scrollToTop = () => {
        if (modalRef.current) {
            modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleDeactivate = async (staffId: string) => {
        if (!confirm('Are you sure you want to deactivate this staff member?')) return;

        const result = await staffService.deactivate(staffId);
        if (result.success) {
            loadData();
        } else {
            alert(result.error);
        }
    };

    const handleReactivate = async (staffId: string) => {
        const result = await staffService.reactivate(staffId);
        if (result.success) {
            loadData();
        } else {
            alert(result.error);
        }
    };

    // Open edit/review modal with staff data - uses openEditModal for full editing
    const handleEditStaff = (member: Profile) => {
        openEditModal(member);
    };

    const resetForm = () => {
        setFormData({
            email: '',
            firstName: '',
            lastName: '',
            phone: '',
            systemRole: 'EMPLOYEE',
            jobTitle: '',
            department: '',
            employmentType: 'Full-Time',
            locationId: '',
            monthlySalaryCents: 0,
            dailyRateCents: 0,
            shiftRateCents: 0,
            payMethod: 'Fixed',
            licenseType: '',
            licenseNumber: '',
            licenseAuthority: '',
            licenseExpiry: ''
        });
        setLicenseFile(null);
        setPendingPermissions(null);
        setError('');
        setInviteLink('');
        setIsCustomJobTitle(false);
    };

    const openEditModal = (member: Profile) => {
        setSelectedStaff(member);
        // Check if member's job title is a custom one (not in the predefined list)
        const hasCustomTitle = member.jobTitle ? !JOB_TITLES.includes(member.jobTitle as any) : false;
        setIsCustomJobTitle(hasCustomTitle);
        setFormData({
            email: member.email,
            firstName: member.firstName || '',
            lastName: member.lastName || '',
            phone: member.phone || '',
            systemRole: member.systemRole,
            jobTitle: member.jobTitle || '',
            department: member.department || '',
            employmentType: member.employmentType,
            locationId: member.locationId || '',
            monthlySalaryCents: member.monthlySalaryCents || 0,
            dailyRateCents: member.dailyRateCents || 0,
            shiftRateCents: member.shiftRateCents || 0,
            payMethod: member.payMethod,
            permissions: member.permissions,
            // Load license details
            licenseType: member.license?.type || '',
            licenseNumber: member.license?.number || '',
            licenseAuthority: member.license?.authority || '',
            licenseExpiry: member.license?.expiryDate || ''
        });
        setPendingPermissions(member.permissions || null);
        setShowEditModal(true);
    };

    const handleUpdateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaff || !user?.organizationId) return;

        setError('');

        // Validate admin permissions
        if (formData.systemRole === 'ADMIN' && !formData.permissions) {
            setError('Please assign permissions for the Admin role.');
            return;
        }

        // Validate phone if provided
        if (formData.phone && !phoneValid) {
            setError('Please enter a valid Kenyan phone number.');
            return;
        }


        let licenseDocUrl = selectedStaff.license?.documentUrl || '';
        if (licenseFile) {
            const uploadResult = await storageService.uploadFile(
                licenseFile,
                `organizations/${user.organizationId}/staff-licenses/${Date.now()}_${licenseFile.name}`
            );
            if (uploadResult.success && uploadResult.url) {
                licenseDocUrl = uploadResult.url;
            } else {
                setError('Failed to upload license document');
                return;
            }
        }

        // Build the license object
        const licenseData = formData.licenseType ? {
            type: formData.licenseType,
            number: formData.licenseNumber || '',
            authority: formData.licenseAuthority || '',
            expiryDate: formData.licenseExpiry || '',
            verificationStatus: selectedStaff.license?.verificationStatus || 'Pending',
            issuedDate: selectedStaff.license?.issuedDate || '',
            documentUrl: licenseDocUrl
        } : null;

        // Debug: Log what we're saving
        console.log('Saving staff update with license data:', {
            staffId: selectedStaff.id,
            formLicenseType: formData.licenseType,
            formLicenseExpiry: formData.licenseExpiry,
            licenseObject: licenseData
        });

        const result = await staffService.update(selectedStaff.id, {
            firstName: formData.firstName,
            lastName: formData.lastName,
            fullName: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            systemRole: formData.systemRole,
            jobTitle: formData.jobTitle,
            department: formData.department,
            employmentType: formData.employmentType,
            locationId: formData.locationId || undefined,
            monthlySalaryCents: formData.monthlySalaryCents,
            dailyRateCents: formData.dailyRateCents,
            shiftRateCents: formData.shiftRateCents,
            payMethod: formData.payMethod,
            permissions: formData.systemRole === 'ADMIN' ? formData.permissions : undefined,
            onboardingStatus: formData.onboardingStatus,
            vettingStatus: formData.vettingStatus,
            inviteStatus: formData.inviteStatus,
            // Update license details
            license: licenseData
        }, user.organizationId);

        if (result.success) {
            console.log('Staff update SUCCESS - license should now be saved');
            setShowEditModal(false);
            setSelectedStaff(null);
            resetForm();
            loadData();
        } else {
            setError(result.error || 'Failed to update staff member');
        }
    };

    // Helper function to get location name
    const getLocationName = (locationId?: string): string => {
        if (!locationId) return '-';
        const location = locations.find(loc => loc.id === locationId);
        return location?.name || '-';
    };

    const handleVettingUpdate = async (status: 'Pending review' | 'In progress' | 'Verified') => {
        if (!selectedReviewStaff || !user?.organizationId) return;

        const result = await staffService.update(selectedReviewStaff.id, {
            vettingStatus: status,
            // Also update license status if verifying
            ...(status === 'Verified' ? {
                license: selectedReviewStaff.license ? { ...selectedReviewStaff.license, verificationStatus: 'Verified' } : undefined
            } : {})
        }, user.organizationId);

        if (result.success) {
            loadData();
            setShowReviewModal(false);
            setSelectedReviewStaff(null);
        } else {
            alert(result.error || 'Failed to update status');
        }
    };

    // Inline vetting status update (for table editing)
    const handleInlineVettingUpdate = async (staffId: string, status: 'Pending review' | 'In progress' | 'Verified' | 'Not started') => {
        if (!user?.organizationId) return;

        const staffMember = staff.find(s => s.id === staffId);
        if (!staffMember) return;

        const result = await staffService.update(staffId, {
            vettingStatus: status,
            //Also update license status if verifying
            ...(status === 'Verified' ? {
                license: staffMember.license ? { ...staffMember.license, verificationStatus: 'Verified' } : undefined
            } : {})
        }, user.organizationId);

        if (result.success) {
            loadData();
            setEditingVettingId(null);
        } else {
            alert(result.error || 'Failed to update vetting status');
        }
    };

    const handleVettingReject = async () => {
        if (!selectedReviewStaff || !user?.organizationId) return;
        if (!confirm('Reject this staff member\'s credentials?')) return;

        const result = await staffService.update(selectedReviewStaff.id, {
            vettingStatus: 'Pending review', // Reset to pending if rejected? Or have a 'Rejected' status in vetting? Types say: 'Verified' | 'Pending review' | 'In progress' | 'Not started'. Let's stick to Pending.
            // But we can mark license as rejected
            license: selectedReviewStaff.license ? { ...selectedReviewStaff.license, verificationStatus: 'Rejected' } : undefined
        }, user.organizationId);

        if (result.success) {
            loadData();
            setShowReviewModal(false);
            setSelectedReviewStaff(null);
        } else {
            alert(result.error);
        }
    };

    const handleVettingExpire = async () => {
        if (!selectedReviewStaff || !user?.organizationId) return;
        if (!confirm('Mark credentials as expired?')) return;

        const result = await staffService.update(selectedReviewStaff.id, {
            license: selectedReviewStaff.license ? { ...selectedReviewStaff.license, verificationStatus: 'Expired' } : undefined
        }, user.organizationId);

        if (result.success) {
            loadData();
            setShowReviewModal(false);
            setSelectedReviewStaff(null);
        } else {
            alert(result.error);
        }
    };

    // Inline handler for Onboarding status update
    const handleInlineOnboardingUpdate = async (staffId: string, status: 'Completed' | 'In progress' | 'Not started') => {
        if (!user?.organizationId) return;

        const result = await staffService.update(staffId, {
            onboardingStatus: status
        }, user.organizationId);

        if (result.success) {
            loadData();
            setEditingOnboardingId(null);
        } else {
            alert(result.error || 'Failed to update onboarding status');
        }
    };

    // Inline handler for Account status (staffStatus) update
    const handleInlineAccountUpdate = async (staffId: string, status: StaffStatus) => {
        if (!user?.organizationId) return;

        const result = await staffService.update(staffId, {
            staffStatus: status
        }, user.organizationId);

        if (result.success) {
            loadData();
            setEditingAccountId(null);
        } else {
            alert(result.error || 'Failed to update account status');
        }
    };

    // Inline handler for Invite status update
    const handleInlineInviteUpdate = async (staffId: string, status: 'Active' | 'Pending' | 'None') => {
        if (!user?.organizationId) return;

        const result = await staffService.update(staffId, {
            inviteStatus: status
        }, user.organizationId);

        if (result.success) {
            loadData();
            setEditingInviteId(null);
        } else {
            alert(result.error || 'Failed to update invite status');
        }
    };

    const [showExpiredOnly, setShowExpiredOnly] = useState(false);

    //Filter staff based on tab and location
    const visibleStaff = React.useMemo(() => {
        return staff.filter(s => {
            // Always exclude archived staff
            if (s.staffStatus === 'Archived') return false;

            // Filter based on active/inactive tab
            if (staffTab === 'active') {
                if (s.staffStatus === 'Inactive') return false;

                // Active tab filters
                const isAllLocations = !selectedLocationId || selectedLocationId === 'all';
                if (!isAllLocations && s.locationId !== selectedLocationId) return false;

                if (showExpiredOnly && !isLicenseExpired(s.license?.expiryDate)) return false;

            } else if (staffTab === 'inactive') {
                // Inactive tab: show only Inactive staff
                // SKIP location/expired filters to ensure they are always findable
                if (s.staffStatus !== 'Inactive') return false;
            } else if (staffTab === 'pendingReview') {
                if (s.staffStatus === 'Inactive' || s.staffStatus === 'Archived') return false;
            }

            return true;
        });
    }, [staff, selectedLocationId, staffTab, showExpiredOnly]);

    // Count inactive staff for badge
    const inactiveCount = React.useMemo(() => {
        return staff.filter(s => s.staffStatus === 'Inactive').length;
    }, [staff]);

    const expiredLicensesCount = React.useMemo(() => {
        return staff.filter(s => isLicenseExpired(s.license?.expiryDate)).length;
    }, [staff]);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-[#4fd1c5] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 w-full max-w-[1600px] mx-auto">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#1a2e35]">Staff</h2>
                    <p className="text-slate-500 mt-1">Simple staff scheduling, onboarding & credentialing for clinics</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    Add staff
                </button>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-[#1a2e35]">Staff onboarding & credentialing</h3>
                <p className="text-sm text-slate-500 mb-4">Track contact details, licenses, vetting status and onboarding status for each staff member.</p>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 overflow-x-auto">
                    <button
                        onClick={() => setStaffTab('active')}
                        className={`px-6 py-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${staffTab === 'active'
                            ? 'text-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Active Staff ({staff.filter(s => s.staffStatus !== 'Inactive' && s.staffStatus !== 'Archived').length})
                        {staffTab === 'active' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setStaffTab('inactive')}
                        className={`px-6 py-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${staffTab === 'inactive'
                            ? 'text-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Inactive Staff ({inactiveCount})
                        {staffTab === 'inactive' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Expired License Banner */}
                {/* Expired License Banner - Hidden per user request */}
                {/* {expiredLicensesCount > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-center justify-between">
                     ...
                </div>
            )} */}

                {/* Staff Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white border-b border-slate-100 text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-4 py-4 min-w-[100px]">First</th>
                                    <th className="px-4 py-4 min-w-[100px]">Last</th>
                                    <th className="px-4 py-4 min-w-[150px]">Email</th>
                                    <th className="px-4 py-4 min-w-[100px]">Account role</th>
                                    <th className="px-4 py-4 min-w-[120px]">Job role</th>
                                    <th className="px-4 py-4 min-w-[100px]">License type</th>
                                    <th className="px-4 py-4 min-w-[120px]">License #</th>
                                    <th className="px-4 py-4 min-w-[120px]">License expiry</th>
                                    <th className="px-4 py-4 min-w-[120px]">Onboarding</th>
                                    <th className="px-4 py-4 min-w-[120px]">Vetting status</th>
                                    <th className="px-4 py-4 min-w-[100px]">Account</th>
                                    <th className="px-4 py-4 min-w-[100px]">Invite</th>
                                    <th className="px-4 py-4 min-w-[250px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {visibleStaff.map((member) => (
                                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-4 font-medium text-slate-900">{member.firstName || member.fullName.split(' ')[0]}</td>
                                        <td className="px-4 py-4 font-medium text-slate-900">{member.lastName || member.fullName.split(' ').slice(1).join(' ')}</td>
                                        <td className="px-4 py-4 text-slate-600">{member.email}</td>
                                        <td className="px-4 py-4 text-slate-600">{member.systemRole}</td>
                                        <td className="px-4 py-4 text-slate-600">{member.jobTitle || '-'}</td>
                                        <td className="px-4 py-4">
                                            {member.license?.type || (member as any).licenseType || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-slate-600">
                                            {member.license?.number || (member as any).licenseNumber || '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            {(() => {
                                                const expiryDate = member.license?.expiryDate || (member as any).licenseExpiry;
                                                if (!expiryDate) {
                                                    return <span className="text-slate-400">-</span>;
                                                }
                                                const isExpired = new Date(expiryDate) < new Date();
                                                return (
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm ${isExpired ? 'text-red-600 font-semibold' : 'text-slate-700'}`}>
                                                            {formatDateKE(expiryDate)}
                                                        </span>
                                                        {isExpired && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1 w-fit">
                                                                Expired
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        {/* Onboarding Status - Clickable Dropdown */}
                                        <td className="px-4 py-4">
                                            {editingOnboardingId === member.id ? (
                                                <select
                                                    autoFocus
                                                    value={member.onboardingStatus || 'Not started'}
                                                    onChange={(e) => handleInlineOnboardingUpdate(member.id, e.target.value as any)}
                                                    onBlur={() => setEditingOnboardingId(null)}
                                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="Not started">Not started</option>
                                                    <option value="In progress">In progress</option>
                                                    <option value="Completed">Completed</option>
                                                </select>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingOnboardingId(member.id)}
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    title="Click to change onboarding status"
                                                >
                                                    <OnboardingBadge status={member.onboardingStatus || (member.staffStatus === 'Active' ? 'Completed' : 'Not started')} />
                                                </button>
                                            )}
                                        </td>
                                        {/* Vetting Status - Clickable Dropdown */}
                                        <td className="px-4 py-4">
                                            {editingVettingId === member.id ? (
                                                <select
                                                    autoFocus
                                                    value={member.vettingStatus || 'Not started'}
                                                    onChange={(e) => handleInlineVettingUpdate(member.id, e.target.value as any)}
                                                    onBlur={() => setEditingVettingId(null)}
                                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="Not started">Not started</option>
                                                    <option value="In progress">In progress</option>
                                                    <option value="Pending review">Pending review</option>
                                                    <option value="Verified">Verified</option>
                                                </select>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingVettingId(member.id)}
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    title="Click to change vetting status"
                                                >
                                                    <VettingBadge status={member.vettingStatus || (member.license?.verificationStatus === 'Verified' ? 'Verified' : 'Not started')} />
                                                </button>
                                            )}
                                        </td>
                                        {/* Account Status - Clickable Dropdown */}
                                        <td className="px-4 py-4">
                                            {editingAccountId === member.id ? (
                                                <select
                                                    autoFocus
                                                    value={member.staffStatus}
                                                    onChange={(e) => handleInlineAccountUpdate(member.id, e.target.value as StaffStatus)}
                                                    onBlur={() => setEditingAccountId(null)}
                                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="Inactive">Inactive</option>
                                                    <option value="Invited">Invited</option>
                                                    <option value="On Leave">On Leave</option>
                                                    <option value="Terminated">Terminated</option>
                                                </select>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingAccountId(member.id)}
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    title="Click to change account status"
                                                >
                                                    <SimpleBadge
                                                        label={member.staffStatus}
                                                        type={member.staffStatus === 'Active' ? 'success' : member.staffStatus === 'Inactive' ? 'neutral' : 'warning'}
                                                    />
                                                </button>
                                            )}
                                        </td>
                                        {/* Invite Status - Clickable Dropdown */}
                                        <td className="px-4 py-4">
                                            {editingInviteId === member.id ? (
                                                <select
                                                    autoFocus
                                                    value={member.inviteStatus || 'None'}
                                                    onChange={(e) => handleInlineInviteUpdate(member.id, e.target.value as any)}
                                                    onBlur={() => setEditingInviteId(null)}
                                                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="None">None</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Active">Active</option>
                                                </select>
                                            ) : (
                                                <button
                                                    onClick={() => setEditingInviteId(member.id)}
                                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                                    title="Click to change invite status"
                                                >
                                                    <SimpleBadge
                                                        label={member.inviteStatus || (member.staffStatus === 'Invited' ? 'Pending' : 'None')}
                                                        type={member.inviteStatus === 'Active' ? 'success' : member.inviteStatus === 'Pending' ? 'warning' : 'neutral'}
                                                    />
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex gap-2">
                                                {member.phone ? (
                                                    <>
                                                        <a
                                                            href={`sms:${member.phone}`}
                                                            className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs font-bold hover:bg-blue-100 transition"
                                                            title="Send SMS"
                                                        >
                                                            SMS
                                                        </a>

                                                    </>
                                                ) : (
                                                    <>
                                                        <button disabled className="px-3 py-1 bg-slate-50 text-slate-400 rounded text-xs font-bold cursor-not-allowed">SMS</button>

                                                    </>
                                                )}
                                                {member.staffStatus === 'Inactive' ? (
                                                    <button
                                                        onClick={() => handleReactivate(member.id)}
                                                        className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded text-xs font-bold hover:bg-emerald-100 transition"
                                                    >
                                                        Reactivate
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleDeactivate(member.id)}
                                                        className="px-3 py-1 bg-slate-50 text-slate-600 rounded text-xs font-bold hover:bg-slate-100 transition"
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        handleEditStaff(member);
                                                    }}
                                                    className="px-3 py-1 bg-amber-50 text-amber-600 rounded text-xs font-bold hover:bg-amber-100 transition"
                                                    title="Edit staff details and license"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedReviewStaff(member);
                                                        setShowReviewModal(true);
                                                    }}
                                                    className="px-3 py-1 bg-purple-50 text-purple-600 rounded text-xs font-bold hover:bg-purple-100 transition"
                                                >
                                                    Review Vetting
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {
                            visibleStaff.length === 0 && (
                                <div className="p-12 text-center text-slate-500">
                                    No staff found.
                                </div>
                            )
                        }
                    </div>
                </div>

                <div className="mt-4 text-xs text-slate-400">
                    Tip: Keep the dashboard focused — everything else can be a plugin in Settings.
                </div>

                {
                    (showAddModal || showEditModal) && (
                        <div ref={modalRef} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6 my-4 md:my-8">
                                <div className="sticky top-0 bg-white z-10 flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                                    <h2 className="text-xl font-bold text-slate-900">
                                        {showEditModal ? 'Edit Staff Member' : (inviteLink ? 'Invitation Sent!' : 'Add Staff Member')}
                                    </h2>
                                    <button onClick={() => { setShowAddModal(false); setShowEditModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">✕</button>
                                </div>

                                {inviteLink ? (
                                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto">
                                            ✓
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-xl font-bold text-slate-800">Success!</h4>
                                            <p className="text-slate-500 max-w-sm mx-auto">
                                                We've sent an email to <strong>{formData.email}</strong>. You can also share the invite link directly via SMS or WhatsApp.
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 p-4 rounded-xl flex items-center gap-3">
                                            <div className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 truncate text-left">
                                                {inviteLink}
                                            </div>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(inviteLink)}
                                                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 text-sm font-medium transition-colors"
                                            >
                                                Copy
                                            </button>
                                        </div>

                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => {
                                                    const message = `Hi ${formData.firstName}, you have been invited to join ${user?.email ? 'our team' : 'HURE Core'}. Using this link to accept the invitation: ${inviteLink}`;
                                                    window.open(`sms:${formData.phone}?body=${encodeURIComponent(message)}`, '_blank');
                                                }}
                                                className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors"
                                            >
                                                <span className="text-xl">💬</span> Send via SMS
                                            </button>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100">
                                            <button
                                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                                            >
                                                Done & Close
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {error && (
                                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
                                                {error}
                                            </div>
                                        )}

                                        <form onSubmit={showEditModal ? handleUpdateStaff : handleAddStaff} className="space-y-3">
                                            <div className="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-3">
                                                <div>
                                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-1">First Name *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={formData.firstName}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-1">Last Name *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={formData.lastName}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs md:text-sm font-semibold text-slate-700 mb-1">Email *</label>
                                                    <input
                                                        type="email"
                                                        required
                                                        value={formData.email}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <KenyaPhoneInput
                                                        label="Phone Number"
                                                        value={formData.phone || ''}
                                                        onChange={(normalized, isValid) => {
                                                            setFormData(prev => ({ ...prev, phone: normalized }));
                                                            setPhoneValid(isValid);
                                                        }}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job Title *</label>
                                                    <select
                                                        value={isCustomJobTitle ? 'Other (custom)' : (JOB_TITLES.includes(formData.jobTitle as any) ? formData.jobTitle : '')}
                                                        onChange={(e) => {
                                                            if (e.target.value === 'Other (custom)') {
                                                                setIsCustomJobTitle(true);
                                                                setFormData(prev => ({ ...prev, jobTitle: '' }));
                                                            } else {
                                                                setIsCustomJobTitle(false);
                                                                setFormData(prev => ({ ...prev, jobTitle: e.target.value }));
                                                            }
                                                        }}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                        required={!isCustomJobTitle}
                                                    >
                                                        <option value="">Select Job Title</option>
                                                        {JOB_TITLES.map(title => (
                                                            <option key={title} value={title}>{title}</option>
                                                        ))}
                                                    </select>
                                                    {isCustomJobTitle && (
                                                        <input
                                                            type="text"
                                                            value={formData.jobTitle}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-2 text-sm"
                                                            placeholder="Enter custom job title"
                                                            required
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">System Role *</label>
                                                    <select
                                                        value={formData.systemRole}
                                                        onChange={(e) => handleSystemRoleChange(e.target.value as SystemRole)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                    >
                                                        <option value="EMPLOYEE">Employee</option>
                                                        <option value="ADMIN">Admin</option>
                                                    </select>
                                                    <p className="text-xs text-[#94A3B8] mt-1">
                                                        Only Admins consume admin seats.
                                                    </p>
                                                    {formData.systemRole === 'ADMIN' && formData.permissions && (
                                                        <p className="text-xs text-green-600 mt-1">✓ Permissions assigned</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Employment Type *</label>
                                                    <select
                                                        value={formData.employmentType}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, employmentType: e.target.value as EmploymentType }))}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                    >
                                                        <option value="Full-Time">Full-Time</option>
                                                        <option value="Part-Time">Part-Time</option>
                                                        <option value="Contract">Contract</option>
                                                        <option value="Locum">Locum</option>
                                                        <option value="External">External</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
                                                    <select
                                                        value={formData.locationId}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                    >
                                                        <option value="">Select Location</option>
                                                        {locations.map(loc => (
                                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* License Credentials Section - Collapsible */}
                                            <details className="bg-blue-50 border border-blue-200 rounded-xl mt-3">
                                                <summary className="p-3 cursor-pointer text-sm font-bold text-blue-900 flex justify-between items-center">
                                                    Professional Credentials
                                                    <span className="text-xs font-normal text-slate-500">Tap to expand</span>
                                                </summary>
                                                <div className="p-3 pt-0">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">License Type</label>
                                                        <select
                                                            value={formData.licenseType || ''}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, licenseType: e.target.value }))}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                        >
                                                            <option value="">Select License Type</option>
                                                            <option value="KMPDC">Medical License (KMPDC)</option>
                                                            <option value="NCK">Nursing License (NCK)</option>
                                                            <option value="CDK">Clinical Officer (CDK)</option>
                                                            <option value="PPB">Pharmacy License (PPB)</option>
                                                            <option value="KMLTB">Lab Tech License (KMLTB)</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">License Number</label>
                                                        <input
                                                            type="text"
                                                            value={formData.licenseNumber || ''}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                            placeholder="e.g., A12345"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Licensing Authority</label>
                                                        <input
                                                            type="text"
                                                            value={formData.licenseAuthority || ''}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, licenseAuthority: e.target.value }))}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                            placeholder="e.g., Medical Practitioners Board"
                                                        />
                                                    </div>
                                                    <div>
                                                        <DateInput
                                                            label="License Expiry Date"
                                                            value={formData.licenseExpiry || ''}
                                                            onChange={(value) => setFormData(prev => ({ ...prev, licenseExpiry: value }))}
                                                        />
                                                    </div>
                                                    <div className="col-span-1 md:col-span-2">
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">License Document</label>
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx,.xls,.xlsx"
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    setLicenseFile(e.target.files[0]);
                                                                }
                                                            }}
                                                            className="w-full text-sm text-slate-500
                                                file:mr-4 file:py-1.5 file:px-3
                                                file:rounded-full file:border-0
                                                file:text-xs file:font-semibold
                                                file:bg-blue-50 file:text-blue-700
                                                hover:file:bg-blue-100"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-1">Upload PDF, Image, or Document (Max 5MB)</p>
                                                    </div>
                                                </div>
                                            </details>

                                            {/* Compensation fields based on employment type */}
                                            <div className="flex justify-between items-center mt-4 mb-2">
                                                <h3 className="text-sm font-bold text-slate-700">Compensation Details</h3>
                                                <PrivacyToggle isVisible={showSalary} onToggle={() => setShowSalary(!showSalary)} label={showSalary ? 'Hide' : 'Show'} />
                                            </div>

                                            {/* Full-Time: Monthly Salary only */}
                                            {formData.employmentType === 'Full-Time' && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Salary (KES) <span className="font-normal text-slate-400">- Optional</span></label>
                                                    <input
                                                        type={showSalary ? "number" : "password"}
                                                        value={formData.monthlySalaryCents ? formData.monthlySalaryCents / 100 : ''}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, monthlySalaryCents: Number(e.target.value) * 100 }))}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                        placeholder={showSalary ? "e.g., 50000" : "••••••"}
                                                        readOnly={!showSalary}
                                                    />
                                                    <p className="text-xs text-[#94A3B8] mt-1">You can configure or change payroll details later.</p>
                                                </div>
                                            )}

                                            {/* Part-Time: Monthly Salary OR Hourly Rate */}
                                            {formData.employmentType === 'Part-Time' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Salary (KES) <span className="font-normal text-slate-400">- Optional</span></label>
                                                        <input
                                                            type={showSalary ? "number" : "password"}
                                                            value={formData.monthlySalaryCents ? formData.monthlySalaryCents / 100 : ''}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, monthlySalaryCents: Number(e.target.value) * 100 }))}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                            placeholder={showSalary ? "e.g., 25000" : "••••••"}
                                                            readOnly={!showSalary}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hourly Rate (KES) <span className="font-normal text-slate-400">- Optional</span></label>
                                                        <input
                                                            type={showSalary ? "number" : "password"}
                                                            value={formData.hourlyRateCents ? formData.hourlyRateCents / 100 : ''}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, hourlyRateCents: Number(e.target.value) * 100 }))}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                            placeholder={showSalary ? "e.g., 500" : "••••••"}
                                                            readOnly={!showSalary}
                                                        />
                                                    </div>
                                                    <p className="col-span-2 text-xs text-[#94A3B8]">You can configure or change payroll details later.</p>
                                                </div>
                                            )}

                                            {/* Contract/Locum/External: No salary fields, show info message */}
                                            {(formData.employmentType === 'Contract' || formData.employmentType === 'Locum' || formData.employmentType === 'External') && (
                                                <div className="bg-[#F1F5F9] p-4 rounded-xl border border-[#E2E8F0]">
                                                    <p className="text-sm text-[#475569]">
                                                        💡 Compensation details are not required for {formData.employmentType} staff. You can configure payroll details later if needed.
                                                    </p>
                                                </div>
                                            )}


                                            <div className="flex space-x-3 mt-4 pt-3 border-t border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowAddModal(false); resetForm(); }}
                                                    className="flex-1 py-3 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                                                >
                                                    Send Invitation
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                }


                {/* Permissions Dialog */}
                <PermissionsDialog
                    isOpen={showPermissionsModal}
                    onClose={handlePermissionsClose}
                    onSave={handlePermissionsSave}
                    staffName={`${formData.firstName} ${formData.lastName}`}
                    jobTitle={formData.jobTitle || ''}
                    adminSeats={adminSeats}
                    initialPermissions={pendingPermissions || undefined}
                />

                {/* Review Vetting Modal */}
                <ReviewVettingModal
                    isOpen={showReviewModal}
                    onClose={() => { setShowReviewModal(false); setSelectedReviewStaff(null); }}
                    staff={selectedReviewStaff}
                    onUpdateStatus={handleVettingUpdate}
                    onReject={handleVettingReject}
                    onExpire={handleVettingExpire}
                />
            </div>
        </div>
    );
};

export default StaffManagement;
