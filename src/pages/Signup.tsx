import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PLANS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { docs, setDoc, serverTimestamp, collections, addDoc } from '../lib/firestore';
import { emailService } from '../lib/services/email.service';
import { SystemRole, SubscriptionPlan, PLAN_LIMITS } from '../types';

interface SignupFormData {
  // Step 1: Organization Info
  orgName: string;
  orgEmail: string;
  orgPhone: string;
  orgAddress: string;
  orgCity: string;

  // Step 2: Owner Info
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Step 3: Plan Selection
  plan: SubscriptionPlan;

  // Step 4: Location
  locationName: string;
  locationCity: string;
  locationAddress: string;
  locationPhone: string;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  const [formData, setFormData] = useState<SignupFormData>({
    orgName: '',
    orgEmail: '',
    orgPhone: '',
    orgAddress: '',
    orgCity: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    plan: 'Professional',
    locationName: '',
    locationCity: '',
    locationAddress: '',
    locationPhone: ''
  });

  const updateFormData = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (): boolean => {
    setError('');

    if (step === 1) {
      if (!formData.orgName.trim()) {
        setError('Organization name is required');
        return false;
      }
      if (!formData.orgEmail.trim() || !/\S+@\S+\.\S+/.test(formData.orgEmail)) {
        setError('Valid organization email is required');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('First and last name are required');
        return false;
      }
      if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Valid email is required');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    if (step === 4) {
      if (!formData.locationName.trim()) {
        setError('Location name is required');
        return false;
      }
    }

    return true;
  };

  const handleSendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await emailService.sendOTP(formData.email, formData.firstName);
      if (!result.success) {
        setError(result.error || 'Failed to send verification code.');
        return false;
      }
      return true;
    } catch (err: any) {
      setError('Failed to send verification code. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await emailService.verifyOTP(formData.email, otp);
      if (result.success && result.verified) {
        setIsEmailVerified(true);
        setIsVerifying(false); // Validated, exit verifying mode
        setStep(3); // Proceed to next step
      } else {
        setError(result.error || 'Invalid verification code');
      }
    } catch (err: any) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (validateStep()) {
      // Intercept Step 2 -> 3 for Verification
      if (step === 2 && !isEmailVerified) {
        const sent = await handleSendOTP();
        if (sent) {
          setIsVerifying(true);
        }
        return;
      }

      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (isVerifying) {
      setIsVerifying(false);
      setError('');
      return;
    }
    setStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError('');

    try {
      // Step 1: Create Firebase Auth user
      const firebaseUser = await signup(formData.email, formData.password);
      const userId = firebaseUser.uid;

      // Step 2: Create organization document
      const orgId = userId + '_org'; // Use deterministic ID for simplicity

      const selectedPlan = PLANS.find(p => p.id === formData.plan) || PLANS[1]; // Default to Professional
      const planLimits = PLAN_LIMITS[selectedPlan.id as SubscriptionPlan] || PLAN_LIMITS['Professional'];

      await setDoc(docs.organization(orgId), {
        name: formData.orgName,
        email: formData.orgEmail,
        phone: formData.orgPhone || null,
        address: formData.orgAddress || null,
        city: formData.orgCity || null,
        country: 'Kenya',
        orgStatus: 'Pending',
        accountStatus: 'Under Review',
        plan: formData.plan,
        maxLocations: planLimits.maxLocations,
        maxStaff: planLimits.maxStaff,
        maxAdmins: planLimits.maxAdmins,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Step 3: Create user profile
      await setDoc(docs.user(userId), {
        id: userId,
        email: formData.email,
        fullName: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationId: orgId,
        systemRole: 'OWNER' as SystemRole,
        jobTitle: 'Owner',
        employmentType: 'Full-Time',
        staffStatus: 'Active',
        monthlySalaryCents: 0,
        hourlyRateCents: 0,
        payMethod: 'Fixed',
        isSuperAdmin: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Step 4: Create primary location
      await addDoc(collections.locations(orgId), {
        name: formData.locationName,
        city: formData.locationCity || null,
        address: formData.locationAddress || null,
        phone: formData.locationPhone || null,
        isPrimary: true,
        status: 'Pending',
        organizationId: orgId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Step 5: Create subscription
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 day trial

      await addDoc(collections.subscriptions(orgId), {
        organizationId: orgId,
        plan: formData.plan,
        status: 'Trial',
        amountCents: planLimits.amountCents,
        currency: 'KES',
        billingCycle: 'monthly',
        trialEndsAt: trialEndsAt.toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Step 6: Send welcome email
      try {
        await emailService.sendWelcomeEmail(
          formData.email,
          formData.firstName,
          formData.orgName
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Non-blocking - continue with signup
      }

      // Step 7: Navigate to dashboard
      navigate('/employer');

    } catch (err: any) {
      console.error('Signup error:', err);

      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/configuration-not-found') {
        setError('Sign-up is currently disabled. Please contact support (Email/Password provider not enabled).');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((s) => (
        <React.Fragment key={s}>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${s < step
              ? 'bg-green-500 text-white'
              : s === step
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-500'
              }`}
          >
            {s < step ? '✓' : s}
          </div>
          {s < 4 && (
            <div
              className={`w-12 h-1 mx-1 rounded ${s < step ? 'bg-green-500' : 'bg-slate-200'
                }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderVerificationStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Verify Your Email</h2>
        <p className="text-slate-500 mt-1">We sent a 6-digit code to <strong>{formData.email}</strong></p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Verification Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
          placeholder="000000"
        />
      </div>

      <div className="text-center">
        <button
          onClick={handleSendOTP}
          disabled={loading}
          className="text-blue-600 text-sm hover:text-blue-800 font-semibold"
        >
          Resend Code
        </button>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Organization Details</h2>
        <p className="text-slate-500 mt-1">Tell us about your healthcare organization</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Organization Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.orgName}
          onChange={(e) => updateFormData('orgName', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Nairobi Medical Centre"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Organization Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.orgEmail}
          onChange={(e) => updateFormData('orgEmail', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="info@yourorganization.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.orgPhone}
            onChange={(e) => updateFormData('orgPhone', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+254..."
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
          <input
            type="text"
            value={formData.orgCity}
            onChange={(e) => updateFormData('orgCity', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nairobi"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
        <input
          type="text"
          value={formData.orgAddress}
          onChange={(e) => updateFormData('orgAddress', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Street address"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Your Account</h2>
        <p className="text-slate-500 mt-1">You'll be the organization owner</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => updateFormData('firstName', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => updateFormData('lastName', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => updateFormData('password', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Minimum 6 characters"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => updateFormData('confirmPassword', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Confirm your password"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Choose Your Plan</h2>
        <p className="text-slate-500 mt-1">Start with a 14-day free trial</p>
      </div>

      <div className="space-y-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            onClick={() => updateFormData('plan', plan.id as SubscriptionPlan)}
            className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.plan === plan.id
              ? 'border-blue-600 bg-blue-50'
              : 'border-slate-200 hover:border-slate-300'
              }`}
          >
            {plan.id === 'Professional' && (
              <span className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                RECOMMENDED
              </span>
            )}

            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Up to {plan.maxStaff} staff • {plan.maxLocations} location{plan.maxLocations > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-900">
                  KES {(plan.priceKES / 100).toLocaleString()}
                </div>
                <div className="text-slate-500 text-sm">/month</div>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {plan.features.slice(0, 3).map((feature, i) => (
                <li key={i} className="flex items-center text-sm text-slate-600">
                  <span className="text-green-500 mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {formData.plan === plan.id && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Primary Location</h2>
        <p className="text-slate-500 mt-1">Add your first facility/clinic location</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Location Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.locationName}
          onChange={(e) => updateFormData('locationName', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Main Branch, Westlands Clinic"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
          <input
            type="text"
            value={formData.locationCity}
            onChange={(e) => updateFormData('locationCity', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nairobi"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.locationPhone}
            onChange={(e) => updateFormData('locationPhone', e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="+254..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
        <input
          type="text"
          value={formData.locationAddress}
          onChange={(e) => updateFormData('locationAddress', e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Street address"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> You can add more locations from your dashboard after completing signup.
          Facility licenses will need to be verified by our team.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">H</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Create Your Account</h1>
          </div>

          {!isVerifying && renderStepIndicator()}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          {!isVerifying && (
            <>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
            </>
          )}

          {isVerifying && renderVerificationStep()}

          <div className="flex justify-between mt-8">
            {step > 1 || isVerifying ? (
              <button
                onClick={handleBack}
                className="px-6 py-3 text-slate-600 font-semibold hover:text-slate-800"
              >
                ← Back
              </button>
            ) : (
              <Link to="/login" className="px-6 py-3 text-slate-600 font-semibold hover:text-slate-800">
                ← Back to Login
              </Link>
            )}

            {isVerifying ? (
              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-mono"
              >
                {loading ? 'Verifying...' : 'Verify Code →'}
              </button>
            ) : step < 4 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                {step === 2 ? 'Verify Email →' : 'Continue →'}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Complete Signup ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
