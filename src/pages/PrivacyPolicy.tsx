import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 group cursor-pointer"
                    >
                        <div className="grid place-items-center h-8 w-8 rounded-xl bg-teal-600 font-bold text-white shadow-lg shadow-teal-600/20 transition-transform group-hover:scale-105">H</div>
                        <div className="leading-tight">
                            <div className="font-bold text-slate-900 tracking-tight">
                                HURE <span className="text-teal-600">Core</span>
                            </div>
                            <div className="text-xs text-teal-600 font-semibold">Staff management</div>
                        </div>
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                    >
                        ← Back
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-6 py-16">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
                    <p className="text-slate-500 mb-8">Effective Date: January 24, 2026</p>

                    <div className="prose prose-slate max-w-none">
                        <p className="text-lg text-slate-700 leading-relaxed mb-8">
                            HURE Core handles personal data in accordance with applicable data protection laws, including Kenya's Data Protection Act, 2019.
                        </p>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                HURE Core collects limited workforce-related information provided by healthcare organizations for the purpose of managing staff operations. This may include:
                            </p>
                            <ul className="space-y-2 text-slate-700 ml-6">
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Staff names and identifiers</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Job roles and permissions</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Work schedules and assigned shifts</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Attendance and time-tracking records</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Leave and availability information</span>
                                </li>
                            </ul>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Information We Do Not Collect</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                HURE Core is a workforce management platform and does not collect, store, or process:
                            </p>
                            <ul className="space-y-2 text-slate-700 ml-6">
                                <li className="flex items-start">
                                    <span className="text-red-600 mr-2">•</span>
                                    <span>Patient medical records</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-red-600 mr-2">•</span>
                                    <span>Clinical notes</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-red-600 mr-2">•</span>
                                    <span>Diagnoses, treatment data, or health histories</span>
                                </li>
                            </ul>
                            <p className="text-slate-700 leading-relaxed mt-4">
                                Organizations are responsible for ensuring that patient clinical information is not entered into HURE Core.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. How We Use Information</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                Information collected through HURE Core is used solely to support workforce operations, including:
                            </p>
                            <ul className="space-y-2 text-slate-700 ml-6">
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Managing staff records and roles</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Creating and managing work schedules</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Tracking attendance and leave</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Generating payroll-ready exports based on recorded attendance and rules</span>
                                </li>
                            </ul>
                            <p className="text-slate-700 leading-relaxed mt-4">
                                HURE Core does not sell user data or use workforce information for advertising purposes.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Data Security</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                We take reasonable technical and organizational measures to protect data stored in HURE Core, including:
                            </p>
                            <ul className="space-y-2 text-slate-700 ml-6">
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Role-based access controls</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Restricted administrative permissions</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Logical separation of organizational data</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Secure access to accounts</span>
                                </li>
                            </ul>
                            <p className="text-slate-700 leading-relaxed mt-4">
                                No system is completely secure, but we continuously work to protect information from unauthorized access, loss, or misuse.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. User Rights and Data Control</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                Organizations and authorized users have control over their data within HURE Core, including the ability to:
                            </p>
                            <ul className="space-y-2 text-slate-700 ml-6">
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Access workforce data stored in the platform</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Update or correct staff information</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Request account deactivation or deletion</span>
                                </li>
                            </ul>
                            <p className="text-slate-700 leading-relaxed mt-4">
                                Upon account termination or deletion, data will be handled in accordance with applicable laws and reasonable retention requirements.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Cross-border Data Transfers</h2>
                            <p className="text-slate-700 leading-relaxed">
                                Data may be processed or stored on servers located outside Kenya where appropriate safeguards are in place.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Changes to This Policy</h2>
                            <p className="text-slate-700 leading-relaxed">
                                We may update this Privacy Policy from time to time to reflect product or legal changes. Updates will be posted on this page with an updated effective date.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Contact Us</h2>
                            <p className="text-slate-700 leading-relaxed">
                                If you have questions about this Privacy Policy or how data is handled in HURE Core, please contact us at:{' '}
                                <a href="mailto:info@gethure.com" className="text-teal-600 hover:text-teal-700 font-semibold">
                                    info@gethure.com
                                </a>
                            </p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
