// User Profile Page – Member dashboard, history, and DPDP-compliant data controls
import React, { useState, useEffect } from 'react';
import {
  Edit2, Bookmark, Clock, LogOut, User, Mail, ChevronRight,
  Download, Trash2, Shield, Settings, AlertTriangle, Search
} from 'lucide-react';
import { PageWrapper, EmptyState, GradeBadge, ModalOverlay } from './Shared.jsx';
import { updateProfile, deleteUser } from 'firebase/auth';
import { db, auth, APP_ID } from '../firebaseConfig.js';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc } from 'firebase/firestore';
import CookieConsentBanner from './CookieConsentBanner.jsx';

export default function UserProfilePage({ user, onSignOut, onAuthRequest, onNavigate }) {
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProducts, setSavedProducts] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [loadingData, setLoadingData] = useState(Boolean(user));

  // Privacy & Data control states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [exportingData, setExportingData] = useState(false);
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);

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

  // DPDP Act Section 11: Right to Access & Download Personal Data
  const handleDownloadData = async () => {
    setExportingData(true);
    try {
      const exportObject = {
        exportMetadata: {
          platform: 'NutriScan AI',
          exportedAt: new Date().toISOString(),
          dataPrincipalId: user.uid,
          statutoryFramework: 'Digital Personal Data Protection Act, 2023 (India)',
        },
        accountProfile: {
          uid: user.uid,
          email: user.email || null,
          displayName: user.displayName || null,
          phoneNumber: user.phoneNumber || null,
          createdAt: user.metadata?.creationTime || null,
          lastLoginAt: user.metadata?.lastSignInTime || null,
        },
        savedProducts: savedProducts,
        recentScans: recentScans,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `nutriscan-personal-data-${user.uid.slice(0, 8)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Failed to export personal data:', err);
    } finally {
      setExportingData(false);
    }
  };

  // DPDP Act Section 12: Right to Erasure / Account Deletion
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError('');
    const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
    const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, '') || '/api';

    try {
      let serverDeleted = false;
      // 1. Try server-side authorized complete deletion workflow
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          const res = await fetch(`${BACKEND_URL}/deleteAccount`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
          });
          if (res.ok) {
            serverDeleted = true;
          }
        }
      } catch (backendErr) {
        console.warn('Backend deletion call skipped/failed, proceeding with direct fallback:', backendErr);
      }

      // 2. Direct fallback if server-side endpoint not deployed or reached
      if (!serverDeleted) {
        // Delete all saved products in Firestore
        const savedRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'savedProducts');
        const savedSnap = await getDocs(savedRef);
        for (const d of savedSnap.docs) {
          await deleteDoc(d.ref);
        }

        // Delete all scans in Firestore
        const scansRef = collection(db, 'artifacts', APP_ID, 'users', user.uid, 'scans');
        const scansSnap = await getDocs(scansRef);
        for (const d of scansSnap.docs) {
          await deleteDoc(d.ref);
        }

        // Delete user document in Firestore
        await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', user.uid));

        // Delete user account in Firebase Auth
        await deleteUser(auth.currentUser || user);
      }

      setDeleteModalOpen(false);
      onSignOut?.();
    } catch (err) {
      console.error('Error during account erasure:', err);
      if (err?.code === 'auth/requires-recent-login') {
        setDeleteError('For security, your credentials require re-authentication. Please sign out and sign back in before requesting account deletion.');
      } else {
        setDeleteError(err?.message || 'Failed to delete account. Please contact support.');
      }
    } finally {
      setDeletingAccount(false);
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
              <img src={user.photoURL} alt="User profile"
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
                  {loadingData ? '-' : stat.value}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginTop: '0.25rem' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Products */}
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: '#0F172A' }}>
            <Bookmark size={18} color="#D97706" /> Saved Products ({savedProducts.length})
          </h3>
          {savedProducts.length === 0 ? (
            <EmptyState icon={<Bookmark size={24} color="#D97706" />} title="No products saved yet" description="Save products while scanning to access them here." />
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
            <EmptyState icon={<Search size={24} color="#0E3B2E" />} title="No recent scans" description="Your scan history will appear here after you analyze products." />
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

        {/* ── Data & Privacy Controls (DPDP Act Compliance) ───────────────── */}
        <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <h3 style={{ margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', color: '#0F172A' }}>
            <Shield size={18} color="#0E3B2E" /> Data & Privacy Controls
          </h3>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5 }}>
            Manage your personal data under the Digital Personal Data Protection Act, 2023. You can export all records or permanently delete your account.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {/* Download Data */}
            <button
              onClick={handleDownloadData}
              disabled={exportingData}
              className="btn-secondary"
              style={{ justifyContent: 'center', padding: '0.75rem 1rem', fontSize: '0.86rem' }}
            >
              <Download size={15} />
              {exportingData ? 'Generating…' : 'Download my data'}
            </button>

            {/* Cookie Preferences */}
            <button
              onClick={() => setCookieSettingsOpen(true)}
              className="btn-secondary"
              style={{ justifyContent: 'center', padding: '0.75rem 1rem', fontSize: '0.86rem' }}
            >
              <Settings size={15} />
              Manage cookie preferences
            </button>

            {/* Delete Account */}
            <button
              onClick={() => { setDeleteError(''); setDeleteModalOpen(true); }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                padding: '0.75rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: '0.75rem', color: '#DC2626', fontWeight: 600, fontSize: '0.86rem',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
              onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
            >
              <Trash2 size={15} />
              Delete account
            </button>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          style={{
            width: '100%', padding: '0.85rem', background: '#FFFFFF',
            border: '1.5px solid #CBD5E1', borderRadius: '0.85rem',
            color: '#475569', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            fontSize: '0.94rem', transition: 'background-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#475569'; }}
        >
          <LogOut size={17} /> Sign Out
        </button>

      </div>

      {/* ── Account Deletion Confirmation Modal ──────────────────────────── */}
      <ModalOverlay isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} maxWidth="520px">
        <div style={{ textAlign: 'left' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: '#FEF2F2',
            border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
          }}>
            <AlertTriangle size={22} color="#DC2626" />
          </div>

          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0F172A' }}>
            Permanently Delete Account?
          </h3>

          <p style={{ margin: '0 0 1rem', color: '#4B5563', fontSize: '0.88rem', lineHeight: 1.6 }}>
            This action is permanent and cannot be undone. In accordance with Section 12 of India's Digital Personal Data Protection Act, 2023:
          </p>

          <ul style={{ margin: '0 0 1.25rem', paddingLeft: '1.2rem', color: '#64748B', fontSize: '0.84rem', lineHeight: 1.6 }}>
            <li>All saved products and nutritional bookmarks will be deleted from Cloud Firestore.</li>
            <li>Your scan history and portion records will be purged.</li>
            <li>Your authentication profile will be permanently deleted.</li>
          </ul>

          {deleteError && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.75rem',
              padding: '0.75rem 1rem', color: '#B91C1C', fontSize: '0.84rem', marginBottom: '1.25rem',
            }}>
              {deleteError}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={deletingAccount}
              className="btn-secondary"
              style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '0.75rem',
                padding: '0.6rem 1.35rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <Trash2 size={15} />
              {deletingAccount ? 'Purging data…' : 'Permanently Delete My Account'}
            </button>
          </div>
        </div>
      </ModalOverlay>

      {/* Cookie settings modal trigger */}
      {cookieSettingsOpen && (
        <CookieConsentBanner
          onNavigate={onNavigate}
          forceOpen={true}
          onCloseModal={() => setCookieSettingsOpen(false)}
        />
      )}
    </PageWrapper>
  );
}
