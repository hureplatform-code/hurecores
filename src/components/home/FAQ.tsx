import React, { useState } from 'react';
import ContactModal from '../common/ContactModal';

const FAQ: React.FC = () => {
    const faqs = [
        {
            question: "How long does it take to get set up?",
            answer: "You can be up and running in minutes. Our onboarding process is automated. Just sign up, add your organization details, invite your staff, and you're ready to schedule your first shift."
        },
        {
            question: "Can I manage multiple clinic locations?",
            answer: "Absolutely. HURE Core is built for multi-tenant management. You can easily switch between locations or view aggregated data from your main dashboard, depending on your plan."
        },
        {
            question: "Is there a mobile app for staff?",
            answer: "Yes, our platform is fully responsive and works perfectly on all mobile devices. Staff can check schedules, clock in/out, and request leave directly from their phones without installing a separate app."
        },
        {
            question: "How does the free trial work?",
            answer: "You get full access to your selected plan for 10 days. No credit card is required to start. At the end of the trial, you can choose a plan that suits you or downgrade to a limited free version."
        },
        {
            question: "Is my data secure?",
            answer: "Security is our top priority. We use bank-grade encryption for all data transmission and storage. We are fully compliant with local data protection regulations."
        }
    ];

    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section id="resources" className="py-24 bg-slate-50">
            <div className="max-w-3xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-blue-600 font-bold tracking-widest uppercase text-2xl mb-3">Support</h2>
                    <h3 className="text-3xl md:text-5xl font-bold text-slate-900 font-display mb-6">Frequently Asked Questions</h3>
                    <p className="text-xl text-slate-500 leading-relaxed">
                        Have questions? We're here to help.
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`bg-white rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${openIndex === index ? 'border-blue-600 shadow-md ring-4 ring-blue-50' : 'border-slate-200 hover:border-blue-300 hover:shadow-lg'}`}
                        >
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                            >
                                <span className={`text-lg font-bold ${openIndex === index ? 'text-blue-600' : 'text-slate-900'}`}>{faq.question}</span>
                                <span className={`transform transition-transform duration-300 ${openIndex === index ? 'rotate-180 text-blue-600' : 'text-slate-400'}`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </span>
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="p-6 pt-0 text-slate-600 leading-relaxed border-t border-dashed border-slate-100 mt-2">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <p className="text-slate-600 mb-6">Can't find the answer you're looking for?</p>
                    <button
                        onClick={() => setIsContactModalOpen(true)}
                        className="inline-block px-8 py-4 border-2 border-slate-300 text-slate-900 rounded-xl font-bold text-sm transition-all duration-200 hover:border-blue-600 hover:text-blue-600 hover:shadow-lg"
                    >
                        Contact Support
                    </button>
                </div>
            </div>

            <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
        </section>
    );
};

export default FAQ;
