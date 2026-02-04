import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Features', href: '#features' },
        { name: 'Solutions', href: '#solutions' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Resources', href: '#resources' },
    ];

    return (
        <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled || mobileMenuOpen ? 'bg-white/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'
            }`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <Link to="/" className="flex items-center space-x-2 z-50 relative">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-display font-bold text-xl">H</span>
                    </div>
                    <span className={`text-xl font-bold font-display tracking-tight ${scrolled || mobileMenuOpen ? 'text-slate-900' : 'text-slate-900'
                        }`}>
                        HURE <span className="text-blue-600">Core</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center space-x-8">
                    {navLinks.map((link) => (
                        <button
                            key={link.name}
                            onClick={() => {
                                const element = document.querySelector(link.href);
                                element?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors"
                        >
                            {link.name}
                        </button>
                    ))}
                </div>

                {/* CTA Buttons */}
                <div className="hidden md:flex items-center space-x-4">
                    <Link to="/login" className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">
                        Log In
                    </Link>
                    <Link to="/signup" className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30">
                        Start Free Trial
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden z-50 p-2 text-slate-900"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    )}
                </button>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div className="fixed inset-0 bg-white z-40 flexflex-col pt-24 px-6 md:hidden animate-in fade-in slide-in-from-top-10 duration-200">
                        <div className="flex flex-col space-y-6 text-center">
                            {navLinks.map((link) => (
                                <button
                                    key={link.name}
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        const element = document.querySelector(link.href);
                                        element?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="text-xl font-bold text-slate-900"
                                >
                                    {link.name}
                                </button>
                            ))}
                            <hr className="border-slate-100" />
                            <Link to="/login" className="text-lg font-bold text-slate-600" onClick={() => setMobileMenuOpen(false)}>
                                Log In
                            </Link>
                            <Link to="/signup" className="text-lg font-bold text-blue-600" onClick={() => setMobileMenuOpen(false)}>
                                Start Free Trial
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
