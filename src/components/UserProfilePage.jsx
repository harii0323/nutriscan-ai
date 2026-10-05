// User Profile Page
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Star, Clock, LogOut, User, Mail, ChevronRight } from 'lucide-react';
import { PageWrapper, EmptyState, GradeBadge } from './Shared.jsx';
import { updateProfile } from 'firebase/auth';
import { db, APP_ID } from '../firebaseConfig.js';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export default function UserProfilePage({ user, onSignOut, onAuthRequest, onNavigate }) {
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProducts, setSavedProducts] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [loadingData, setLoadingData] = useState(Boolean(user));

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        // Fetch saved products
        const savedRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'savedProducts');
        const savedSnap = await getDocs(query(savedRef, limit(20)));
        const savedList = savedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch recent scans
        const scansRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'scans');
        let scansList = [];
        try {
          const scansSnap = await getDocs(query(scansRef, orderBy('scannedAt', 'desc'), limit(10)));
          scansList = scansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch {
          const fallbackSnap = await getDocs(query(scansRef, limit(10)));
          scansList = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        if (!cancelled) {
          setSavedProducts(savedList);
          setRecentScans(scansList);
        }
      } catch (err) {
        console.warn('Error fetching user collections:', err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <PageWrapper style={{ background: '#F8F4F0', minHeight: '100vh', paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: 'rgba(76,95,78,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          }}>
            <User size={36} color="#4C5F4E" />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Sign in to view your profile</h2>
          <p style={{ color: '#576574', marginBottom: '2rem' }}>Access your saved products, scan history, and personalized insights.</p>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="btn-primary" onClick={onAuthRequest}
            style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
            Sign In / Create Account
          </motion.button>
        </div>
      </PageWrapper>
    );
  }

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      setEditMode(false);
    } catch (e) {
      console.warn('Profile update error:', e);
    } finally {
      setSavingProfile(false);
    }
  };

  const initials = (user.displayName || user.email || '?').slice(0, 2).toUpperCase();

  return (
    <PageWrapper style={{ background: '#F8F4F0', minHeight: '100vh', paddingBottom: '6rem' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Profile card */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '2rem', textAlign: 'center' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile"
                style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #4C5F4E' }} />
            ) : (
              <div style={{
                width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #4C5F4E, #27AE60)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.75rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                border: '3px solid rgba(76,95,78,0.2)',
              }}>
                {initials}
              </div>
            )}
          </div>

          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', maxWidth: 300, margin: '0 auto' }}>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name"
                aria-label="Display name"
                style={{
                  border: '1.5px solid #4C5F4E', borderRadius: '0.75rem',
                  padding: '0.65rem 1rem', outline: 'none', width: '100%',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', color: '#2C3E50',
                }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setEditMode(false)} className="btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Cancel</button>
                <button onClick={handleSaveProfile} disabled={savingProfile} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                  {savingProfile ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.4rem' }}>
                {user.displayName || user.email?.split('@')[0] || 'User'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#576574', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                <Mail size={14} /> {user.email || user.phoneNumber || 'No email'}
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setEditMode(true)} className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit2 size={14} /> Edit Profile
              </motion.button>
            </>
          )}

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap',
            marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(76,95,78,0.08)',
          }}>
            {[
              { label: 'Products Scanned', value: String(recentScans.length), color: '#4C5F4E' },
              { label: 'Saved Products', value: String(savedProducts.length), color: '#27AE60' },
              { label: 'Analyses Run', value: String(recentScans.length + savedProducts.length), color: '#F39C12' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color, fontFamily: 'Outfit, sans-serif' }}>
                  {loadingData ? '–' : stat.value}
                </div>
                <div style={{ fontSize: '0.73rem', color: '#576574', fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Products */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <Star size={18} color="#F39C12" /> Saved Products ({savedProducts.length})
          </h3>
          {savedProducts.length === 0 ? (
            <EmptyState icon="⭐" title="No products saved yet" description="Save products while scanning to access them here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {savedProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => onNavigate?.('details', { query: prod.name, type: prod.type || 'foods' })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#FAF8F5',
                    border: '1px solid rgba(76,95,78,0.08)', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <GradeBadge grade={prod.healthGrade || 'C'} size={36} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2C3E50' }}>{prod.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#576574' }}>{prod.type || 'foods'}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#576574" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Scans */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
            <Clock size={18} color="#4C5F4E" /> Recent Scans ({recentScans.length})
          </h3>
          {recentScans.length === 0 ? (
            <EmptyState icon="🔍" title="No recent scans" description="Your scan history will appear here after you analyze products." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  onClick={() => onNavigate?.('details', { query: scan.name, type: scan.type || 'foods' })}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#FAF8F5',
                    border: '1px solid rgba(76,95,78,0.08)', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <GradeBadge grade={scan.healthGrade || 'C'} size={36} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2C3E50' }}>{scan.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#576574' }}>{scan.type || 'foods'}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#576574" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onSignOut}
          style={{
            width: '100%', padding: '0.85rem', background: 'rgba(231,76,60,0.08)',
            border: '1.5px solid rgba(231,76,60,0.2)', borderRadius: '0.85rem',
            color: '#E74C3C', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            fontSize: '0.95rem',
          }}
        >
          <LogOut size={17} /> Sign Out
        </motion.button>
      </div>
    </PageWrapper>
  );
}

