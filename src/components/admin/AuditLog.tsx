import React, { useState } from 'react';
import DateInput from '../common/DateInput';

interface AuditEvent {
    id: string;
    timestamp: string;
    type: 'Security' | 'System' | 'Payment' | 'Verification';
    user: string;
    description: string;
    ipAddress: string;
}

const AuditLog: React.FC = () => {
    const [events] = useState<AuditEvent[]>([
        { id: 'LOG-001', timestamp: '2025-01-02 14:30:22', type: 'Payment', user: 'System', description: 'Monthly subscription charged for Clinic #882', ipAddress: '10.0.0.1' },
        { id: 'LOG-002', timestamp: '2025-01-02 12:15:00', type: 'Security', user: 'admin@hurecore.com', description: 'Admin login successful', ipAddress: '192.168.1.45' },
        { id: 'LOG-003', timestamp: '2025-01-02 11:45:10', type: 'Verification', user: 'admin@hurecore.com', description: 'Approved facility license for Care Health', ipAddress: '192.168.1.45' },
        { id: 'LOG-004', timestamp: '2025-01-01 09:30:00', type: 'System', user: 'System', description: 'Database backup completed', ipAddress: '10.0.0.1' },
    ]);

    const [filterType, setFilterType] = useState('All');
    const [filterDate, setFilterDate] = useState('');

    const filteredEvents = filterType === 'All' ? events : events.filter(e => e.type === filterType);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">System Audit Logs</h2>
                    <p className="text-slate-500">Track all critical system activities and security events.</p>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50">⬇ Export Logs</button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
                    <input type="text" placeholder="Search logs..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl transition-all" />
                </div>
                <select
                    className="px-4 py-2 bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 border-transparent focus:border-blue-500"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="All">All Events</option>
                    <option value="Security">Security</option>
                    <option value="System">System</option>
                    <option value="Payment">Payment</option>
                    <option value="Verification">Verification</option>
                </select>
                <DateInput
                    label=""
                    value={filterDate}
                    onChange={(value) => setFilterDate(value)}
                    className="w-40"
                />
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Event Type</th>
                            <th className="px-6 py-4">User / Actor</th>
                            <th className="px-6 py-4">Activity Description</th>
                            <th className="px-6 py-4 text-right">IP Address</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredEvents.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-mono text-slate-600">{log.timestamp}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${log.type === 'Security' ? 'bg-red-50 text-red-700 border-red-100' :
                                        log.type === 'Payment' ? 'bg-green-50 text-green-700 border-green-100' :
                                            log.type === 'Verification' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                        {log.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-800">{log.user}</td>
                                <td className="px-6 py-4 text-slate-600 text-sm max-w-md truncate" title={log.description}>
                                    {log.description}
                                </td>
                                <td className="px-6 py-4 text-right text-xs font-mono text-slate-400">
                                    {log.ipAddress}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest pt-4">
                End of Logs
            </div>
        </div>
    );
};

export default AuditLog;
