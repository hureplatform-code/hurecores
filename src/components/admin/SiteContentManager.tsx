import React, { useState, useEffect } from 'react';
import { siteContentService, DEFAULT_LANDING_CONTENT, LandingPageContent } from '../../lib/services/siteContent.service';
import { motion, AnimatePresence } from 'framer-motion';
import { storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function SiteContentManager() {
    const [content, setContent] = useState<LandingPageContent>(DEFAULT_LANDING_CONTENT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [activeTab, setActiveTab] = useState<'general' | 'features' | 'plans' | 'faqs' | 'images'>('general');

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        setLoading(true);
        const data = await siteContentService.getLandingContent();
        // Ensure arrays exist (merge defaults if missing from fetched data)
        const merged = {
            ...DEFAULT_LANDING_CONTENT,
            ...data,
            plans: data.plans || DEFAULT_LANDING_CONTENT.plans,
            faqs: data.faqs || DEFAULT_LANDING_CONTENT.faqs,
            features: data.features || DEFAULT_LANDING_CONTENT.features
        };
        setContent(merged);
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await siteContentService.updateLandingContent(content);
            showToast('Content updated successfully!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update content.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset EVERYTHING to default content? This cannot be undone.')) {
            setContent(DEFAULT_LANDING_CONTENT);
            handleSave(); // Auto save reset
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ ...toast, show: false }), 3000);
    };

    // --- Array Helpers ---
    const updateFeature = (index: number, field: string, value: string) => {
        const newFeatures = [...content.features];
        newFeatures[index] = { ...newFeatures[index], [field]: value };
        setContent({ ...content, features: newFeatures });
    };

    const updatePlan = (index: number, field: string, value: any) => {
        const newPlans = [...content.plans];
        newPlans[index] = { ...newPlans[index], [field]: value };
        setContent({ ...content, plans: newPlans });
    };

    const updateFaq = (index: number, field: 'q' | 'a', value: string) => {
        const newFaqs = [...content.faqs];
        newFaqs[index] = { ...newFaqs[index], [field]: value };
        setContent({ ...content, faqs: newFaqs });
    };

    const addFaq = () => {
        setContent({ ...content, faqs: [...content.faqs, { q: 'New Question?', a: 'Answer here.' }] });
    };

    const removeFaq = (index: number) => {
        const newFaqs = content.faqs.filter((_, i) => i !== index);
        setContent({ ...content, faqs: newFaqs });
    };

    // Handle image upload
    const handleImageUpload = async (file: File, type: 'heroImage' | 'logo') => {
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        setUploading(true);
        try {
            // Create storage reference with timestamp to avoid caching issues
            const timestamp = Date.now();
            const fileName = `${type}_${timestamp}_${file.name}`;
            const storageRef = ref(storage, `site-content/${fileName}`);
            
            // Upload file
            await uploadBytes(storageRef, file);
            
            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);
            
            // Update content based on type
            if (type === 'heroImage') {
                setContent({ ...content, heroImageUrl: downloadURL });
            } else if (type === 'logo') {
                setContent({ ...content, logoUrl: downloadURL });
            }
            
            showToast(`${type === 'heroImage' ? 'Hero image' : 'Logo'} uploaded successfully!`, 'success');
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Failed to upload image. Please try again.', 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading content editor...</div>;
    }

    const tabs = [
        { id: 'general', label: 'General Text' },
        { id: 'images', label: 'Images & Logo' },
        { id: 'features', label: 'Features Grid' },
        { id: 'plans', label: 'Pricing Plans' },
        { id: 'faqs', label: 'FAQs' },
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Site Content Editor</h3>
                    <p className="text-sm text-slate-500">Customize the public landing page.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl"
                    >
                        Reset Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center gap-2 disabled:opacity-70 shadow-sm shadow-teal-600/20"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-[120px] py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">

                {/* GENERAL TAB */}
                {activeTab === 'general' && (
                    <div className="p-8 grid gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Hero Section</h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Field label="Headline Prefix" value={content.heroHeadlinePrefix} onChange={v => setContent({ ...content, heroHeadlinePrefix: v })} />
                                <Field label="Headline Highlight" value={content.heroHeadlineHighlight} onChange={v => setContent({ ...content, heroHeadlineHighlight: v })} />
                                <div className="md:col-span-2">
                                    <Field label="Hero Body Text" value={content.heroBody} onChange={v => setContent({ ...content, heroBody: v })} textarea rows={3} />
                                </div>
                                <div className="md:col-span-2">
                                    <Field label="Hero Note (Small text under buttons)" value={content.heroNote} onChange={v => setContent({ ...content, heroNote: v })} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Pricing Header</h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Field label="Eyebrow (Small Label)" value={content.pricingEyebrow} onChange={v => setContent({ ...content, pricingEyebrow: v })} />
                                <Field label="Title" value={content.pricingTitle} onChange={v => setContent({ ...content, pricingTitle: v })} />
                                <Field label="CTA Line 1" value={content.pricingCtaLine1} onChange={v => setContent({ ...content, pricingCtaLine1: v })} />
                                <Field label="CTA Line 2" value={content.pricingCtaLine2} onChange={v => setContent({ ...content, pricingCtaLine2: v })} />
                                <div className="md:col-span-2">
                                    <Field label="Pricing Note" value={content.pricingNote} onChange={v => setContent({ ...content, pricingNote: v })} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Other</h4>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Field label="Contact Title" value={content.contactTitle} onChange={v => setContent({ ...content, contactTitle: v })} />
                                <Field label="Contact Body" value={content.contactBody} onChange={v => setContent({ ...content, contactBody: v })} />
                                <div className="md:col-span-2">
                                    <Field label="Footer Blurb" value={content.footerBlurb} onChange={v => setContent({ ...content, footerBlurb: v })} textarea />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* IMAGES TAB */}
                {activeTab === 'images' && (
                    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm mb-6">
                            <strong>Note:</strong> Upload images for your website. Recommended sizes: Hero image (1200x600px), Logo (300x100px). Supported formats: JPG, PNG, WebP.
                        </div>

                        {/* Hero Image Upload */}
                        <div className="border border-slate-200 rounded-xl p-6 bg-white">
                            <h4 className="text-lg font-bold text-slate-900 mb-4">Hero Image</h4>
                            <p className="text-sm text-slate-500 mb-4">This is the main image displayed in the hero section of your landing page.</p>
                            
                            {content.heroImageUrl && (
                                <div className="mb-4">
                                    <img 
                                        src={content.heroImageUrl} 
                                        alt="Hero" 
                                        className="w-full max-w-2xl h-48 object-cover rounded-lg border border-slate-200"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">Current hero image</p>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(file, 'heroImage');
                                        }}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                    <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {uploading ? 'Uploading...' : 'Upload Hero Image'}
                                    </span>
                                </label>
                                {content.heroImageUrl && (
                                    <button
                                        onClick={() => setContent({ ...content, heroImageUrl: undefined })}
                                        className="px-4 py-2.5 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-colors"
                                    >
                                        Remove Image
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Logo Upload */}
                        <div className="border border-slate-200 rounded-xl p-6 bg-white">
                            <h4 className="text-lg font-bold text-slate-900 mb-4">Site Logo</h4>
                            <p className="text-sm text-slate-500 mb-4">Your company logo displayed in the navigation bar and footer.</p>
                            
                            {content.logoUrl && (
                                <div className="mb-4">
                                    <img 
                                        src={content.logoUrl} 
                                        alt="Logo" 
                                        className="h-16 object-contain bg-slate-50 p-4 rounded-lg border border-slate-200"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">Current logo</p>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload(file, 'logo');
                                        }}
                                        className="hidden"
                                        disabled={uploading}
                                    />
                                    <span className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {uploading ? 'Uploading...' : 'Upload Logo'}
                                    </span>
                                </label>
                                {content.logoUrl && (
                                    <button
                                        onClick={() => setContent({ ...content, logoUrl: undefined })}
                                        className="px-4 py-2.5 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-colors"
                                    >
                                        Remove Logo
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl text-sm">
                            <strong>Remember:</strong> After uploading images, click the "Save Changes" button at the top to apply them to your website.
                        </div>
                    </div>
                )}

                {/* FEATURES TAB */}
                {activeTab === 'features' && (
                    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="text-sm text-slate-500 mb-4 bg-blue-50 text-blue-700 p-4 rounded-xl">
                            The layout supports 6 features in a Bento Grid. Icons use Lucide names (e.g., 'users', 'calendar', 'clock').
                        </div>
                        <div className="grid gap-6">
                            {content.features.map((feature, idx) => (
                                <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-400">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 grid md:grid-cols-2 gap-4">
                                            <Field label="Title" value={feature.title} onChange={v => updateFeature(idx, 'title', v)} />
                                            <Field label="Icon Name" value={feature.icon} onChange={v => updateFeature(idx, 'icon', v)} />
                                            <div className="md:col-span-2">
                                                <Field label="Description" value={feature.desc} onChange={v => updateFeature(idx, 'desc', v)} textarea />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* PLANS TAB */}
                {activeTab === 'plans' && (
                    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid gap-8">
                            {content.plans.map((plan, idx) => (
                                <div key={plan.key} className="border border-slate-200 rounded-xl p-6 relative overflow-hidden">
                                    {plan.featured && <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-bl-xl">Featured</div>}
                                    <h4 className="text-lg font-bold text-slate-900 mb-4">{plan.name} Plan</h4>

                                    <div className="grid md:grid-cols-3 gap-6">
                                        <Field label="Name" value={plan.name} onChange={v => updatePlan(idx, 'name', v)} />
                                        <Field label="Price" value={plan.price.toString()} onChange={v => updatePlan(idx, 'price', Number(v))} type="number" />
                                        <Field label="Tagline" value={plan.tagline} onChange={v => updatePlan(idx, 'tagline', v)} />

                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Features (Comma separated)</label>
                                            <textarea
                                                value={plan.limits.join('\n')}
                                                onChange={e => updatePlan(idx, 'limits', e.target.value.split('\n'))}
                                                rows={4}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 transition-all font-mono"
                                                placeholder="One feature per line..."
                                            />
                                            <p className="text-xs text-slate-400 mt-1">Put each feature limit on a new line.</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FAQS TAB */}
                {activeTab === 'faqs' && (
                    <div className="p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid gap-4">
                            {content.faqs.map((faq, idx) => (
                                <div key={idx} className="flex gap-4 items-start group">
                                    <div className="flex-1 border border-slate-200 rounded-xl p-5 bg-white shadow-sm transition-all hover:border-teal-200">
                                        <Field label="Question" value={faq.q} onChange={v => updateFaq(idx, 'q', v)} className="mb-4 font-semibold" />
                                        <Field label="Answer" value={faq.a} onChange={v => updateFaq(idx, 'a', v)} textarea />
                                    </div>
                                    <button
                                        onClick={() => removeFaq(idx)}
                                        className="mt-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete FAQ"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addFaq}
                            className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 font-semibold hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add New FAQ
                        </button>
                    </div>
                )}
            </div>

            {toast.show && (
                <div className={`fixed bottom-5 right-5 px-6 py-3 rounded-xl shadow-lg text-white font-medium z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    textarea = false,
    rows = 2,
    type = "text",
    className = ""
}: {
    label: string,
    value: string,
    onChange: (v: string) => void,
    textarea?: boolean,
    rows?: number,
    type?: string,
    className?: string
}) {
    return (
        <div className={className}>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">{label}</label>
            {textarea ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-300"
                    rows={rows}
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-300"
                />
            )}
        </div>
    );
}
