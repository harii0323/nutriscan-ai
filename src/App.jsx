import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Leaf, Package, BarChart2, MessageCircle, User,
  LogIn, ChevronDown, LogOut,
} from 'lucide-react';

import { auth } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import AuthModal from './components/Modals.jsx';
import HomePage from './components/HomePage.jsx';

// Code-split secondary routes for rapid initial load and optimal performance
const ProductDetailsPage = lazy(() => import('./components/ProductDetailsPage.jsx'));
const NutritionAnalysisPage = lazy(() => import('./components/NutritionAnalysisPage.jsx'));
const BlogPage = lazy(() => import('./components/BlogPage.jsx'));
const ChatbotInterface = lazy(() => import('./components/ChatbotInterface.jsx'));
const UserProfilePage = lazy(() => import('./components/UserProfilePage.jsx'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
      <span style={{ color: '#576574', fontSize: '0.9rem', fontWeight: 500 }}>Loading view…</span>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
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
    <div style={{ background: '#F8F4F0', minHeight: '100vh' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(76,95,78,0.1)',
        boxShadow: '0 2px 20px rgba(76,95,78,0.07)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem',
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('home')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '0.6rem',
              background: 'linear-gradient(135deg, #4C5F4E, #27AE60)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(76,95,78,0.3)',
            }}>
              <Leaf size={18} color="white" />
            </div>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#2C3E50' }}>
              NutriScan <span style={{ color: '#4C5F4E' }}>AI</span>
            </span>
          </motion.button>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            className="desktop-nav">
            {[
              { key: 'home', label: 'Products' },
              { key: 'analysis', label: 'Calories Analysis' },
              { key: 'blog', label: 'Blog' },
              { key: 'chatbot', label: 'Chatbot' },
            ].map(({ key, label }) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(key)}
                style={{
                  background: page.name === key ? 'rgba(76,95,78,0.1)' : 'none',
                  border: 'none', cursor: 'pointer',
                  padding: '0.5rem 0.9rem', borderRadius: '0.65rem',
                  fontFamily: 'Inter, sans-serif', fontWeight: page.name === key ? 700 : 500,
                  color: page.name === key ? '#4C5F4E' : '#576574',
                  fontSize: '0.88rem', transition: 'all 0.15s',
                }}
              >
                {label}
              </motion.button>
            ))}
          </nav>

          {/* Right: auth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {user === undefined ? (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8e4e0' }} />
            ) : user ? (
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setProfileDropdown(d => !d)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'none', border: '1.5px solid rgba(76,95,78,0.2)',
                    borderRadius: '99px', padding: '0.3rem 0.75rem 0.3rem 0.3rem',
                    cursor: 'pointer',
                  }}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4C5F4E, #27AE60)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.8rem', fontWeight: 700,
                    }}>{initials}</div>
                  )}
                  <span style={{ fontSize: '0.85rem', color: '#2C3E50', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </span>
                  <ChevronDown size={14} color="#576574" />
                </motion.button>

                {/* Dropdown */}
                <AnimatePresence>
                  {profileDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                        background: 'white', borderRadius: '1rem', minWidth: 180,
                        boxShadow: '0 8px 40px rgba(44,62,80,0.18)',
                        border: '1px solid rgba(76,95,78,0.1)',
                        overflow: 'hidden', zIndex: 200,
                      }}
                    >
                      <DropdownItem icon={<User size={15} />} label="Profile" onClick={() => { navigate('profile'); setProfileDropdown(false); }} />
                      <DropdownItem icon={<LogOut size={15} />} label="Sign Out" onClick={handleSignOut} danger />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                className="btn-primary"
                onClick={() => setAuthOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <LogIn size={16} /> Login
              </motion.button>
            )}
          </div>
        </div>
      </header>

      {/* Click outside to close dropdown */}
      {profileDropdown && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setProfileDropdown(false)} />
      )}

      {/* ── Page Content ───────────────────────────────────────────────── */}
      <main style={{ paddingBottom: '5rem' }}>
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
          </AnimatePresence>
        </Suspense>
      </main>

      {/* ── Mobile bottom nav ──────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(76,95,78,0.1)',
        boxShadow: '0 -4px 20px rgba(76,95,78,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        padding: '0.5rem 0 env(safe-area-inset-bottom, 0.5rem)',
      }}
        className="mobile-nav"
      >
        {mobileNav.map(({ key, label, icon: Icon }) => {
          const active = page.name === key || (key === 'home' && page.name === 'details');
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.85 }}
              onClick={() => navigate(key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '0.4rem 1rem', flex: 1,
                color: active ? '#4C5F4E' : '#999',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '0.65rem',
                background: active ? 'rgba(76,95,78,0.12)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                <Icon size={20} />
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: active ? 700 : 500, fontFamily: 'Inter, sans-serif' }}>
                {label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* ── Auth Modal ─────────────────────────────────────────────────── */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />

      {/* ── Desktop/Mobile visibility CSS ─────────────────────────────── */}
      <style>{`
        @media (min-width: 768px) {
          .mobile-nav { display: none !important; }
          .desktop-nav { display: flex !important; }
          main { padding-bottom: 0 !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-nav { display: flex !important; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(39,174,96,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(39,174,96,0); }
        }
      `}</style>
    </div>
  );
}

// Dropdown item
function DropdownItem({ icon, label, onClick, danger }) {
  return (
    <motion.button
      whileHover={{ background: danger ? 'rgba(231,76,60,0.08)' : 'rgba(76,95,78,0.06)' }}
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
        padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
        color: danger ? '#E74C3C' : '#2C3E50', fontWeight: 500, fontSize: '0.88rem',
        fontFamily: 'Inter, sans-serif', textAlign: 'left',
      }}
    >
      {icon} {label}
    </motion.button>
  );
}
