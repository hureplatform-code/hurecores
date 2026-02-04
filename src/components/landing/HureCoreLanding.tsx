import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { siteContentService, DEFAULT_LANDING_CONTENT } from "../../lib/services/siteContent.service";
import ContactModal from "../common/ContactModal";
import heroImg from "../../assets/hero.jpg";
// import { motion, AnimatePresence } from "framer-motion"; // REMOVED

// --- ANIMATION VARIANTS REMOVED ---

// --- STRICT CONTENT VALIDATION ---
const val = (current: string | undefined | null, def: string) => {
    if (!current || !current.trim()) return def;
    return current;
};

// --- HELPERS ---
function KES({ value }: { value: number }) {
    const formatted = useMemo(() => {
        try {
            return new Intl.NumberFormat("en-KE", {
                style: "currency",
                currency: "KES",
                maximumFractionDigits: 0,
            }).format(value);
        } catch {
            return `KES ${Number(value).toLocaleString()}`;
        }
    }, [value]);

    return <span>{formatted}</span>;
}

function classNames(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

// --- ICONS ---
function Icon({ name, className }: { name: string; className?: string }) {
    const common = className || "w-5 h-5";

    if (name === "check")
        return (
            <svg className={common} viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    if (name === "shield")
        return (
            <svg className={common} viewBox="0 0 24 24" fill="none">
                <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
        );
    if (name === "users")
        return (
            <svg className={common} viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 11a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 21v-2a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        );
    if (name === "calendar")
        return (
            <svg className={common} viewBox="0 0 24 24" fill="none">
                <path d="M8 2v4M16 2v4M3 9h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
            </svg>
        );
    if (name === "clock")
        return (
            <svg className={common} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
        );
    if (name === "file")
        return (
            <svg className={common} viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
        );
    if (name === "layers")
        return (
            <svg className={common} viewBox="0 0 24 24" fill="none">
                <path d="M12 2l10 6-10 6L2 8l10-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M22 16l-10 6-10-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M22 12l-10 6-10-6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
        );
    return null;
}

// --- SUB-COMPONENTS ---

function MiniLogo() {
    return (
        <div className="flex items-center gap-2 group cursor-default">
            <div className="grid place-items-center h-8 w-8 rounded-xl bg-teal-600 font-bold text-white shadow-lg shadow-teal-600/20 transition-transform group-hover:scale-105 group-hover:rotate-3">H</div>
            <div className="leading-tight">
                <div className="font-bold text-slate-900 tracking-tight">
                    HURE <span className="text-teal-600">Core</span>
                </div>
                <div className="-mt-0.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400">Workforce OS</div>
            </div>
        </div>
    );
}

function SectionShell({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
    return (
        <section id={id} className={classNames("relative py-20 lg:py-28 overflow-hidden", className)}>
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-8 relative z-10">{children}</div>
        </section>
    );
}

function PrimaryButton({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
    return (
        <button
            onClick={onClick}
            className={classNames(
                "inline-flex items-center justify-center rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-teal-600/30 hover:bg-teal-500 hover:shadow-teal-600/40 focus:outline-none focus:ring-4 focus:ring-teal-200 transition-all duration-200 hover:scale-105 active:scale-95",
                className
            )}
        >
            {children}
        </button>
    );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-slate-50"
        >
            {children}
        </button>
    );
}

function TinyLink({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="text-sm font-semibold text-slate-500 hover:text-teal-700 transition-colors relative group"
        >
            {children}
            <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-teal-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
        </button>
    );
}

function AccordionItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
    return (
        <div
            className={classNames("rounded-3xl border overflow-hidden cursor-pointer transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200", open ? "border-teal-200 bg-white shadow-sm" : "border-slate-200 bg-transparent")}
        >
            <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left outline-none">
                <span className={classNames("font-bold text-lg transition-colors", open ? "text-teal-800" : "text-slate-800")}>{q}</span>
                <span
                    className={classNames("grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-200", open ? "rotate-180" : "rotate-0")}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </button>
            {open && (
                <div className="px-6 pb-6 text-[15px] leading-relaxed text-slate-600 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                    {a}
                </div>
            )}
        </div>
    );
}

// --- CONSTANTS ---
// Moved to siteContent.service.ts defaults

// --- MAIN COMPONENT ---
export default function HureCoreLanding() {
    const navigate = useNavigate();
    const [toast, setToast] = useState({ open: false, title: "", body: "" });
    const [content, setContent] = useState(() => DEFAULT_LANDING_CONTENT);
    const [faqOpen, setFaqOpen] = useState(0);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    // Load content
    useEffect(() => {
        const loadContent = async () => {
            try {
                const data = await siteContentService.getLandingContent();
                if (data) setContent(data);
            } catch (err) {
                console.warn("Failed to load custom landing content:", err);
            }
        };
        loadContent();
    }, []);

    const navTo = (intent: string) => {
        if (intent === 'signin') { navigate('/login'); return; }
        if (intent === 'trial') { navigate('/signup'); return; }
        setToast({ open: true, title: "Redirecting...", body: "This feature is coming soon." });
    };

    const scrollToId = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900 overflow-x-hidden">

            {/* BACKGROUND BLOBS */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div
                    className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-teal-200/20 rounded-full blur-3xl opacity-60"
                />
                <div
                    className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-blue-200/20 rounded-full blur-3xl opacity-60"
                />
                <div
                    className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] bg-emerald-100/30 rounded-full blur-3xl opacity-60"
                />
            </div>

            {/* NAV */}
            <header
                className="sticky top-0 z-50 border-b border-white/50 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60"
            >
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
                    <MiniLogo />
                    <nav className="hidden items-center gap-8 md:flex">
                        <TinyLink onClick={() => scrollToId("about")}>About</TinyLink>
                        <TinyLink onClick={() => scrollToId("pricing")}>Pricing</TinyLink>
                        <TinyLink onClick={() => scrollToId("faqs")}>FAQs</TinyLink>
                    </nav>
                    <div className="flex items-center gap-3">
                        <button onClick={() => navTo("signin")} className="font-semibold text-sm text-slate-600 hover:text-slate-900 px-4 py-2 hover:bg-slate-100/50 rounded-xl transition-colors">Sign in</button>
                        <PrimaryButton onClick={() => navTo("trial")} className="!py-2.5 !px-5 !text-xs uppercase tracking-wide">Get Started</PrimaryButton>
                    </div>
                </div>
            </header>

            {/* HERO */}
            <SectionShell id="about" className="pt-32 lg:pt-40 pb-20">
                <div className="grid lg:grid-cols-[1.05fr,0.95fr] gap-12 items-center">
                    <div className="flex flex-col items-center text-center lg:items-start lg:text-left max-w-3xl mx-auto lg:mx-0">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-100 px-4 py-1.5 text-xs font-bold text-teal-700 shadow-sm">
                            <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                            Healthcare workforce management, done right
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-display font-extrabold tracking-tight text-slate-900 leading-[1.05]">
                            {val(content.heroHeadlinePrefix, DEFAULT_LANDING_CONTENT.heroHeadlinePrefix)} <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">
                                {val(content.heroHeadlineHighlight, DEFAULT_LANDING_CONTENT.heroHeadlineHighlight)}
                            </span>
                        </h1>

                        <p className="mt-8 text-lg lg:text-xl text-slate-600 max-w-2xl leading-relaxed">
                            {val(content.heroBody, DEFAULT_LANDING_CONTENT.heroBody)}
                        </p>

                        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <PrimaryButton onClick={() => navTo("trial")} className="w-full sm:w-auto text-base">Start 10-Day Free Trial</PrimaryButton>
                            <SecondaryButton onClick={() => scrollToId("pricing")}>View Pricing</SecondaryButton>
                        </div>

                        <p className="mt-6 text-sm font-medium text-slate-400">
                            {val(content.heroNote, DEFAULT_LANDING_CONTENT.heroNote)}
                        </p>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-100/70 via-white to-blue-50/80 blur-3xl -z-10" />
                        <div className="overflow-hidden rounded-[2rem] border border-white shadow-2xl shadow-slate-900/10 bg-white/60 backdrop-blur-sm">
                            <img src={heroImg} alt="Healthcare staff collaborating with HURE Core" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </SectionShell>

            {/* BENTO GRID FEATURES */}
            <SectionShell id="features" className="!py-12 lg:!py-16">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-4xl font-bold tracking-widest text-teal-600 uppercase mb-3">features</h2>
                    <h3 className="text-3xl lg:text-4xl font-display font-extrabold text-slate-900">Everything you need to run a modern workforce</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(content.features?.length ? content.features : DEFAULT_LANDING_CONTENT.features).map((f, i) => (
                        <div
                            key={i}
                            className={classNames(
                                "group relative overflow-hidden rounded-3xl border border-white bg-white/40 p-8 shadow-sm backdrop-blur-sm transition-all hover:bg-white/60 hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1",
                                f.colSpan
                            )}
                        >
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-gradient-to-br from-teal-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl" />

                            <div className="relative z-10">
                                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm text-teal-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <Icon name={f.icon} className="w-8 h-8" />
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 mb-3">{f.title}</h3>
                                <p className="text-lg text-slate-500 leading-relaxed">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionShell>

            {/* PRICING */}
            <SectionShell id="pricing" className="bg-slate-50/50">
                <div className="text-center max-w-4xl mx-auto mb-20 border-b border-slate-200 pb-12">
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 mb-6 font-display">
                        {content.pricingCtaLine1 || DEFAULT_LANDING_CONTENT.pricingCtaLine1}
                    </h2>
                    <p className="text-base text-slate-600 leading-relaxed">
                        {content.pricingCtaLine2 || DEFAULT_LANDING_CONTENT.pricingCtaLine2}
                    </p>
                </div>

                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl font-bold tracking-widest text-teal-600 uppercase mb-3">{content.pricingEyebrow || DEFAULT_LANDING_CONTENT.pricingEyebrow}</h2>
                    <h3 className="text-4xl lg:text-5xl font-display font-extrabold text-slate-900">{content.pricingTitle || DEFAULT_LANDING_CONTENT.pricingTitle}</h3>
                    <p className="mt-4 text-slate-600 text-sm">{content.pricingNote || DEFAULT_LANDING_CONTENT.pricingNote}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    {(content.plans?.length ? content.plans : DEFAULT_LANDING_CONTENT.plans).map((p, i) => (
                        <div
                            key={p.key}
                            className={classNames(
                                "relative flex flex-col p-8 rounded-[2rem] border transition-all duration-300 h-full",
                                p.featured
                                    ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/20 border-slate-800 scale-105 z-10 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300"
                                    : "bg-white text-slate-900 shadow-xl shadow-slate-200/50 border-white hover:-translate-y-2 hover:shadow-xl transition-all duration-300"
                            )}
                        >
                            {p.featured && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg tracking-wide uppercase">
                                    {p.badge || "Popular"}
                                </div>
                            )}

                            <div className="mb-8">
                                <h4 className={classNames("text-xl font-bold mb-2", p.featured ? "text-white" : "text-slate-900")}>{p.name}</h4>
                                <p className={classNames("text-sm font-medium", p.featured ? "text-slate-400" : "text-slate-500")}>{p.tagline}</p>
                            </div>

                            <div className="mb-8 flex items-baseline gap-1">
                                <span className="text-4xl font-extrabold tracking-tight"><KES value={p.price} /></span>
                                <span className={classNames("text-sm font-semibold", p.featured ? "text-slate-500" : "text-slate-400")}>{p.period}</span>
                            </div>

                            <ul className="mb-8 space-y-4 flex-1">
                                {p.limits.map((limit, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm">
                                        <div className={classNames("mt-0.5 rounded-full p-0.5", p.featured ? "bg-teal-500/20 text-teal-400" : "bg-teal-50 text-teal-600")}>
                                            <Icon name="check" className="w-3.5 h-3.5" />
                                        </div>
                                        <span className={classNames("font-medium", p.featured ? "text-slate-300" : "text-slate-600")}>{limit}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => navTo(p.cta.intent)}
                                className={classNames(
                                    "w-full py-4 rounded-xl font-bold text-sm transition-all duration-200",
                                    p.featured
                                        ? "bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/25"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                                )}
                            >
                                {p.cta.label}
                            </button>
                        </div>
                    ))}
                </div>
            </SectionShell >

            {/* FAQS */}
            < SectionShell id="faqs" >
                <div className="grid lg:grid-cols-12 gap-12 items-start">
                    <div className="lg:col-span-4">
                        <h2 className="text-2xl font-bold tracking-widest text-teal-600 uppercase mb-3">Support</h2>
                        <h3 className="text-4xl lg:text-5xl font-display font-extrabold text-slate-900 mb-4">Frequently Asked Questions</h3>
                        <p className="text-slate-600 mb-8">Can't find the answer you're looking for?</p>
                        <button 
                            onClick={() => setIsContactModalOpen(true)}
                            className="inline-block px-8 py-4 border-2 border-slate-300 text-slate-900 rounded-xl font-bold text-sm transition-all duration-200 hover:border-teal-600 hover:text-teal-600 hover:shadow-lg"
                        >
                            Contact Support
                        </button>
                    </div>

                    <div className="lg:col-span-8 space-y-4">
                        {(content.faqs?.length ? content.faqs : DEFAULT_LANDING_CONTENT.faqs).map((f, i) => (
                            <AccordionItem
                                key={i}
                                q={f.q}
                                a={f.a}
                                open={faqOpen === i}
                                onToggle={() => setFaqOpen(i === faqOpen ? -1 : i)}
                            />
                        ))}
                    </div>
                </div>
            </SectionShell >

            {/* FOOTER */}
            < footer className="bg-slate-950 py-16 text-white border-t border-slate-900" >
                <div className="mx-auto w-full max-w-7xl px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                        <div className="max-w-xs">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="grid place-items-center h-8 w-8 rounded-lg bg-teal-600 font-bold text-white">H</div>
                                <span className="font-bold text-lg">HURE <span className="text-teal-500">Core</span></span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">{content.footerBlurb}</p>
                        </div>

                        <div className="flex gap-16">
                            <div>
                                <h4 className="font-bold text-white mb-6">Product</h4>
                                <ul className="space-y-4 text-sm text-slate-400">
                                    <li><button onClick={() => scrollToId("features")} className="hover:text-teal-400 transition-colors">Features</button></li>
                                    <li><button onClick={() => scrollToId("pricing")} className="hover:text-teal-400 transition-colors">Pricing</button></li>
                                    <li><button onClick={() => scrollToId("faqs")} className="hover:text-teal-400 transition-colors">FAQ</button></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-6">Legal</h4>
                                <ul className="space-y-4 text-sm text-slate-400">
                                    <li><button onClick={() => navigate('/privacy-policy')} className="hover:text-teal-400 transition-colors">Privacy Policy</button></li>
                                    <li><button onClick={() => navigate('/terms-of-service')} className="hover:text-teal-400 transition-colors">Terms of Service</button></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                        <p>© {new Date().getFullYear()} HURE Core. All rights reserved.</p>
                        <p>Designed for Healthcare.</p>
                    </div>
                </div>
            </footer >

            {/* TOAST */}
            {
                toast.open && (
                    <div className="fixed bottom-8 left-1/2 z-50 w-full max-w-sm -translate-x-1/2">
                        <div className="mx-4 bg-slate-900/90 text-white backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-white/10">
                            <div>
                                <div className="font-bold text-sm tracking-wide">{toast.title}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{toast.body}</div>
                            </div>
                            <button
                                onClick={() => setToast({ ...toast, open: false })}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <Icon name="check" className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )
            }

            <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
        </div >
    );
}
