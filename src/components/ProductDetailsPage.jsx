// Product Details Page – AI product analysis result
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bookmark, Share2, Check, ShieldAlert, FlaskConical, CheckCircle2 } from 'lucide-react';
import { GradeBadge, IngredientRow, PageWrapper } from './Shared.jsx';
import { analyzeProductAI } from '../services/gemini.js';
import { db, APP_ID } from '../firebaseConfig.js';
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Call Gemini through backend proxy if available, else direct via client service
async function analyzeProductWithAI(query, type, imageBase64) {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/analyzeProduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type, imageBase64 }),
      });
      if (res.ok) return await res.json();
    } catch { /* fall through to direct */ }
  }

  return await analyzeProductAI({ query, type, imageBase64 });
}

function validateProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    name: String(raw.name || 'Unknown Product'),
    healthGrade: ['A', 'B', 'C', 'D', 'F'].includes(raw.healthGrade) ? raw.healthGrade : 'C',
    summary: String(raw.summary || 'No summary available.'),
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map(i => ({
          name: String(i.name || 'Unknown'),
          type: i.type === 'Natural' ? 'Natural' : 'Artificial',
          risk: String(i.risk || ''),
          classification: ['safe', 'limited', 'harmful'].includes(i.classification) ? i.classification : 'limited',
        }))
      : [],
    alternatives: Array.isArray(raw.alternatives)
      ? raw.alternatives.map(a => ({ name: String(a.name || ''), reason: String(a.reason || '') }))
      : [],
  };
}

export default function ProductDetailsPage({ data, onNavigate, user }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(Boolean(data?.query || data?.imageBase64));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filterClass, setFilterClass] = useState('all'); // all | safe | limited | harmful

  useEffect(() => {
    let cancelled = false;

    // Check if product is already saved in Firestore if user is logged in
    const checkSaved = async (prodName) => {
      if (!user || !prodName) return;
      try {
        const docId = encodeURIComponent(prodName.toLowerCase().trim());
        const ref = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'savedProducts', docId);
        const snap = await getDoc(ref);
        if (!cancelled && snap.exists()) {
          setSaved(true);
        }
      } catch { /* ignore offline/permission errors */ }
    };

    // Log scan to Firestore history
    const logScan = async (validProd) => {
      if (!user || !validProd) return;
      try {
        await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'scans'), {
          name: validProd.name,
          healthGrade: validProd.healthGrade,
          summary: validProd.summary,
          type: data?.type || 'foods',
          scannedAt: serverTimestamp(),
        });
      } catch { /* ignore offline/permission errors */ }
    };

    analyzeProductWithAI(data?.query, data?.type || 'foods', data?.imageBase64)
      .then(raw => {
        if (cancelled) return;
        const validated = validateProduct(raw);
        if (!validated) {
          setError('Could not parse product data.');
        } else {
          setProduct(validated);
          checkSaved(validated.name);
          logScan(validated);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Analysis failed.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [data, user]);

  const toggleBookmark = async () => {
    if (!product) return;
    const nextSaved = !saved;
    setSaved(nextSaved);

    if (!user) return; // If not logged in, local toggle only
    setSavingDoc(true);
    try {
      const docId = encodeURIComponent(product.name.toLowerCase().trim());
      const ref = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'savedProducts', docId);
      if (nextSaved) {
        await setDoc(ref, {
          name: product.name,
          healthGrade: product.healthGrade,
          summary: product.summary,
          type: data?.type || 'foods',
          savedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(ref);
      }
    } catch (e) {
      console.warn('Failed to update bookmark in Firestore:', e);
    } finally {
      setSavingDoc(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredIngredients = product?.ingredients?.filter(ing => {
    if (filterClass === 'all') return true;
    return ing.classification === filterClass;
  }) || [];

  return (
    <PageWrapper style={{ background: '#F8FAF9', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* ── Sticky Laboratory Header Bar ──────────────────────────────── */}
      <div style={{
        background: '#FFFFFF', padding: '0.85rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
        position: 'sticky', top: 64, zIndex: 10,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={() => onNavigate('home')}
            aria-label="Back to home search"
            style={{
              background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#1E293B', transition: 'background-color 0.15s',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Safety Evaluation Report
            </div>
            <h2 style={{ margin: 0, fontSize: '0.98rem', fontFamily: 'Outfit, sans-serif', color: '#0F172A', fontWeight: 700 }}>
              {loading ? 'Evaluating ingredients…' : (product?.name || 'Product Analysis')}
            </h2>
          </div>
        </div>

        {/* Action icons */}
        {!loading && product && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleCopyLink}
              title="Copy shareable report link"
              style={{
                background: copied ? '#ECFDF5' : '#F1F5F9',
                border: '1px solid',
                borderColor: copied ? '#A7F3D0' : '#E2E8F0',
                borderRadius: '0.65rem', padding: '0.45rem 0.75rem',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                cursor: 'pointer', color: copied ? '#065F46' : '#475569',
                fontSize: '0.8rem', fontWeight: 600,
              }}
            >
              {copied ? <Check size={14} /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
            <button
              onClick={toggleBookmark}
              disabled={savingDoc}
              aria-label={saved ? 'Remove from saved products' : 'Save product to profile'}
              title={saved ? 'Saved to profile' : 'Save product'}
              style={{
                background: saved ? '#ECFDF5' : '#F1F5F9',
                border: '1px solid',
                borderColor: saved ? '#A7F3D0' : '#E2E8F0',
                borderRadius: '0.65rem', padding: '0.45rem 0.75rem',
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                cursor: 'pointer', color: saved ? '#065F46' : '#475569',
                fontSize: '0.8rem', fontWeight: 600,
              }}
            >
              <Bookmark size={15} color={saved ? '#059669' : '#475569'} fill={saved ? '#059669' : 'none'} />
              <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 840, margin: '0 auto', padding: '1.75rem 1.25rem' }}>
        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <div className="spinner" style={{ width: 44, height: 44, margin: '0 auto 1.5rem', borderWidth: 3.5 }} />
            <h3 style={{ color: '#0F172A', fontSize: '1.15rem', marginBottom: '0.4rem' }}>
              {data?.imageBase64 ? 'Scanning label typography & barcodes…' : 'Synthesizing ingredient toxicology…'}
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.88rem', maxWidth: 440, margin: '0 auto' }}>
              Cross-referencing food additives, emulsifiers, and preservative compounds against scientific safety registries…
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: '1.125rem', padding: '2.5rem 1.5rem', textAlign: 'center',
          }}>
            <ShieldAlert size={36} color="#DC2626" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <h3 style={{ color: '#991B1B', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Analysis Incomplete</h3>
            <p style={{ color: '#7F1D1D', fontSize: '0.88rem', marginBottom: '1.5rem', maxWidth: 440, margin: '0 auto 1.5rem' }}>
              {error}
            </p>
            <button className="btn-primary" onClick={() => onNavigate('home')}>
              ← Back to Search
            </button>
          </div>
        )}

        {/* Product Results */}
        {!loading && product && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            {/* Primary Overview Card */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
                <GradeBadge grade={product.healthGrade} size={92} />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.65rem', color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      {product.name}
                    </h1>
                  </div>

                  {/* Scientific Evaluation Tags */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <span style={{
                      background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
                      borderRadius: '99px', padding: '0.25rem 0.85rem', fontSize: '0.78rem', fontWeight: 600,
                    }}>
                      Health Grade: {product.healthGrade}
                    </span>
                    <span style={{
                      background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0',
                      borderRadius: '99px', padding: '0.25rem 0.85rem', fontSize: '0.78rem', fontWeight: 500,
                    }}>
                      {product.ingredients.length} ingredients analyzed
                    </span>
                    <span style={{
                      background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0',
                      borderRadius: '99px', padding: '0.25rem 0.85rem', fontSize: '0.78rem', fontWeight: 500,
                    }}>
                      Category: {data?.type === 'care' ? 'Personal Care' : data?.type === 'health' ? 'Health Supplement' : 'Packaged Food'}
                    </span>
                  </div>

                  <p style={{ margin: 0, color: '#475569', fontSize: '0.94rem', lineHeight: 1.65 }}>
                    {product.summary}
                  </p>
                </div>
              </div>
            </div>

            {/* Ingredient Breakdown Card */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0F172A' }}>
                  <FlaskConical size={18} color="#0E3B2E" /> Ingredient Analysis
                </h2>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '0.35rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '0.65rem' }}>
                  {[
                    { id: 'all', label: `All (${product.ingredients.length})` },
                    { id: 'safe', label: `Safe (${product.ingredients.filter(i => i.classification === 'safe').length})` },
                    { id: 'limited', label: `Caution (${product.ingredients.filter(i => i.classification === 'limited').length})` },
                    { id: 'harmful', label: `Harmful (${product.ingredients.filter(i => i.classification === 'harmful').length})` },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterClass(tab.id)}
                      style={{
                        background: filterClass === tab.id ? '#FFFFFF' : 'transparent',
                        border: 'none', borderRadius: '0.45rem',
                        padding: '0.25rem 0.65rem', fontSize: '0.74rem',
                        fontWeight: filterClass === tab.id ? 700 : 500,
                        color: filterClass === tab.id ? '#0F172A' : '#64748B',
                        cursor: 'pointer', boxShadow: filterClass === tab.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend Strip */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.1rem', paddingBottom: '0.85rem', borderBottom: '1px solid #F1F5F9' }}>
                {[
                  ['safe', '#059669', 'Recognized Safe & Clean'],
                  ['limited', '#D97706', 'Moderate Intake Caution'],
                  ['harmful', '#DC2626', 'Flagged Health Concern'],
                ].map(([cls, clr, desc]) => (
                  <span key={cls} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    fontSize: '0.76rem', color: '#475569', fontWeight: 500,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: clr, display: 'inline-block' }} />
                    <strong style={{ color: clr, textTransform: 'capitalize' }}>{cls}:</strong> {desc}
                  </span>
                ))}
              </div>

              {/* List */}
              {filteredIngredients.length === 0 ? (
                <p style={{ color: '#64748B', fontSize: '0.88rem', margin: '1rem 0' }}>
                  No ingredients match this filter criteria.
                </p>
              ) : (
                filteredIngredients.map((ing, i) => (
                  <IngredientRow key={i} ingredient={ing} index={i} />
                ))
              )}
            </div>

            {/* Better Alternatives Card */}
            {product.alternatives.length > 0 && (
              <div className="card">
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0F172A' }}>
                  <CheckCircle2 size={18} color="#15803D" /> Better Alternatives
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                  {product.alternatives.map((alt, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      style={{
                        borderLeft: '4px solid #166534',
                        background: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderLeftWidth: '4px',
                        borderRadius: '0.875rem',
                        padding: '1rem 1.15rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#14532D', marginBottom: '0.3rem', fontSize: '0.94rem' }}>
                        {alt.name}
                      </div>
                      <div style={{ color: '#166534', fontSize: '0.84rem', lineHeight: 1.55 }}>
                        {alt.reason}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
