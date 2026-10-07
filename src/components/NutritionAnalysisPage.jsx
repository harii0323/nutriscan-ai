// Nutrition Analysis Page – food image recognition, plate analysis, serving recalculation, clinical insights
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Upload, Camera, Link, X, RefreshCw, Brain, Lightbulb, ChefHat,
  Scale, Activity, PieChart
} from 'lucide-react';
import { PageWrapper, Spinner, GradeBadge, NutritionCard, InfoCard, ModalOverlay } from './Shared.jsx';
import {
  identifyFoodItemsAI,
  analyzeFoodNutritionAI,
  getAIInsightAI,
} from '../services/gemini.js';
import { db, APP_ID } from '../firebaseConfig.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

async function identifyFoodItems(imageBase64) {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/identifyFoodItems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      if (res.ok) return await res.json();
    } catch { /* fall through */ }
  }
  return await identifyFoodItemsAI(imageBase64);
}

async function analyzeFoodNutrition(foodName, serving = '100 grams', isPlate = false) {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/analyzeNutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName, serving, isPlate }),
      });
      if (res.ok) return await res.json();
    } catch { /* fall through */ }
  }
  return await analyzeFoodNutritionAI(foodName, serving, isPlate);
}

async function recalculateServing(foodName, amount, unit) {
  const serving = `${amount} ${unit}`;
  return analyzeFoodNutrition(foodName, serving, false);
}

async function getAIInsight(foodName, insightType, nutrition) {
  if (BACKEND_URL) {
    try {
      const res = await fetch(`${BACKEND_URL}/aiInsight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName, insightType, nutrition }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.insight || data;
      }
    } catch { /* fall through */ }
  }
  return await getAIInsightAI(foodName, insightType, nutrition);
}

function validateNutrition(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw.nutrition || {};
  return {
    name: String(raw.name || 'Food Item'),
    healthGrade: ['A', 'B', 'C', 'D', 'F'].includes(raw.healthGrade) ? raw.healthGrade : 'B',
    summary: String(raw.summary || ''),
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : [],
    nutrition: {
      serving: String(n.serving || '100g'),
      calories: Number(n.calories) || 0,
      protein: Number(n.protein) || 0,
      carbs: Number(n.carbs) || 0,
      fat: Number(n.fat) || 0,
      sodium: String(n.sodium || '0mg'),
    },
    alternatives: Array.isArray(raw.alternatives) ? raw.alternatives : [],
  };
}

export default function NutritionAnalysisPage({ user, onNavigate: _onNavigate }) {
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Multi-item detection
  const [detectedItems, setDetectedItems] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);

  // Serving recalc
  const [servingAmount, setServingAmount] = useState(100);
  const [servingUnit, setServingUnit] = useState('grams');
  const [recalcLoading, setRecalcLoading] = useState(false);

  // AI Insights
  const [insightLoading, setInsightLoading] = useState('');
  const [insightText, setInsightText] = useState('');
  const [insightType, setInsightType] = useState('');

  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const logScanHistory = async (validNutri) => {
    if (!user || !validNutri) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'scans'), {
        name: validNutri.name,
        healthGrade: validNutri.healthGrade,
        summary: validNutri.summary,
        type: 'calories',
        scannedAt: serverTimestamp(),
      });
    } catch { /* offline/permission fallback */ }
  };

  const analyze = async (name, isPlate = false) => {
    setLoading(true);
    setError('');
    setResult(null);
    setInsightText('');
    try {
      const raw = await analyzeFoodNutrition(name, '100 grams', isPlate);
      const validated = validateNutrition(raw);
      if (!validated) throw new Error('Invalid response from AI.');
      setResult(validated);
      logScanHistory(validated);
    } catch (e) {
      setError(e.message || 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;
    analyze(q);
  };

  const handleImage = async (base64) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const items = await identifyFoodItems(base64);
      if (items.length > 1) {
        setDetectedItems(items);
        setShowItemModal(true);
        setLoading(false);
      } else {
        await analyze(items[0] || 'Food Item');
      }
    } catch (err) {
      console.warn('Food identification failed:', err);
      setError('Could not identify food. Try a clearer image.');
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleImage(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    setCameraError('');
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch { setCameraError('Camera unavailable.'); }
  };
  const closeCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setCameraOpen(false); };
  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    closeCamera();
    handleImage(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
  };

  const handleRecalc = async () => {
    if (!result) return;
    setRecalcLoading(true);
    try {
      const raw = await recalculateServing(result.name, servingAmount, servingUnit);
      const v = validateNutrition(raw);
      if (v) setResult(v);
    } catch (err) {
      console.warn('Recalculation error:', err);
      setError('Recalculation failed.');
    } finally {
      setRecalcLoading(false);
    }
  };

  const handleInsight = async (type) => {
    if (!result) return;
    setInsightLoading(type);
    setInsightText('');
    setInsightType(type);
    try {
      const text = await getAIInsight(result.name, type, result.nutrition);
      setInsightText(text);
    } catch {
      setInsightText('Could not generate insights. Please try again.');
    } finally {
      setInsightLoading('');
    }
  };

  const n = result?.nutrition;
  const isPlate = result?.name?.toLowerCase().includes('plate') || result?.name?.toLowerCase().includes('full');

  // Compute macro distribution percentages
  const proteinCal = (n?.protein || 0) * 4;
  const carbCal = (n?.carbs || 0) * 4;
  const fatCal = (n?.fat || 0) * 9;
  const totalMacroCal = (proteinCal + carbCal + fatCal) || 1;
  const proteinPct = Math.round((proteinCal / totalMacroCal) * 100);
  const carbPct = Math.round((carbCal / totalMacroCal) * 100);
  const fatPct = Math.round((fatCal / totalMacroCal) * 100);

  return (
    <PageWrapper style={{ background: '#F8FAF9', minHeight: '100vh', paddingBottom: '6rem' }}>
      <div style={{ maxWidth: 840, margin: '0 auto', padding: '2.5rem 1.25rem 1rem' }}>

        {/* Section Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: '#ECFDF5', border: '1px solid #A7F3D0',
            borderRadius: '99px', padding: '0.25rem 0.8rem', marginBottom: '0.75rem',
            fontSize: '0.74rem', fontWeight: 600, color: '#065F46',
          }}>
            <Activity size={13} /> Macronutrient & Calorie Intelligence
          </div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
            🥗 Calories Analysis
          </h1>
          <p style={{ color: '#4B5563', margin: 0, fontSize: '0.94rem' }}>
            Analyze any food — search by name, upload a meal photo, or calculate custom serving portions.
          </p>
        </div>

        {/* Search & Input Console */}
        <div className="card" style={{ marginBottom: '1.75rem', padding: '1.75rem', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '0.875rem',
            padding: '0.75rem 1.1rem', marginBottom: '1rem',
          }}>
            <Search size={19} color="#64748B" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Enter food name, e.g. Masala Dosa, Biryani, Idli..."
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontSize: '0.95rem', fontFamily: 'Inter, sans-serif', color: '#0F172A',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ background: '#E2E8F0', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn-primary" onClick={handleSearch} disabled={loading}
              style={{ flex: '1 1 120px', justifyContent: 'center', minWidth: 120 }}>
              {loading ? <Spinner size={16} color="white" /> : <><Search size={15} /> Analyze</>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <button
              className="btn-secondary" onClick={() => fileRef.current?.click()}
              style={{ flex: '1 1 120px', justifyContent: 'center', minWidth: 120 }}>
              <Upload size={15} /> Upload Image
            </button>
            <button
              className="btn-secondary" onClick={openCamera}
              style={{ flex: '1 1 120px', justifyContent: 'center', minWidth: 120 }}>
              <Camera size={15} /> Scan Camera
            </button>
            <button
              className="btn-secondary" onClick={() => setShowUrl(s => !s)}
              style={{ flex: '1 1 120px', justifyContent: 'center', minWidth: 120 }}>
              <Link size={15} /> Paste URL
            </button>
          </div>

          <AnimatePresence>
            {showUrl && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden', marginTop: '0.85rem' }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    value={url} onChange={e => setUrl(e.target.value)}
                    placeholder="Paste food/recipe URL here..."
                    style={{
                      flex: 1, border: '1.5px solid #CBD5E1', background: '#F8FAFC',
                      borderRadius: '0.75rem', padding: '0.65rem 1rem', outline: 'none',
                      fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', color: '#0F172A',
                    }}
                  />
                  <button className="btn-primary"
                    onClick={() => { if (url.trim()) { setQuery(url.trim()); setUrl(''); setShowUrl(false); handleSearch(); } }}>
                    Fetch
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: '0.875rem', padding: '1rem 1.25rem', marginBottom: '1.5rem',
            color: '#B91C1C', fontSize: '0.9rem',
          }}>{error}</div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4.5rem 1rem' }}>
            <div className="spinner" style={{ width: 44, height: 44, margin: '0 auto 1.25rem', borderWidth: 3.5 }} />
            <h3 style={{ color: '#0F172A', fontSize: '1.1rem', margin: '0 0 0.25rem' }}>Analyzing Nutritional Density…</h3>
            <p style={{ color: '#64748B', fontSize: '0.86rem' }}>Calculating macronutrients, sodium, and caloric ratios…</p>
          </div>
        )}

        {/* Result Dashboard */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Overview Summary */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <GradeBadge grade={result.healthGrade} size={84} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.4rem', color: '#0F172A' }}>{result.name}</h2>
                    <p style={{ margin: '0 0 0.75rem', color: '#4B5563', fontSize: '0.9rem', lineHeight: 1.6 }}>{result.summary}</p>
                    <span style={{
                      fontSize: '0.78rem', background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0',
                      borderRadius: '99px', padding: '0.2rem 0.75rem', fontWeight: 600,
                    }}>
                      Calories & Ingredient Analysis
                    </span>
                  </div>
                </div>
              </div>

              {/* Nutrition Breakdown & Macros */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0F172A' }}>📊 Nutrition Details</h2>
                  <span style={{ fontSize: '0.8rem', color: '#334155', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '99px', padding: '0.25rem 0.75rem', fontWeight: 600 }}>
                    Showing for: {n?.serving || '100g'}
                  </span>
                </div>

                {/* Primary Metric Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <NutritionCard label="Calories" value={n?.calories} unit="kcal" color="#DC2626" />
                  <NutritionCard label="Protein" value={`${n?.protein}g`} unit="protein" color="#059669" />
                  <NutritionCard label="Carbs" value={`${n?.carbs}g`} unit="carbohydrates" color="#D97706" />
                  <NutritionCard label="Fat" value={`${n?.fat}g`} unit="total fat" color="#EA580C" />
                  <NutritionCard label="Sodium" value={n?.sodium} unit="sodium" color="#7C3AED" />
                </div>

                {/* Macro Distribution Ratio Bar */}
                <div style={{ background: '#F8FAFC', borderRadius: '0.875rem', padding: '1.1rem', marginBottom: '1.25rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <PieChart size={15} color="#059669" /> Energy Distribution (% of calories)
                    </span>
                  </div>
                  {/* Visual Stacked Bar */}
                  <div style={{ height: 10, width: '100%', borderRadius: 99, display: 'flex', overflow: 'hidden', background: '#E2E8F0', marginBottom: '0.75rem' }}>
                    <div style={{ width: `${carbPct}%`, background: '#D97706', transition: 'width 0.4s' }} title={`Carbs: ${carbPct}%`} />
                    <div style={{ width: `${proteinPct}%`, background: '#059669', transition: 'width 0.4s' }} title={`Protein: ${proteinPct}%`} />
                    <div style={{ width: `${fatPct}%`, background: '#EA580C', transition: 'width 0.4s' }} title={`Fat: ${fatPct}%`} />
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.76rem', color: '#475569', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D97706' }} /> Carbs {carbPct}%
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} /> Protein {proteinPct}%
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EA580C' }} /> Fat {fatPct}%
                    </span>
                  </div>
                </div>

                {/* Recalculation Form */}
                <div style={{
                  background: '#F8FAF9', borderRadius: '0.875rem', padding: '1.1rem',
                  border: '1px solid rgba(14, 59, 46, 0.1)',
                }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '0.88rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Scale size={15} color="#0E3B2E" /> Calculate for a different serving size
                  </p>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="number" value={servingAmount} onChange={e => setServingAmount(e.target.value)}
                      min={1} style={{
                        width: 90, border: '1.5px solid #CBD5E1', background: '#FFFFFF', borderRadius: '0.65rem',
                        padding: '0.55rem 0.85rem', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#0F172A',
                      }} />
                    <select value={servingUnit} onChange={e => setServingUnit(e.target.value)} style={{
                      border: '1.5px solid #CBD5E1', background: '#FFFFFF', borderRadius: '0.65rem',
                      padding: '0.55rem 0.85rem', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#0F172A', cursor: 'pointer',
                    }}>
                      <option value="grams">grams</option>
                      <option value="piece">piece</option>
                      <option value="cup">cup</option>
                      <option value="tbsp">tbsp</option>
                    </select>
                    <button className="btn-primary"
                      onClick={handleRecalc} disabled={recalcLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.15rem' }}>
                      {recalcLoading ? <Spinner size={15} color="white" /> : <RefreshCw size={14} />}
                      Recalculate
                    </button>
                  </div>
                </div>
              </div>

              {/* Scientific Insights Console */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#0F172A' }}>🤖 AI Insights</h2>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <button
                    onClick={() => handleInsight('coach')} disabled={!!insightLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.45rem',
                      padding: '0.6rem 1.1rem', borderRadius: '0.75rem',
                      border: '1.5px solid',
                      borderColor: insightType === 'coach' && insightText ? '#A7F3D0' : '#E2E8F0',
                      background: insightType === 'coach' && insightText ? '#ECFDF5' : '#FFFFFF',
                      color: insightType === 'coach' && insightText ? '#065F46' : '#334155',
                      fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                    }}>
                    {insightLoading === 'coach' ? <Spinner size={14} /> : <Brain size={15} color="#059669" />} AI Health Coach
                  </button>
                  {isPlate && (
                    <button
                      onClick={() => handleInsight('improve')} disabled={!!insightLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.45rem',
                        padding: '0.6rem 1.1rem', borderRadius: '0.75rem',
                        border: '1.5px solid',
                        borderColor: insightType === 'improve' && insightText ? '#A7F3D0' : '#E2E8F0',
                        background: insightType === 'improve' && insightText ? '#ECFDF5' : '#FFFFFF',
                        color: insightType === 'improve' && insightText ? '#065F46' : '#334155',
                        fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                      }}>
                      {insightLoading === 'improve' ? <Spinner size={14} /> : <Lightbulb size={15} color="#D97706" />} Suggest Improvements
                    </button>
                  )}
                  {!isPlate && (
                    <button
                      onClick={() => handleInsight('recipe')} disabled={!!insightLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.45rem',
                        padding: '0.6rem 1.1rem', borderRadius: '0.75rem',
                        border: '1.5px solid',
                        borderColor: insightType === 'recipe' && insightText ? '#A7F3D0' : '#E2E8F0',
                        background: insightType === 'recipe' && insightText ? '#ECFDF5' : '#FFFFFF',
                        color: insightType === 'recipe' && insightText ? '#065F46' : '#334155',
                        fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                      }}>
                      {insightLoading === 'recipe' ? <Spinner size={14} /> : <ChefHat size={15} color="#2563EB" />} Recipe Idea
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {insightText && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <InfoCard>{insightText}</InfoCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Cleaner Alternatives */}
              {result.alternatives?.length > 0 && (
                <div className="card">
                  <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#0F172A' }}>✅ Healthier Alternatives</h2>
                  {result.alternatives.map((alt, i) => (
                    <div key={i} style={{
                      borderLeft: '4px solid #166534', paddingLeft: '1rem',
                      background: '#F0FDF4', borderRadius: '0 0.75rem 0.75rem 0',
                      border: '1px solid #BBF7D0', borderLeftWidth: 4,
                      padding: '0.85rem 1.15rem', marginBottom: '0.65rem',
                    }}>
                      <div style={{ fontWeight: 700, color: '#14532D', marginBottom: '0.2rem', fontSize: '0.94rem' }}>{alt.name}</div>
                      <div style={{ color: '#166534', fontSize: '0.85rem' }}>{alt.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Multi-item detection modal */}
      <ModalOverlay isOpen={showItemModal} onClose={() => setShowItemModal(false)} maxWidth="460px">
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0F172A' }}>🍽️ Multiple Items Detected!</h3>
        <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
          Our computer vision detected {detectedItems.length} distinct food items on this plate. Select an individual component or calculate the entire meal.
        </p>
        <button
          className="btn-primary"
          onClick={() => {
            setShowItemModal(false);
            analyze(detectedItems.join(', '), true);
          }}
          style={{ width: '100%', justifyContent: 'center', marginBottom: '0.85rem', padding: '0.8rem' }}>
          📊 Analyze Full Plate
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {detectedItems.map((item, i) => (
            <button key={i}
              onClick={() => { setShowItemModal(false); analyze(item); }}
              style={{
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: '0.75rem', padding: '0.75rem 1rem', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                color: '#1E293B', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
            >
              <span>{item}</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>→</span>
            </button>
          ))}
        </div>
      </ModalOverlay>

      {/* Camera scanner modal */}
      {cameraOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)', zIndex: 1001,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: '#0F172A', borderRadius: '1.25rem', overflow: 'hidden', width: '100%', maxWidth: 480, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>📷 Scan Food</span>
              <button onClick={closeCamera} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: 32, height: 32, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            {cameraError ? (
              <div style={{ padding: '2.5rem 1.5rem', color: '#FCA5A5', textAlign: 'center' }}>{cameraError}</div>
            ) : (
              <>
                <div style={{ position: 'relative', background: '#000000' }}>
                  <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block', maxHeight: '60vw', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: '15%', border: '2px dashed rgba(74, 222, 128, 0.7)', borderRadius: '1rem', pointerEvents: 'none' }} />
                </div>
                <div style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', background: '#0B132B' }}>
                  <button onClick={closeCamera} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)',
                    color: '#E2E8F0', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={capturePhoto} className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                    <Camera size={17} /> Capture & Analyze
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </PageWrapper>
  );
}
