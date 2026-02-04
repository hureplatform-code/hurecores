import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService: React.FC = () => {
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
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Terms of Service</h1>
                    <p className="text-slate-500 mb-8">Effective Date: January 24, 2026</p>

                    <div className="prose prose-slate max-w-none">
                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                By accessing or using HURE Core ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you should not use the Service.
                            </p>
                            <p className="text-slate-700 leading-relaxed">
                                These Terms apply to all users accessing HURE Core on behalf of an organization.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Description of the Service</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                HURE Core is a healthcare workforce management platform designed to help organizations manage staff operations, including:
                            </p>
                            <ul className="space-y-2 text-slate-700 ml-6">
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Staff records and roles</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Scheduling and shift management</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Attendance and leave tracking</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Payroll-ready exports and reports</span>
                                </li>
                            </ul>
                            <p className="text-slate-700 leading-relaxed mt-4">
                                HURE Core provides software tools only and does not process payroll payments, patient care, or clinical services.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Eligibility and Accounts</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                You must be authorized by your organization to create or use an account on HURE Core.
                            </p>
                            <p className="text-slate-700 leading-relaxed">
                                You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Free Trial and Subscriptions</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                HURE Core may offer a free trial period. During the trial:
                            </p>
                            <ul className="space-y-2 text-slate-700 ml-6 mb-4">
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Organizations receive access to selected plan features</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>No payment is required during the trial period</span>
                                </li>
                            </ul>
                            <p className="text-slate-700 leading-relaxed">
                                After the trial ends, continued use of the Service may require a paid subscription. Subscription terms, pricing, and billing details will be presented before payment is required.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. User Responsibilities</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                By using HURE Core, you agree to:
                            </p>
                            <ul className="space-y-2 text-slate-700 ml-6 mb-4">
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Provide accurate and lawful information</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Use the Service only for workforce management purposes</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Ensure that patient clinical data is not entered into the platform</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Comply with applicable laws and regulations</span>
                                </li>
                            </ul>
                            <p className="text-slate-700 leading-relaxed">
                                You may not misuse the Service, interfere with its operation, or attempt to access unauthorized data.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Data Ownership and Use</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                Organizations retain ownership of their workforce data entered into HURE Core.
                            </p>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                By using the Service, you grant HURE Core permission to process this data solely for the purpose of providing the Service.
                            </p>
                            <p className="text-slate-700 leading-relaxed">
                                HURE Core does not claim ownership of your data.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Service Availability</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                We aim to provide reliable access to HURE Core but do not guarantee uninterrupted availability.
                            </p>
                            <p className="text-slate-700 leading-relaxed">
                                Maintenance, updates, or technical issues may result in temporary service interruptions.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Account Suspension or Termination</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                We reserve the right to suspend or terminate access to HURE Core if:
                            </p>
                            <ul className="space-y-2 text-slate-700 ml-6 mb-4">
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>These Terms are violated</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>The Service is misused</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-teal-600 mr-2">•</span>
                                    <span>Required payments are not made after the trial period</span>
                                </li>
                            </ul>
                            <p className="text-slate-700 leading-relaxed">
                                Organizations may request account termination at any time.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Limitation of Liability</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                To the maximum extent permitted by law, HURE Core is provided "as is" and "as available."
                            </p>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                HURE Core is not liable for indirect, incidental, or consequential damages arising from the use of the Service.
                            </p>
                            <p className="text-slate-700 leading-relaxed">
                                HURE Core does not provide medical, legal, or payroll advice.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Changes to These Terms</h2>
                            <p className="text-slate-700 leading-relaxed mb-4">
                                We may update these Terms of Service from time to time. Updated terms will be posted on this page with an updated effective date.
                            </p>
                            <p className="text-slate-700 leading-relaxed">
                                Continued use of the Service constitutes acceptance of the updated Terms.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Governing Law</h2>
                            <p className="text-slate-700 leading-relaxed">
                                These Terms are governed by the laws of the Republic of Kenya, without regard to its conflict of law principles.
                            </p>
                        </section>

                        <section className="mb-10">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Contact Information</h2>
                            <p className="text-slate-700 leading-relaxed">
                                If you have questions about these Terms of Service, please contact us at:{' '}
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

export default TermsOfService;
