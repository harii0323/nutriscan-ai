// User Profile Page – Member dashboard & history
import React, { useState, useEffect } from 'react';
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
      <PageWrapper style={{ background: '#F8FAF9', minHeight: '100vh', paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '5rem 1.5rem', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
          }}>
            <User size={32} color="#059669" />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Sign in to view your profile
          </h2>
          <p style={{ color: '#4B5563', marginBottom: '2rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Access your saved products, scan history, and personalized ingredient safety alerts.
          </p>
          <button
            className="btn-primary" onClick={onAuthRequest}
            style={{ padding: '0.85rem 2.2rem', fontSize: '0.96rem' }}>
            Sign In / Create Account
          </button>
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
    <PageWrapper style={{ background: '#F8FAF9', minHeight: '100vh', paddingBottom: '6rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.25rem' }}>

        {/* Profile Card */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '2rem', textAlign: 'center', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile"
                style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #0E3B2E' }} />
            ) : (
              <div style={{
                width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #0E3B2E 0%, #166534 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '1.75rem', fontWeight: 800, fontFamily: 'Outfit, sans-serif',
                border: '3px solid rgba(255,255,255,0.8)',
                boxShadow: '0 4px 16px rgba(14, 59, 46, 0.25)',
              }}>
                {initials}
              </div>
            )}
          </div>

          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', maxWidth: 320, margin: '0 auto' }}>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Display name"
                aria-label="Display name"
                style={{
                  border: '1.5px solid #0E3B2E', borderRadius: '0.75rem',
                  padding: '0.65rem 1rem', outline: 'none', width: '100%',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.95rem', color: '#0F172A',
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
              <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.45rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
                {user.displayName || user.email?.split('@')[0] || 'User'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                <Mail size={14} /> {user.email || user.phoneNumber || 'No email registered'}
              </div>
              <button
                onClick={() => setEditMode(true)} className="btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.2rem', fontSize: '0.84rem' }}>
                <Edit2 size={13} /> Edit Profile
              </button>
            </>
          )}

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem',
            marginTop: '2rem', paddingTop: '1.75rem', borderTop: '1px solid #F1F5F9',
          }}>
            {[
              { label: 'Products Scanned', value: String(recentScans.length), color: '#0E3B2E' },
              { label: 'Saved Products', value: String(savedProducts.length), color: '#059669' },
              { label: 'Analyses Run', value: String(recentScans.length + savedProducts.length), color: '#D97706' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {loadingData ? '–' : stat.value}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginTop: '0.25rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Products */}
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: '#0F172A' }}>
            <Star size={18} color="#D97706" /> Saved Products ({savedProducts.length})
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
                    padding: '0.85rem 1.1rem', borderRadius: '0.75rem', background: '#F8FAFC',
                    border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <GradeBadge grade={prod.healthGrade || 'C'} size={38} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0F172A' }}>{prod.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'capitalize' }}>{prod.type || 'foods'}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Scans */}
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: '#0F172A' }}>
            <Clock size={18} color="#0E3B2E" /> Recent Scans ({recentScans.length})
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
                    padding: '0.85rem 1.1rem', borderRadius: '0.75rem', background: '#F8FAFC',
                    border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <GradeBadge grade={scan.healthGrade || 'C'} size={38} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0F172A' }}>{scan.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'capitalize' }}>{scan.type || 'foods'}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94A3B8" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          style={{
            width: '100%', padding: '0.85rem', background: '#FEF2F2',
            border: '1.5px solid #FECACA', borderRadius: '0.85rem',
            color: '#DC2626', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            fontSize: '0.94rem', transition: 'background-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
          onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
        >
          <LogOut size={17} /> Sign Out
        </button>
      </div>
    </PageWrapper>
  );
}
