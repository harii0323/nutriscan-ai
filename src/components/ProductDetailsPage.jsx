// Product Details Page – AI product analysis result
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Bookmark } from 'lucide-react';
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

  return (
    <PageWrapper style={{ background: '#F8F4F0', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Header bar */}
      <div style={{
        background: 'white', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
        borderBottom: '1px solid rgba(76,95,78,0.08)',
        position: 'sticky', top: 64, zIndex: 10,
      }}>
        <button
          onClick={() => onNavigate('home')}
          aria-label="Back to home search"
          style={{
            background: '#f0ece8', border: 'none', borderRadius: '50%',
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#2C3E50',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: 'Outfit, sans-serif' }}>
          {loading ? 'Analyzing…' : (product?.name || 'Product Analysis')}
        </h2>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem' }}>
        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              style={{ width: 64, height: 64, margin: '0 auto 1.5rem', borderRadius: '50%',
                border: '4px solid rgba(76,95,78,0.15)', borderTopColor: '#4C5F4E' }}
            />
            <p style={{ color: '#576574', fontWeight: 500 }}>
              {data?.imageBase64 ? '🔍 AI is reading your image…' : '🤖 AI is analyzing product…'}
            </p>
            <p style={{ color: '#576574', fontSize: '0.85rem' }}>This usually takes a few seconds</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)',
            borderRadius: '1rem', padding: '2rem', textAlign: 'center',
          }}>
            <p style={{ color: '#E74C3C', fontWeight: 600, marginBottom: '1rem' }}>{error}</p>
            <button className="btn-primary" onClick={() => onNavigate('home')}>← Back to Search</button>
          </div>
        )}

        {/* Result */}
        {!loading && product && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {/* Overview card */}
            <div className="card" style={{ marginBottom: '1.25rem', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
                <GradeBadge grade={product.healthGrade} size={88} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', color: '#2C3E50' }}>{product.name}</h1>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <motion.button
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={toggleBookmark}
                        disabled={savingDoc}
                        aria-label={saved ? 'Remove from saved products' : 'Save product to profile'}
                        title={saved ? 'Saved to profile' : 'Save product'}
                        style={{
                          background: saved ? 'rgba(76,95,78,0.1)' : '#f0ece8', border: 'none', borderRadius: '50%',
                          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                      >
                        <Bookmark size={16} color={saved ? '#4C5F4E' : '#576574'} fill={saved ? '#4C5F4E' : 'none'} />
                      </motion.button>
                    </div>
                  </div>
                  <p style={{ margin: 0, color: '#576574', fontSize: '0.9rem', lineHeight: 1.6 }}>{product.summary}</p>

                  {/* Grade label */}
                  <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'rgba(76,95,78,0.1)', color: '#4C5F4E',
                      borderRadius: '99px', padding: '0.25rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                    }}>
                      Health Grade: {product.healthGrade}
                    </span>
                    <span style={{
                      background: '#f0ece8', color: '#576574',
                      borderRadius: '99px', padding: '0.25rem 0.75rem', fontSize: '0.78rem', fontWeight: 500,
                    }}>
                      {product.ingredients.length} ingredients analyzed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredient Analysis */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🧪 Ingredient Analysis
              </h2>
              {product.ingredients.length === 0 ? (
                <p style={{ color: '#576574', fontSize: '0.9rem' }}>No ingredient data available.</p>
              ) : (
                <div>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {[['safe', '#27AE60'], ['limited', '#F39C12'], ['harmful', '#E74C3C']].map(([cls, clr]) => (
                      <span key={cls} style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        fontSize: '0.75rem', color: clr, fontWeight: 600,
                        background: `${clr}18`, borderRadius: '99px', padding: '0.2rem 0.65rem',
                        border: `1px solid ${clr}44`,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: clr, display: 'inline-block' }} />
                        {cls.charAt(0).toUpperCase() + cls.slice(1)}
                      </span>
                    ))}
                  </div>
                  {product.ingredients.map((ing, i) => (
                    <IngredientRow key={i} ingredient={ing} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Better Alternatives */}
            {product.alternatives.length > 0 && (
              <div className="card">
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✅ Better Alternatives
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {product.alternatives.map((alt, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      style={{
                        borderLeft: '3px solid #4C5F4E',
                        paddingLeft: '1rem',
                        background: 'rgba(76,95,78,0.04)',
                        borderRadius: '0 0.75rem 0.75rem 0',
                        padding: '0.85rem 1rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#2C3E50', marginBottom: '0.25rem' }}>{alt.name}</div>
                      <div style={{ color: '#576574', fontSize: '0.85rem' }}>{alt.reason}</div>
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
