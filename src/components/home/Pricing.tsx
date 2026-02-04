import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PLANS } from '../../constants';

const Pricing: React.FC = () => {
    const [annual, setAnnual] = useState(false);

    return (
        <section id="pricing" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-blue-600 font-bold tracking-widest uppercase text-2xl mb-3">Flexible Pricing</h2>
                    <h3 className="text-3xl md:text-5xl font-bold text-slate-900 font-display mb-6">Simple, Transparent Plans</h3>
                    <p className="text-xl text-slate-500 leading-relaxed mb-8">
                        Choose the plan that fits your clinic's stage of growth. No hidden fees.
                    </p>

                    <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl">
                        <button
                            onClick={() => setAnnual(false)}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${!annual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setAnnual(true)}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${annual ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Yearly <span className="text-green-600 ml-1 text-xs">-20%</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PLANS.map((p, i) => (
                        <div key={i} className={`p-10 rounded-3xl border flex flex-col transition-all duration-300 hover:-translate-y-2 ${p.popular ? 'border-blue-600 ring-4 ring-blue-50/50 shadow-xl relative scale-105 z-10 hover:shadow-2xl' : 'border-slate-200 hover:border-blue-300 hover:shadow-xl'}`}>
                            {p.popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-md">Most Popular</div>}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">{p.name}</h3>
                                <p className="text-slate-500 text-sm">For growing clinics</p>
                            </div>

                            <div className="flex items-baseline mb-8">
                                <span className="text-5xl font-bold text-slate-900">{p.price}</span>
                                <span className="text-slate-500 ml-2 font-medium">/mo</span>
                            </div>

                            <div className="flex-grow space-y-4 mb-10">
                                <div className="flex items-center text-slate-700 font-bold">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-xs">✓</div>
                                    Up to {p.locations} Location
                                </div>
                                <div className="flex items-center text-slate-700 font-bold">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-xs">✓</div>
                                    Up to {p.staff} Staff
                                </div>
                                <div className="flex items-center text-slate-700 font-bold">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-xs">✓</div>
                                    {p.admins} Admin Roles
                                </div>

                                <div className="h-px bg-slate-100 my-4"></div>

                                {p.features.map((feat, fi) => (
                                    <div key={fi} className="flex items-start text-slate-600 text-sm">
                                        <svg className="w-5 h-5 text-green-500 mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                        {feat}
                                    </div>
                                ))}
                            </div>

                            <Link to="/signup" className={`w-full py-4 rounded-xl font-bold text-center transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${p.popular ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                                Get Started
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
