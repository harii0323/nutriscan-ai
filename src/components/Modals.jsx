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
            background: 'rgba(44,62,80,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1.5rem',
              padding: '2rem',
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 24px 80px rgba(44,62,80,0.25)',
              position: 'relative',
            }}
          >
            {/* Close */}
            <button
              onClick={handleClose}
              aria-label="Close dialog"
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: '#f0ece8', border: 'none', borderRadius: '50%',
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#576574',
              }}
            >
              <X size={16} />
            </button>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Leaf size={22} color="#4C5F4E" />
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#4C5F4E' }}>NutriScan AI</span>
            </div>

            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', color: '#2C3E50' }}>
              {mode === 'login' ? 'Welcome back' :
               mode === 'signup' ? 'Create account' :
               mode === 'forgot' ? 'Reset password' : 'Phone sign-in'}
            </h2>
            <p style={{ margin: '0 0 1.5rem', color: '#576574', fontSize: '0.88rem' }}>
              {mode === 'login' ? 'Sign in to access your scans and saved products.' :
               mode === 'signup' ? 'Join NutriScan AI to save and track your analyses.' :
               mode === 'forgot' ? "Enter your email address and we'll send you a password reset link." :
               'Sign in securely with your phone number.'}
            </p>

            {/* Success message */}
            {resetSent && (
              <div style={{
                background: 'rgba(39,174,96,0.1)', border: '1px solid rgba(39,174,96,0.3)',
                borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem',
                color: '#27AE60', fontSize: '0.85rem',
              }}>
                Password reset link sent! Please check your email inbox.
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)',
                borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem',
                color: '#E74C3C', fontSize: '0.85rem',
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
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#576574', padding: 0, display: 'flex' }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />

                {mode === 'login' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4C5F4E', fontSize: '0.8rem', fontWeight: 500 }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <motion.button
                  type="submit"
                  className="btn-primary"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.25rem' }}
                >
                  {loading ? <Spinner size={18} color="white" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </motion.button>
              </form>
            )}

            {/* Forgot Password form */}
            {mode === 'forgot' && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <InputField icon={<Mail size={16} />} type="email" placeholder="Enter your registered email" value={email}
                  onChange={e => setEmail(e.target.value)} required />
                <motion.button
                  type="submit"
                  className="btn-primary"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', marginTop: '0.25rem' }}
                >
                  {loading ? <Spinner size={18} color="white" /> : 'Send Reset Link'}
                </motion.button>
              </form>
            )}

            {/* Phone form */}
            {mode === 'phone' && step === 'input' && (
              <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <InputField icon={<Phone size={16} />} type="tel" placeholder="+91 98765 43210"
                  value={phone} onChange={e => setPhone(e.target.value)} required />
                <div id="recaptcha-container" ref={recaptchaContainerRef} />
                <motion.button type="submit" className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
                  {loading ? <Spinner size={18} color="white" /> : 'Send OTP'}
                </motion.button>
              </form>
            )}

            {mode === 'phone' && step === 'otp' && (
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#576574' }}>
                  OTP sent to <strong>{phone}</strong>
                </p>
                <InputField icon={<Phone size={16} />} type="text" placeholder="Enter 6-digit OTP"
                  value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />
                <motion.button type="submit" className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
                  {loading ? <Spinner size={18} color="white" /> : 'Verify OTP'}
                </motion.button>
                <button type="button" onClick={() => { setStep('input'); setOtp(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4C5F4E', fontSize: '0.85rem' }}>
                  Change number
                </button>
              </form>
            )}

            {/* Divider */}
            {mode !== 'phone' && mode !== 'forgot' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#e8e4e0' }} />
                  <span style={{ fontSize: '0.8rem', color: '#576574' }}>or continue with</span>
                  <div style={{ flex: 1, height: 1, background: '#e8e4e0' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {/* Google */}
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGoogle}
                    disabled={loading}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: 'white', border: '1.5px solid #e8e4e0', borderRadius: '0.75rem',
                      padding: '0.7rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#2C3E50',
                    }}>
                    <GoogleIcon /> Google
                  </motion.button>
                  {/* Phone */}
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => switchMode('phone')}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      background: 'white', border: '1.5px solid #e8e4e0', borderRadius: '0.75rem',
                      padding: '0.7rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#2C3E50',
                    }}>
                    <Phone size={16} /> Phone
                  </motion.button>
                </div>
              </>
            )}

            {/* Switch mode */}
            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#576574' }}>
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => switchMode('signup')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4C5F4E', fontWeight: 600 }}>Sign up</button>
                </>
              ) : mode === 'signup' ? (
                <>Already have an account?{' '}
                  <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4C5F4E', fontWeight: 600 }}>Sign in</button>
                </>
              ) : mode === 'forgot' ? (
                <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4C5F4E', fontWeight: 600 }}>
                  Back to sign in
                </button>
              ) : (
                <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4C5F4E', fontWeight: 600 }}>
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
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      background: '#FAF8F5', border: '1.5px solid #e8e4e0', borderRadius: '0.75rem',
      padding: '0.7rem 1rem', transition: 'border-color 0.2s',
    }}
      onFocus={e => e.currentTarget.style.borderColor = '#4C5F4E'}
      onBlur={e => e.currentTarget.style.borderColor = '#e8e4e0'}
    >
      <span style={{ color: '#576574', flexShrink: 0 }}>{icon}</span>
      <input {...props} style={{
        flex: 1, border: 'none', background: 'transparent', outline: 'none',
        color: '#2C3E50', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif',
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
