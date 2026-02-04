import React from 'react';
import { Link } from 'react-router-dom';

const Hero: React.FC = () => {
    return (
        <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <div className="inline-flex items-center space-x-2 bg-white border border-teal-100 rounded-full px-4 py-1.5 mb-8 shadow-sm animate-fade-in-up">
                    <span className="bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">New</span>
                    <span className="text-sm font-medium text-slate-600">Multi-Tenant Staff Management v2.0</span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-[1.1] animate-fade-in-up animation-delay-100 font-display">
                    Streamline Your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600">Workforce Operations</span>
                </h1>

                <p className="max-w-2xl mx-auto text-xl text-slate-600 mb-12 leading-relaxed animate-fade-in-up animation-delay-200">
                    From smart scheduling to automated payroll. Manage your multi-branch staff with a unified, enterprise-grade core designed for efficiency and compliance.
                </p>

                <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6 animate-fade-in-up animation-delay-300">
                    <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-teal-600 text-white text-lg font-bold rounded-2xl shadow-xl shadow-teal-600/20 hover:bg-teal-700 hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-600/30 transition-all duration-300">
                        Start Free Trial
                    </Link>
                    <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 border border-slate-200 text-lg font-bold rounded-2xl shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all duration-300">
                        View Live Demo
                    </Link>
                </div>

                <div className="mt-16 relative group animate-fade-in-up animation-delay-500">
                    <div className="absolute -inset-1 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
                        <img
                            src="/landing_v2.png"
                            alt="HURE Core Dashboard Interface"
                            className="w-full h-auto object-cover transform transition-transform duration-700 hover:scale-[1.01]"
                        />
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-100 flex flex-wrap justify-center gap-8 opacity-60 grayscale animate-fade-in-up animation-delay-700">
                    {/* Trust badges removed */}
                </div>
            </div>
        </section>
    );
};

export default Hero;
