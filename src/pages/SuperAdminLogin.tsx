import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, Key, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

const SuperAdminLogin: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPin, setShowPin] = useState(false);

    // Hardcoded secure PIN for MVP
    const SUPER_ADMIN_PIN = '112233';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. PIN Check
            if (pin !== SUPER_ADMIN_PIN) {
                throw new Error('Invalid Security PIN');
            }

            // 2. Firebase Auth Login
            await login(email, password);

            // 3. Navigate to admin dashboard
            navigate('/admin');

        } catch (err: any) {
            setError(err.message || 'Login failed. Verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-700">

                {/* Header */}
                <div className="bg-gradient-to-r from-teal-700 to-emerald-700 p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Super Admin Portal</h1>
                    <p className="text-teal-100 text-sm">Restricted Access Only</p>
                </div>

                {/* Form */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl flex items-start space-x-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Admin Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder-slate-600"
                                    placeholder="admin@hurecore.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 text-white pl-12 pr-12 py-3 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder-slate-600"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                Security PIN
                            </label>
                            <div className="relative">
                                <Key className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                                <input
                                    type={showPin ? 'text' : 'password'}
                                    required
                                    maxLength={6}
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-slate-900 border border-slate-700 text-white pl-12 pr-12 py-3 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors placeholder-slate-600 tracking-widest font-mono"
                                    placeholder="******"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPin(!showPin)}
                                    className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Access Dashboard</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-8 border-t border-slate-700/50">
                        <p className="text-slate-500 text-xs">
                            Unauthorized access attempts are logged and monitored.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminLogin;
