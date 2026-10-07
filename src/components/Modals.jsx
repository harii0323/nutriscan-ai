// Auth modals: Login, Signup, Phone OTP
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Phone, Eye, EyeOff, Leaf } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig.js';
import { Spinner } from './Shared.jsx';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // login | signup | phone | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [step, setStep] = useState('input'); // input | otp
  const confirmRef = useRef(null);
  const recaptchaContainerRef = useRef(null);

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setResetSent(false);
    setStep('input');
  };

  const handleClose = () => {
    setError('');
    setResetSent(false);
    setStep('input');
    onClose();
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setResetSent(false);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const clearRecaptcha = () => {
    if (confirmRef.current) {
      confirmRef.current = null;
    }
    const el = document.getElementById('recaptcha-container');
    if (el) el.innerHTML = '';
  };

  const handleEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(cred.user, { displayName });
      }
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      clearRecaptcha();
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      confirmRef.current = result;
      setStep('otp');
    } catch (err) {
      setError(friendlyError(err.code) || 'Failed to send OTP. Check phone number.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmRef.current.confirm(otp);
      onClose();
    } catch {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  function friendlyError(code) {
    const map = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'Email is already registered.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
      'auth/invalid-phone-number': 'Invalid phone number format. Use +country code.',
      'auth/too-many-requests': 'Too many attempts. Try again later.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '1.25rem',
              padding: '2.25rem',
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 24px 64px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)',
              position: 'relative',
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              aria-label="Close dialog"
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                background: '#F1F5F9', border: 'none', borderRadius: '50%',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#64748B', transition: 'background-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B'; }}
            >
              <X size={16} />
            </button>

            {/* Brand Capsule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #0E3B2E 0%, #166534 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Leaf size={15} color="white" />
              </div>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#0E3B2E' }}>
                NutriScan AI
              </span>
            </div>

            <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.5rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
              {mode === 'login' ? 'Welcome back' :
               mode === 'signup' ? 'Create account' :
               mode === 'forgot' ? 'Reset password' : 'Phone sign-in'}
            </h2>
            <p style={{ margin: '0 0 1.5rem', color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.55 }}>
              {mode === 'login' ? 'Sign in to access your scans and saved products.' :
               mode === 'signup' ? 'Join NutriScan AI to save and track your analyses.' :
               mode === 'forgot' ? "Enter your email address and we'll send you a password reset link." :
               'Sign in securely with your phone number.'}
            </p>

            {/* Success message */}
            {resetSent && (
              <div style={{
                background: '#ECFDF5', border: '1px solid #A7F3D0',
                borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem',
                color: '#065F46', fontSize: '0.86rem', fontWeight: 500,
              }}>
                Password reset link sent! Please check your email inbox.
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem',
                color: '#B91C1C', fontSize: '0.86rem',
              }}>
                {error}
              </div>
            )}

            {/* Email/Password form */}
            {(mode === 'login' || mode === 'signup') && (
              <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {mode === 'signup' && (
                  <InputField icon={<Mail size={16} />} type="text" placeholder="Display name" value={displayName}
                    onChange={e => setDisplayName(e.target.value)} />
                )}
                <InputField icon={<Mail size={16} />} type="email" placeholder="Email address" value={email}
                  onChange={e => setEmail(e.target.value)} required />
                <InputField
                  icon={<Lock size={16} />}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0, display: 'flex' }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                {mode === 'login' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.2rem' }}>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0E3B2E', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.35rem', fontSize: '0.94rem' }}
                >
                  {loading ? <Spinner size={18} color="white" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </button>
              </form>
            )}

            {/* Forgot Password form */}
            {mode === 'forgot' && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <InputField icon={<Mail size={16} />} type="email" placeholder="Enter your registered email" value={email}
                  onChange={e => setEmail(e.target.value)} required />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.35rem', fontSize: '0.94rem' }}
                >
                  {loading ? <Spinner size={18} color="white" /> : 'Send Reset Link'}
                </button>
              </form>
            )}

            {/* Phone form */}
            {mode === 'phone' && step === 'input' && (
              <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <InputField icon={<Phone size={16} />} type="tel" placeholder="+91 98765 43210"
                  value={phone} onChange={e => setPhone(e.target.value)} required />
                <div id="recaptcha-container" ref={recaptchaContainerRef} />
                <button type="submit" className="btn-primary"
                  disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.35rem' }}>
                  {loading ? <Spinner size={18} color="white" /> : 'Send OTP'}
                </button>
              </form>
            )}

            {mode === 'phone' && step === 'otp' && (
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#4B5563' }}>
                  OTP sent to <strong>{phone}</strong>
                </p>
                <InputField icon={<Phone size={16} />} type="text" placeholder="Enter 6-digit OTP"
                  value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />
                <button type="submit" className="btn-primary"
                  disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
                  {loading ? <Spinner size={18} color="white" /> : 'Verify OTP'}
                </button>
                <button type="button" onClick={() => { setStep('input'); setOtp(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0E3B2E', fontSize: '0.85rem', fontWeight: 600 }}>
                  Change number
                </button>
              </form>
            )}

            {/* Divider */}
            {mode !== 'phone' && mode !== 'forgot' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                  <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    or continue with
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {/* Google */}
                  <button onClick={handleGoogle}
                    disabled={loading}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '0.75rem',
                      padding: '0.7rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem', color: '#0F172A',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
                  >
                    <GoogleIcon /> Google
                  </button>
                  {/* Phone */}
                  <button onClick={() => switchMode('phone')}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '0.75rem',
                      padding: '0.7rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.86rem', color: '#0F172A',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)', transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
                  >
                    <Phone size={16} color="#0E3B2E" /> Phone
                  </button>
                </div>
              </>
            )}

            {/* Switch Mode Footer */}
            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.86rem', color: '#4B5563' }}>
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => switchMode('signup')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0E3B2E', fontWeight: 700 }}>Sign up</button>
                </>
              ) : mode === 'signup' ? (
                <>Already have an account?{' '}
                  <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0E3B2E', fontWeight: 700 }}>Sign in</button>
                </>
              ) : mode === 'forgot' ? (
                <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0E3B2E', fontWeight: 700 }}>
                  Back to sign in
                </button>
              ) : (
                <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0E3B2E', fontWeight: 700 }}>
                  Use email instead
                </button>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper components
function InputField({ icon, suffix, ...props }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.65rem',
      background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '0.75rem',
      padding: '0.7rem 1rem', transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
      onFocus={e => {
        e.currentTarget.style.borderColor = '#0E3B2E';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 59, 46, 0.1)';
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = '#CBD5E1';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span style={{ color: '#64748B', flexShrink: 0 }}>{icon}</span>
      <input {...props} style={{
        flex: 1, border: 'none', background: 'transparent', outline: 'none',
        color: '#0F172A', fontSize: '0.92rem', fontFamily: 'Inter, sans-serif',
      }} />
      {suffix}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
