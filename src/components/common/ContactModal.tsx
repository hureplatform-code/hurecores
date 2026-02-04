import React, { useState } from 'react';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Create mailto link with form data
        const mailtoLink = `mailto:info@gethure.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
            `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
        )}`;
        
        // Open default email client
        window.location.href = mailtoLink;
        
        setSubmitted(true);
        
        // Reset form after 2 seconds
        setTimeout(() => {
            setName('');
            setEmail('');
            setSubject('');
            setMessage('');
            setSubmitted(false);
            onClose();
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Contact Support</h2>
                            <p className="text-slate-600">We'll get back to you as soon as possible</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {submitted ? (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Opening your email client...</h3>
                            <p className="text-slate-600">Your default email app should open with a pre-filled message</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-2">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Your full name"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="your@email.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-bold text-slate-900 mb-2">
                                    Subject *
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    required
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="How can we help?"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-bold text-slate-900 mb-2">
                                    Message *
                                </label>
                                <textarea
                                    id="message"
                                    required
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                    placeholder="Tell us more about your question..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                                >
                                    Send Message
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactModal;
