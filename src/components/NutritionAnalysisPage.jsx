// Nutrition Analysis Page – food image recognition, plate analysis, serving recalculation, AI Insights
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Upload, Camera, Link, X, RefreshCw, Brain, Lightbulb, ChefHat,
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

  return (
    <PageWrapper style={{ background: '#F8F4F0', minHeight: '100vh', paddingBottom: '6rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.25rem 1rem' }}>

        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🥗 Calories Analysis</h1>
        <p style={{ color: '#576574', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Analyze any food — search by name, upload a photo, or paste a URL.
        </p>

        {/* Search box */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: '#FAF8F5', border: '2px solid #e8e4e0', borderRadius: '0.85rem',
            padding: '0.7rem 1rem', marginBottom: '0.85rem',
          }}>
            <Search size={18} color="#576574" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Enter food name, e.g. Masala Dosa, Biryani, Idli..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif', color: '#2C3E50' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="btn-primary" onClick={handleSearch} disabled={loading}
              style={{ flex: '1 1 120px', justifyContent: 'center', minWidth: 120 }}>
              {loading ? <Spinner size={16} color="white" /> : <><Search size={15} /> Analyze</>}
            </motion.button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="btn-secondary" onClick={() => fileRef.current?.click()}
              style={{ flex: '1 1 120px', justifyContent: 'center', minWidth: 120 }}>
              <Upload size={15} /> Upload Image
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="btn-secondary" onClick={openCamera}
              style={{ flex: '1 1 120px', justifyContent: 'center', minWidth: 120 }}>
              <Camera size={15} /> Scan Camera
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="btn-secondary" onClick={() => setShowUrl(s => !s)}
              style={{ flex: '1 1 120px', justifyContent: 'center', minWidth: 120 }}>
              <Link size={15} /> Paste URL
            </motion.button>
          </div>

          <AnimatePresence>
            {showUrl && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden', marginTop: '0.75rem' }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    value={url} onChange={e => setUrl(e.target.value)}
                    placeholder="Paste food/recipe URL here..."
                    style={{
                      flex: 1, border: '1.5px solid #e8e4e0', background: '#FAF8F5',
                      borderRadius: '0.75rem', padding: '0.65rem 1rem', outline: 'none',
                      fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', color: '#2C3E50',
                    }}
                  />
                  <motion.button whileHover={{ scale: 1.02 }} className="btn-primary"
                    onClick={() => { if (url.trim()) { setQuery(url.trim()); setUrl(''); setShowUrl(false); handleSearch(); } }}>
                    Fetch
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)',
            borderRadius: '1rem', padding: '1rem', marginBottom: '1rem', color: '#E74C3C',
          }}>{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              style={{ width: 56, height: 56, margin: '0 auto 1rem', borderRadius: '50%',
                border: '4px solid rgba(76,95,78,0.15)', borderTopColor: '#4C5F4E' }} />
            <p style={{ color: '#576574', fontWeight: 500 }}>🔬 Analyzing nutrition...</p>
          </div>
        )}

        {/* Result */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* Overview */}
              <div className="card" style={{ marginBottom: '1.25rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <GradeBadge grade={result.healthGrade} size={80} />
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem' }}>{result.name}</h2>
                    <p style={{ margin: '0 0 0.5rem', color: '#576574', fontSize: '0.88rem', lineHeight: 1.5 }}>{result.summary}</p>
                    <span style={{ fontSize: '0.8rem', background: 'rgba(76,95,78,0.1)', color: '#4C5F4E',
                      borderRadius: '99px', padding: '0.2rem 0.7rem', fontWeight: 600 }}>
                      Calories & Ingredient Analysis
                    </span>
                  </div>
                </div>
              </div>

              {/* Nutrition Details */}
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.1rem' }}>📊 Nutrition Details</h2>
                  <span style={{ fontSize: '0.8rem', color: '#576574', background: '#f0ece8', borderRadius: '99px', padding: '0.25rem 0.75rem' }}>
                    Showing for: {n?.serving || '100g'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <NutritionCard label="Calories" value={n?.calories} unit="kcal" color="#E74C3C" />
                  <NutritionCard label="Protein" value={`${n?.protein}g`} unit="protein" color="#4C5F4E" />
                  <NutritionCard label="Carbs" value={`${n?.carbs}g`} unit="carbohydrates" color="#F39C12" />
                  <NutritionCard label="Fat" value={`${n?.fat}g`} unit="total fat" color="#e67e22" />
                  <NutritionCard label="Sodium" value={n?.sodium} unit="sodium" color="#8e44ad" />
                </div>

                {/* Recalculation */}
                <div style={{
                  background: '#FAF8F5', borderRadius: '0.85rem', padding: '1rem',
                  border: '1px solid rgba(76,95,78,0.1)',
                }}>
                  <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '0.88rem', color: '#2C3E50' }}>
                    🔄 Calculate for a different serving size
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="number" value={servingAmount} onChange={e => setServingAmount(e.target.value)}
                      min={1} style={{
                        width: 80, border: '1.5px solid #e8e4e0', background: 'white', borderRadius: '0.65rem',
                        padding: '0.5rem 0.75rem', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#2C3E50',
                      }} />
                    <select value={servingUnit} onChange={e => setServingUnit(e.target.value)} style={{
                      border: '1.5px solid #e8e4e0', background: 'white', borderRadius: '0.65rem',
                      padding: '0.5rem 0.75rem', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#2C3E50', cursor: 'pointer',
                    }}>
                      <option value="grams">grams</option>
                      <option value="piece">piece</option>
                      <option value="cup">cup</option>
                      <option value="tbsp">tbsp</option>
                    </select>
                    <motion.button className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleRecalc} disabled={recalcLoading}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {recalcLoading ? <Spinner size={15} color="white" /> : <RefreshCw size={14} />}
                      Recalculate
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* AI Insights */}
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>🤖 AI Insights</h2>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => handleInsight('coach')} disabled={!!insightLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.45rem',
                      padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(76,95,78,0.25)',
                      background: insightType === 'coach' && insightText ? 'rgba(76,95,78,0.08)' : 'white',
                      color: '#4C5F4E', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>
                    {insightLoading === 'coach' ? <Spinner size={14} /> : <Brain size={14} />} AI Health Coach
                  </motion.button>
                  {isPlate && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleInsight('improve')} disabled={!!insightLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.45rem',
                        padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(76,95,78,0.25)',
                        background: insightType === 'improve' && insightText ? 'rgba(76,95,78,0.08)' : 'white',
                        color: '#4C5F4E', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}>
                      {insightLoading === 'improve' ? <Spinner size={14} /> : <Lightbulb size={14} />} Suggest Improvements
                    </motion.button>
                  )}
                  {!isPlate && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleInsight('recipe')} disabled={!!insightLoading}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.45rem',
                        padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1.5px solid rgba(76,95,78,0.25)',
                        background: insightType === 'recipe' && insightText ? 'rgba(76,95,78,0.08)' : 'white',
                        color: '#4C5F4E', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      }}>
                      {insightLoading === 'recipe' ? <Spinner size={14} /> : <ChefHat size={14} />} Recipe Idea
                    </motion.button>
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

              {/* Alternatives */}
              {result.alternatives?.length > 0 && (
                <div className="card">
                  <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>✅ Healthier Alternatives</h2>
                  {result.alternatives.map((alt, i) => (
                    <div key={i} style={{
                      borderLeft: '3px solid #4C5F4E', paddingLeft: '1rem',
                      background: 'rgba(76,95,78,0.04)', borderRadius: '0 0.75rem 0.75rem 0',
                      padding: '0.75rem 1rem', marginBottom: '0.5rem',
                    }}>
                      <div style={{ fontWeight: 600, color: '#2C3E50', marginBottom: '0.2rem' }}>{alt.name}</div>
                      <div style={{ color: '#576574', fontSize: '0.84rem' }}>{alt.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Multi-item modal */}
      <ModalOverlay isOpen={showItemModal} onClose={() => setShowItemModal(false)} maxWidth="440px">
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>🍽️ Multiple Items Detected!</h3>
        <p style={{ color: '#576574', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
          We found {detectedItems.length} items. What would you like to analyze?
        </p>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          className="btn-primary"
          onClick={() => {
            setShowItemModal(false);
            analyze(detectedItems.join(', '), true);
          }}
          style={{ width: '100%', justifyContent: 'center', marginBottom: '0.75rem' }}>
          📊 Analyze Full Plate
        </motion.button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {detectedItems.map((item, i) => (
            <motion.button key={i} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={() => { setShowItemModal(false); analyze(item); }}
              style={{
                background: '#FAF8F5', border: '1.5px solid rgba(76,95,78,0.15)',
                borderRadius: '0.75rem', padding: '0.7rem 1rem', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                color: '#2C3E50', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
              <span style={{ color: '#4C5F4E', fontWeight: 700 }}>→</span> {item}
            </motion.button>
          ))}
        </div>
      </ModalOverlay>

      {/* Camera modal */}
      {cameraOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1001,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: '#1a1a1a', borderRadius: '1.5rem', overflow: 'hidden', width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ color: 'white', fontWeight: 600 }}>📷 Scan Food</span>
              <button onClick={closeCamera} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: 32, height: 32, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            {cameraError ? (
              <div style={{ padding: '2rem', color: '#E74C3C', textAlign: 'center' }}>{cameraError}</div>
            ) : (
              <>
                <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block', maxHeight: '60vw', objectFit: 'cover' }} />
                <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                  <button onClick={closeCamera} style={{ flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)',
                    color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={capturePhoto} style={{ flex: 2, padding: '0.75rem',
                    background: 'linear-gradient(135deg, #4C5F4E, #3a4e3c)', color: 'white', border: 'none',
                    borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Camera size={18} /> Capture & Analyze
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
