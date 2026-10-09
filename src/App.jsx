import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Leaf, Package, BarChart2, MessageCircle, User,
  LogIn, ChevronDown, LogOut, ShieldCheck
} from 'lucide-react';

import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import AuthModal from './components/Modals.jsx';
import HomePage from './components/HomePage.jsx';
import CookieConsentBanner from './components/CookieConsentBanner.jsx';
import { BUSINESS_CONFIG } from './config/businessConfig.js';

// Code-split secondary routes for rapid initial load and optimal performance
const ProductDetailsPage = lazy(() => import('./components/ProductDetailsPage.jsx'));
const NutritionAnalysisPage = lazy(() => import('./components/NutritionAnalysisPage.jsx'));
const BlogPage = lazy(() => import('./components/BlogPage.jsx'));
const ChatbotInterface = lazy(() => import('./components/ChatbotInterface.jsx'));
const UserProfilePage = lazy(() => import('./components/UserProfilePage.jsx'));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage.jsx'));
const TermsPage = lazy(() => import('./components/TermsPage.jsx'));
const CookiePolicyPage = lazy(() => import('./components/CookiePolicyPage.jsx'));
const RefundPolicyPage = lazy(() => import('./components/RefundPolicyPage.jsx'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <span style={{ color: '#64748B', fontSize: '0.88rem', fontWeight: 500, letterSpacing: '-0.01em' }}>
        Loading verified data…
      </span>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState({ name: 'home', data: null });
  const [user, setUser] = useState(undefined); // undefined = loading
  const [authOpen, setAuthOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });
    return unsub;
  }, []);

  const navigate = useCallback((name, data = null) => {
    setPage({ name, data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setProfileDropdown(false);
    navigate('home');
  };

  const initials = user
    ? (user.displayName || user.email || '?').slice(0, 2).toUpperCase()
    : '';

  // Mobile nav items
  const mobileNav = [
    { key: 'home', label: 'Products', icon: Package },
    { key: 'analysis', label: 'Calories', icon: BarChart2 },
    { key: 'chatbot', label: 'Chatbot', icon: MessageCircle },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div style={{ background: '#F8FAF9', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#111827' }}>
      {/* ── Top Micro Banner (Production Trust Header) ───────────────────── */}
      <div style={{
        background: '#0E3B2E',
        color: '#E2E8F0',
        fontSize: '0.74rem',
        padding: '0.35rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontWeight: 500,
        letterSpacing: '0.01em',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }} className="hidden md:flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#86EFAC' }}>
            <ShieldCheck size={13} /> Independent Nutritional & Ingredient Safety Standards
          </span>
          <span style={{ opacity: 0.35 }}>|</span>
          <span style={{ color: '#CBD5E1' }}>
            NOVA Processing Analysis • FSSAI & INCI Standards
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#A7F3D0' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', display: 'inline-block' }} />
            Real-time Multimodal Label Analysis
          </span>
        </div>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem',
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Brand Logo */}
          <motion.button
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate('home')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.65rem',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '0.65rem',
              background: 'linear-gradient(135deg, #0E3B2E 0%, #15803D 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(14, 59, 46, 0.25), inset 0 1px 1px rgba(255,255,255,0.3)',
            }}>
              <Leaf size={18} color="white" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.15rem', color: '#0F172A', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                NutriScan <span style={{ color: '#15803D', fontWeight: 700 }}>AI</span>
              </span>
              <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Health & Safety Intelligence
              </span>
            </div>
          </motion.button>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            className="desktop-nav">
            {[
              { key: 'home', label: 'Products' },
              { key: 'analysis', label: 'Calories Analysis' },
              { key: 'blog', label: 'Blog' },
              { key: 'chatbot', label: 'Chatbot' },
            ].map(({ key, label }) => {
              const isActive = page.name === key || (key === 'home' && page.name === 'details');
              return (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  style={{
                    background: isActive ? '#ECFDF5' : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? '#A7F3D0' : 'transparent',
                    cursor: 'pointer',
                    padding: '0.45rem 0.95rem',
                    borderRadius: '0.65rem',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#065F46' : '#475569',
                    fontSize: '0.88rem',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#F1F5F9';
                      e.currentTarget.style.color = '#0F172A';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#475569';
                    }
                  }}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Right: User Authentication / Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user === undefined ? (
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#E2E8F0', animation: 'pulse-subtle 1.5s infinite' }} />
            ) : user ? (
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setProfileDropdown(d => !d)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: '#FFFFFF', border: '1px solid #CBD5E1',
                    borderRadius: '99px', padding: '0.28rem 0.75rem 0.28rem 0.3rem',
                    cursor: 'pointer', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0E3B2E, #166534)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.76rem', fontWeight: 700,
                    }}>{initials}</div>
                  )}
                  <span style={{ fontSize: '0.84rem', color: '#1E293B', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </span>
                  <ChevronDown size={14} color="#64748B" />
                </motion.button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {profileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                        background: '#FFFFFF', borderRadius: '0.875rem', minWidth: 190,
                        boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.16), 0 0 0 1px rgba(15, 23, 42, 0.08)',
                        overflow: 'hidden', zIndex: 200,
                      }}
                    >
                      <DropdownItem icon={<User size={15} />} label="Profile" onClick={() => { navigate('profile'); setProfileDropdown(false); }} />
                      <div style={{ height: 1, background: '#F1F5F9', margin: '0.2rem 0' }} />
                      <DropdownItem icon={<LogOut size={15} />} label="Sign Out" onClick={handleSignOut} danger />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="btn-primary"
                onClick={() => setAuthOpen(true)}
                style={{ padding: '0.55rem 1.15rem', fontSize: '0.86rem' }}
              >
                <LogIn size={15} /> Login
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* Click outside to close dropdown */}
      {profileDropdown && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setProfileDropdown(false)} />
      )}

      {/* ── Main Application Content ────────────────────────────────────── */}
      <main style={{ flex: 1, paddingBottom: '4rem' }}>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            {page.name === 'home' && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <HomePage onNavigate={navigate} user={user} />
              </motion.div>
            )}
            {page.name === 'details' && (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProductDetailsPage data={page.data} onNavigate={navigate} user={user} />
              </motion.div>
            )}
            {page.name === 'analysis' && (
              <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <NutritionAnalysisPage user={user} onNavigate={navigate} />
              </motion.div>
            )}
            {page.name === 'blog' && (
              <motion.div key="blog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BlogPage onNavigate={navigate} />
              </motion.div>
            )}
            {page.name === 'chatbot' && (
              <motion.div key="chatbot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
                <ChatbotInterface user={user} onAuthRequest={() => setAuthOpen(true)} />
              </motion.div>
            )}
            {page.name === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <UserProfilePage user={user} onSignOut={handleSignOut} onAuthRequest={() => setAuthOpen(true)} onNavigate={navigate} />
              </motion.div>
            )}
            {page.name === 'privacy' && (
              <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PrivacyPolicyPage onNavigate={navigate} />
              </motion.div>
            )}
            {page.name === 'terms' && (
              <motion.div key="terms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TermsPage onNavigate={navigate} />
              </motion.div>
            )}
            {page.name === 'cookies' && (
              <motion.div key="cookies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CookiePolicyPage onNavigate={navigate} />
              </motion.div>
            )}
            {page.name === 'refund' && (
              <motion.div key="refund" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <RefundPolicyPage onNavigate={navigate} />
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>
      </main>

      {/* ── Production Footer (Professional Software Standards) ─────────── */}
      <footer style={{
        background: '#0B1E17',
        color: '#E2E8F0',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        marginTop: 'auto',
      }} className="block">
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '3.5rem 1.5rem 5.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
            {/* Col 1: Brand & Mission */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '0.6rem',
                  background: 'linear-gradient(135deg, #166534, #22C55E)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Leaf size={17} color="white" />
                </div>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: '#FFFFFF' }}>
                  {BUSINESS_CONFIG.brandName}
                </span>
              </div>
              <p style={{ color: '#94A3B8', fontSize: '0.86rem', lineHeight: 1.7, maxWidth: 360, margin: '0 0 1.25rem' }}>
                Independent consumer safety intelligence. We decode ultra-processed foods, cosmetic chemicals, and dietary additives to help consumers make clean, evidence-based choices.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#86EFAC', fontSize: '0.8rem', fontWeight: 500 }}>
                <ShieldCheck size={16} /> Independent Nutritional & Ingredient Evaluations
              </div>
            </div>

            {/* Col 2: Scientific Standards */}
            <div>
              <h4 style={{ color: '#FFFFFF', fontSize: '0.92rem', fontWeight: 700, margin: '0 0 1rem', fontFamily: 'Inter, sans-serif' }}>
                Standards & Science
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.84rem', color: '#94A3B8' }}>
                <li>NOVA Food Processing Classification</li>
                <li>FSSAI Food Additive Guidelines</li>
                <li>INCI Cosmetic Safety Index</li>
                <li>WHO Daily Sodium & Sugar Benchmarks</li>
                <li>EFSA Toxicology Database</li>
              </ul>
            </div>

            {/* Col 3: Platform & Legal Policies */}
            <div>
              <h4 style={{ color: '#FFFFFF', fontSize: '0.92rem', fontWeight: 700, margin: '0 0 1rem', fontFamily: 'Inter, sans-serif' }}>
                Platform & Legal
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.84rem' }}>
                <li>
                  <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 'inherit' }}>
                    Packaged Foods Scanner
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('analysis')} style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 'inherit' }}>
                    Calories & Macro Calculator
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('blog')} style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 'inherit' }}>
                    Health & Nutrition Blog
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('chatbot')} style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 'inherit' }}>
                    Ingredient AI Assistant
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('privacy')} style={{ background: 'none', border: 'none', padding: 0, color: '#86EFAC', cursor: 'pointer', fontSize: 'inherit', fontWeight: 500 }}>
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('terms')} style={{ background: 'none', border: 'none', padding: 0, color: '#86EFAC', cursor: 'pointer', fontSize: 'inherit', fontWeight: 500 }}>
                    Terms and Conditions
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('cookies')} style={{ background: 'none', border: 'none', padding: 0, color: '#86EFAC', cursor: 'pointer', fontSize: 'inherit', fontWeight: 500 }}>
                    Cookie & Storage Policy
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('refund')} style={{ background: 'none', border: 'none', padding: 0, color: '#86EFAC', cursor: 'pointer', fontSize: 'inherit', fontWeight: 500 }}>
                    Refund & Pricing Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Medical & Legal Disclaimer */}
            <div>
              <h4 style={{ color: '#FFFFFF', fontSize: '0.92rem', fontWeight: 700, margin: '0 0 1rem', fontFamily: 'Inter, sans-serif' }}>
                Medical Disclaimer
              </h4>
              <p style={{ color: '#94A3B8', fontSize: '0.78rem', lineHeight: 1.65, margin: '0 0 1rem' }}>
                NutriScan AI is an educational reference platform. Assessments are synthesized from product label declarations and recognized nutrition databases. This service does not constitute personal medical diagnosis or medical advice.
              </p>
              <div style={{ color: '#64748B', fontSize: '0.75rem', lineHeight: 1.5 }}>
                <div><strong>DPDP Grievance Contact:</strong></div>
                <a href={`mailto:${BUSINESS_CONFIG.grievanceEmail}`} style={{ color: '#86EFAC', textDecoration: 'none' }}>
                  {BUSINESS_CONFIG.grievanceEmail}
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Strip */}
          <div style={{
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#64748B',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              © 2026 {BUSINESS_CONFIG.legalName}. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => navigate('privacy')}
                style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 'inherit' }}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => navigate('terms')}
                style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 'inherit' }}
              >
                Terms of Service
              </button>
              <button
                onClick={() => navigate('cookies')}
                style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 'inherit' }}
              >
                Cookie Policy
              </button>
              <button
                onClick={() => navigate('refund')}
                style={{ background: 'none', border: 'none', padding: 0, color: '#94A3B8', cursor: 'pointer', fontSize: 'inherit' }}
              >
                Refund Policy
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation Bar ───────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(15, 23, 42, 0.08)',
        boxShadow: '0 -4px 16px rgba(15, 23, 42, 0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '0.45rem 0 env(safe-area-inset-bottom, 0.45rem)',
      }}
        className="mobile-nav"
      >
        {mobileNav.map(({ key, label, icon: Icon }) => {
          const active = page.name === key || (key === 'home' && page.name === 'details');
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.88 }}
              onClick={() => navigate(key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.35rem 0.75rem', flex: 1,
                color: active ? '#0E3B2E' : '#64748B',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '0.55rem',
                background: active ? '#ECFDF5' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}>
                <Icon size={19} color={active ? '#065F46' : '#64748B'} />
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: active ? 700 : 500, fontFamily: 'Inter, sans-serif' }}>
                {label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* ── Auth Modal ─────────────────────────────────────────────────── */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onNavigate={navigate} />

      {/* ── Cookie Consent Banner ───────────────────────────────────────── */}
      <CookieConsentBanner onNavigate={navigate} />

      {/* ── Responsive Visibility Style ────────────────────────────────── */}
      <style>{`
        @media (min-width: 768px) {
          .mobile-nav { display: none !important; }
          .desktop-nav { display: flex !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-nav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

// Dropdown item
function DropdownItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
        padding: '0.7rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
        color: danger ? '#DC2626' : '#1E293B', fontWeight: 500, fontSize: '0.86rem',
        fontFamily: 'Inter, sans-serif', textAlign: 'left',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#FEF2F2' : '#F8FAFC'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {icon} {label}
    </button>
  );
}
