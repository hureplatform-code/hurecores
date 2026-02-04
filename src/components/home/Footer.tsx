import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer className="bg-slate-900 text-white pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
                    <div className="lg:col-span-2 space-y-6">
                        <Link to="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-display font-bold text-xl">H</span>
                            </div>
                            <span className="text-xl font-bold font-display text-white">
                                HURE <span className="text-blue-500">Core</span>
                            </span>
                        </Link>
                        <p className="text-slate-400 leading-relaxed text-sm">
                            The modern operating system for healthcare staffing. Automate scheduling, attendance, and payroll compliance in one platform.
                        </p>
                        <div className="flex space-x-4">
                            {/* Social placeholders */}
                            {['twitter', 'linkedin', 'facebook'].map(s => (
                                <a key={s} href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all">
                                    <span className="capitalize text-xs">{s[0]}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-6">Product</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Features</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Pricing</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Integrations</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Enterprise</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-6">Company</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#" className="hover:text-blue-400 transition-colors">About Us</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Careers</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Blog</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Contact</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-white mb-6">Resources</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Help Center</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Guides</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">API Status</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Partners</a></li>
                        </ul>
                    </div>

                    <div className="lg:col-span-1">
                        <h4 className="font-bold text-white mb-6">Legal</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Terms</a></li>
                            <li><a href="#" className="hover:text-blue-400 transition-colors">Security</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between">
                    <p className="text-slate-500 text-sm">© 2024 HURE Core Inc. All rights reserved.</p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <span className="text-slate-500 text-sm flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>All Systems Operational</span>
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
