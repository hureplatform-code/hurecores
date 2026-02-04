import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { staffService } from '../lib/services/staff.service';

const AcceptInvite: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { signup } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [invitation, setInvitation] = useState<any>(null);

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const token = searchParams.get('token');

    useEffect(() => {
        loadInvitation();
    }, [token]);

    const loadInvitation = async () => {
        if (!token) {
            setError('Invalid invitation link. No token provided.');
            setLoading(false);
            return;
        }

        try {
            const invite = await staffService.getInvitation(token);

            if (!invite) {
                setError('Invitation not found. It may have been cancelled or expired.');
                setLoading(false);
                return;
            }

            if (invite.status === 'accepted') {
                setError('This invitation has already been accepted. Please log in instead.');
                setLoading(false);
                return;
            }

            if (invite.status === 'cancelled') {
                setError('This invitation has been cancelled by the organization.');
                setLoading(false);
                return;
            }

            if (new Date(invite.expiresAt) < new Date()) {
                setError('This invitation has expired. Please contact your organization for a new invite.');
                setLoading(false);
                return;
            }

            setInvitation(invite);
        } catch (err) {
            console.error('Error loading invitation:', err);
            setError('Failed to load invitation details.');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);

        try {
            // Step 1: Create Firebase Auth account
            const firebaseUser = await signup(invitation.email, password);
            const userId = firebaseUser.uid;

            // Step 2: Accept invitation (creates user profile)
            const result = await staffService.acceptInvitation(token!, userId);

            if (!result.success) {
                setError(result.error || 'Failed to accept invitation.');
                setSubmitting(false);
                return;
            }

            // Step 3: Navigate to employee dashboard
            navigate('/employee');

        } catch (err: any) {
            console.error('Accept invite error:', err);

            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists. Please log in instead.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use at least 6 characters.');
            } else {
                setError(err.message || 'Failed to create account. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading invitation...</p>
                </div>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">❌</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-4">Invalid Invitation</h1>
                        <p className="text-slate-600 mb-6">{error}</p>
                        <Link
                            to="/login"
                            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-2xl font-bold">H</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Accept Invitation</h1>
                    <p className="text-slate-500 mt-2">You've been invited to join an organization</p>
                </div>

                {/* Invitation Details */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                    <h3 className="font-bold text-blue-900 mb-3">Invitation Details</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-blue-700">Name:</span>
                            <span className="font-medium text-blue-900">{invitation?.fullName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-blue-700">Email:</span>
                            <span className="font-medium text-blue-900">{invitation?.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-blue-700">Role:</span>
                            <span className="font-medium text-blue-900">{invitation?.systemRole}</span>
                        </div>
                        {invitation?.jobTitle && (
                            <div className="flex justify-between">
                                <span className="text-blue-700">Job Title:</span>
                                <span className="font-medium text-blue-900">{invitation?.jobTitle}</span>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAcceptInvite} className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                        <p className="text-slate-900 font-medium">{invitation?.email}</p>
                        <p className="text-xs text-slate-500 mt-1">This will be your login email</p>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Create Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Minimum 6 characters"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Confirm your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
                    >
                        {submitting ? 'Creating Account...' : 'Accept & Create Account'}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AcceptInvite;
