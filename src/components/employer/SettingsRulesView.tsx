import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { settingsService } from '../../lib/services';
import type {
    OrganizationSettings,
    AttendanceRules,
    LunchRules,
    BreakRules,
    SchedulingRules
} from '../../types';
import {
    DEFAULT_ATTENDANCE_RULES,
    DEFAULT_LUNCH_RULES,
    DEFAULT_BREAK_RULES,
    DEFAULT_SCHEDULING_RULES
} from '../../types';

const SettingsRulesView: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);

    // Form state
    const [attendance, setAttendance] = useState<AttendanceRules>(DEFAULT_ATTENDANCE_RULES);
    const [lunch, setLunch] = useState<LunchRules>(DEFAULT_LUNCH_RULES);
    const [breaks, setBreaks] = useState<BreakRules>(DEFAULT_BREAK_RULES);
    const [scheduling, setScheduling] = useState<SchedulingRules>(DEFAULT_SCHEDULING_RULES);

    useEffect(() => {
        if (user?.organizationId) {
            loadSettings();
        }
    }, [user?.organizationId]);

    const loadSettings = async () => {
        if (!user?.organizationId) return;
        setLoading(true);
        try {
            const data = await settingsService.getSettings(user.organizationId);
            setSettings(data);
            setAttendance(data.attendance);
            setLunch(data.lunch);
            setBreaks(data.breaks);
            setScheduling(data.scheduling || DEFAULT_SCHEDULING_RULES);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user?.organizationId) return;
        setSaving(true);
        try {
            await settingsService.updateSettings(user.organizationId, {
                attendance,
                lunch,
                breaks,
                scheduling
            });
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefaults = async () => {
        if (!user?.organizationId) return;
        if (!confirm('Are you sure you want to reset all settings to defaults?')) return;

        setSaving(true);
        try {
            const data = await settingsService.resetToDefaults(user.organizationId);
            setSettings(data);
            setAttendance(data.attendance);
            setLunch(data.lunch);
            setBreaks(data.breaks);
            setScheduling(data.scheduling || DEFAULT_SCHEDULING_RULES);
            alert('Settings reset to defaults!');
        } catch (error) {
            console.error('Error resetting settings:', error);
            alert('Failed to reset settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Time & Attendance Rules</h2>
                    <p className="text-slate-500">Control clock-in behavior, breaks, lunch, and daily limits. Applies by default to all staff unless overridden.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleResetToDefaults}
                        disabled={saving}
                        className="px-4 py-2 text-slate-600 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        Reset to Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#1a2e35' }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Scheduling Rules Section */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Shift Scheduling</h3>
                                <p className="text-xs text-slate-500 mt-1">Enable shift planning and assignments</p>
                            </div>
                            <ToggleSwitch
                                checked={scheduling.enabled}
                                onChange={(checked) => setScheduling({ ...scheduling, enabled: checked })}
                            />
                        </div>

                        {scheduling.enabled && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                {/* Allow Open Shifts */}
                                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Allow Open Shifts</label>
                                        <p className="text-xs text-slate-500 mt-0.5">Staff can see and pick up unassigned shifts</p>
                                    </div>
                                    <ToggleSwitch
                                        checked={scheduling.allowOpenShifts}
                                        onChange={(checked) => setScheduling({ ...scheduling, allowOpenShifts: checked })}
                                    />
                                </div>

                                {/* Allow Shift Swaps (Coming Soon / Hidden or Disabled if desired, but here for completeness) */}
                                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Allow Shift Swaps</label>
                                        <p className="text-xs text-slate-500 mt-0.5">Staff can request to swap shifts with colleagues</p>
                                    </div>
                                    <ToggleSwitch
                                        checked={scheduling.allowShiftSwaps}
                                        onChange={(checked) => setScheduling({ ...scheduling, allowShiftSwaps: checked })}
                                    />
                                </div>

                                {/* Require Acceptance */}
                                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Require Staff Acceptance</label>
                                        <p className="text-xs text-slate-500 mt-0.5">Shifts assigned by managers must be accepted by staff</p>
                                    </div>
                                    <ToggleSwitch
                                        checked={scheduling.requireAcceptance}
                                        onChange={(checked) => setScheduling({ ...scheduling, requireAcceptance: checked })}
                                    />
                                </div>
                            </div>
                        )}
                        {!scheduling.enabled && (
                            <div className="mt-4 bg-slate-50 p-4 rounded-xl text-sm text-slate-600 border border-slate-200">
                                <span className="font-semibold">Note:</span> When disabled, employees will see a message that the organization does not currently use shift scheduling in HURE.
                            </div>
                        )}
                    </div>
                    {/* Attendance Mode Section */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Attendance Mode</h3>
                            <ToggleSwitch
                                checked={attendance.enabled}
                                onChange={(checked) => setAttendance({ ...attendance, enabled: checked })}
                            />
                        </div>

                        {attendance.enabled && (
                            <div className="space-y-5">
                                {/* Attendance Is */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Attendance is:</label>
                                        <select
                                            value={attendance.enabled ? 'Enabled' : 'Disabled'}
                                            onChange={(e) => setAttendance({ ...attendance, enabled: e.target.value === 'Enabled' })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option>Enabled</option>
                                            <option>Disabled</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Clocking basis:</label>
                                        <select
                                            value={attendance.mode === 'daily' ? 'Daily (no shift required)' : 'Shift-based'}
                                            onChange={(e) => setAttendance({ ...attendance, mode: e.target.value.includes('Daily') ? 'daily' : 'shift-based' })}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option>Daily (no shift required)</option>
                                            <option>Shift-based</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Allow clock-in without shift */}
                                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                                    <label className="text-sm font-medium text-slate-700">Allow clock-in without assigned shift?</label>
                                    <ToggleSwitch
                                        checked={attendance.allowClockInWithoutShift}
                                        onChange={(checked) => setAttendance({ ...attendance, allowClockInWithoutShift: checked })}
                                    />
                                </div>

                                {/* Early/Late clock-in */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Allow clock-in:</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={attendance.earlyClockInMinutes}
                                                onChange={(e) => setAttendance({ ...attendance, earlyClockInMinutes: parseInt(e.target.value) || 0 })}
                                                className="w-20 px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-600">minutes</span>
                                            <select className="px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500">
                                                <option>~</option>
                                            </select>
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={attendance.lateClockInMinutes}
                                                onChange={(e) => setAttendance({ ...attendance, lateClockInMinutes: parseInt(e.target.value) || 0 })}
                                                className="w-20 px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-600">minutes</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Allow clock-in:</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={attendance.lateClockInMinutes}
                                                onChange={(e) => setAttendance({ ...attendance, lateClockInMinutes: parseInt(e.target.value) || 0 })}
                                                className="w-20 px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-600">minutes</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Require location */}
                                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                                    <div>
                                        <label className="text-sm font-medium text-slate-700">Require location selection at clock-in</label>
                                        <p className="text-xs text-slate-500 mt-0.5">Clock-in: {attendance.earlyClockInMinutes} min early · {attendance.lateClockInMinutes} min late</p>
                                    </div>
                                    <ToggleSwitch
                                        checked={attendance.requireLocationAtClockIn}
                                        onChange={(checked) => setAttendance({ ...attendance, requireLocationAtClockIn: checked })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Lunch Rules Section */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Lunch Rules</h3>
                            <ToggleSwitch
                                checked={lunch.enabled}
                                onChange={(checked) => setLunch({ ...lunch, enabled: checked })}
                            />
                        </div>
                        <p className="text-xs font-medium text-slate-500 mb-4">Enable lunch tracking</p>

                        {lunch.enabled && (
                            <div className="space-y-5">
                                {/* Number of lunches per day */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of lunches allowed per day:</label>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={lunch.oncePerDay ? '1' : '2'}
                                                onChange={(e) => setLunch({ ...lunch, oncePerDay: e.target.value === '1' })}
                                                className="w-20 px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            >
                                                <option value="1">1</option>
                                                <option value="2">2</option>
                                            </select>
                                            <span className="text-xs text-slate-500">-</span>
                                            <span className="text-xs text-slate-500">-</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Lunch duration:</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="15"
                                                max="120"
                                                value={lunch.minDurationMinutes}
                                                onChange={(e) => setLunch({ ...lunch, minDurationMinutes: parseInt(e.target.value) || 30 })}
                                                className="w-20 px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-600">minutes</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Lunch is paid/unpaid */}
                                <div className="flex items-center justify-between py-3">
                                    <label className="text-sm font-medium text-slate-700">Lunch is:</label>
                                    <div className="flex items-center gap-2">
                                        <ToggleSwitch
                                            checked={!lunch.isPaid}
                                            onChange={(checked) => setLunch({ ...lunch, isPaid: !checked })}
                                        />
                                        <select
                                            value={lunch.isPaid ? 'Paid' : 'Unpaid'}
                                            onChange={(e) => setLunch({ ...lunch, isPaid: e.target.value === 'Paid' })}
                                            className="px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option>Unpaid</option>
                                            <option>Paid</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Lunch required after hours */}
                                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                                    <label className="text-sm font-medium text-slate-700">Lunch is required?</label>
                                    <div className="flex items-center gap-2">
                                        <ToggleSwitch
                                            checked={!!lunch.requiredAfterHours}
                                            onChange={(checked) => setLunch({ ...lunch, requiredAfterHours: checked ? 4 : undefined })}
                                        />
                                        <span className="text-sm text-slate-600">time between</span>
                                        <span className="text-xs text-slate-400">Prompt staff to take lunch after {lunch.requiredAfterHours || 4} hours clocked in</span>
                                    </div>
                                </div>

                                {/* Lunch reminder */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Lunch reminder:</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max="8"
                                            value={lunch.reminderAfterHours || 4}
                                            onChange={(e) => setLunch({ ...lunch, reminderAfterHours: parseInt(e.target.value) || 4 })}
                                            className="w-20 px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-slate-600">hours</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Break Rules Section */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Break Rules</h3>
                            <ToggleSwitch
                                checked={breaks.enabled}
                                onChange={(checked) => setBreaks({ ...breaks, enabled: checked })}
                            />
                        </div>
                        <p className="text-xs font-medium text-slate-500 mb-4">Enable break tracking</p>

                        {breaks.enabled && (
                            <div className="space-y-5">
                                {/* Max breaks per day */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Maximum breaks per day:</label>
                                        <select
                                            value={breaks.maxBreaksPerDay}
                                            onChange={(e) => setBreaks({ ...breaks, maxBreaksPerDay: parseInt(e.target.value) })}
                                            className="w-24 px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        >
                                            <option value="0">0</option>
                                            <option value="1">1</option>
                                            <option value="2">2</option>
                                            <option value="3">3</option>
                                            <option value="4">4</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Break duration:</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="5"
                                                max="30"
                                                value={breaks.maxDurationMinutes}
                                                onChange={(e) => setBreaks({ ...breaks, maxDurationMinutes: parseInt(e.target.value) || 15 })}
                                                className="w-20 px-3 py-2.5 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-600">minutes</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Breaks are paid/unpaid */}
                                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                                    <label className="text-sm font-medium text-slate-700">Breaks are:</label>
                                    <select
                                        value={breaks.isPaid ? 'Paid' : 'Unpaid'}
                                        onChange={(e) => setBreaks({ ...breaks, isPaid: e.target.value === 'Paid' })}
                                        className="px-3 py-2 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option>Paid</option>
                                        <option>Unpaid</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Current Policy Summary */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <h4 className="font-bold text-slate-900 mb-4">Current Policy Summary</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className={`${scheduling.enabled ? 'text-green-500' : 'text-slate-300'} mt-0.5`}>•</span>
                                <span>Scheduling: {scheduling.enabled ? 'Enabled' : 'Disabled'}</span>
                            </li>
                            {lunch.enabled && (
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span>Lunch: {lunch.oncePerDay ? 'once/day' : '2/day'} · {lunch.minDurationMinutes} min min · {lunch.isPaid ? 'paid' : 'unpaid'}</span>
                                </li>
                            )}
                            {breaks.enabled && (
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span>Breaks: {breaks.maxBreaksPerDay}/day · up to {breaks.maxDurationMinutes} min · {breaks.isPaid ? 'paid' : 'unpaid'}</span>
                                </li>
                            )}
                            {attendance.enabled && (
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span>Clock-in: {attendance.earlyClockInMinutes} min early · {attendance.lateClockInMinutes} min late</span>
                                </li>
                            )}
                            {!attendance.enabled && !lunch.enabled && !breaks.enabled && (
                                <li className="text-slate-400 italic">All attendance features disabled</li>
                            )}
                        </ul>
                    </div>

                    {/* Need Help */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                        <h4 className="font-bold text-slate-900 mb-2">Need help?</h4>
                        <button
                            className="w-full py-2.5 px-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#25D366' }}
                        >
                            <span>💬</span>
                            <span>WhatsApp Support</span>
                        </button>
                    </div>

                    {/* Documents & Policies Quick Link */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                        <h4 className="font-bold text-slate-900 mb-2">Documents & Policies</h4>
                        <p className="text-xs text-slate-500 mb-4">
                            Upload + R documents (contracts, policies, SOPs, and handbooks. Manage access.
                        </p>
                        <a
                            href="/employer/documents"
                            className="inline-block w-full py-2.5 px-4 rounded-xl font-semibold text-center text-white transition-colors"
                            style={{ backgroundColor: '#1a2e35' }}
                        >
                            Manage Documents
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Toggle Switch Component
interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${checked ? 'bg-teal-500' : 'bg-slate-200'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                    }`}
            />
        </button>
    );
};

export default SettingsRulesView;
