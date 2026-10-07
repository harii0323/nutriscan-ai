// Home page – hero, category selector, search box, image/camera input, trust metrics
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Package, Droplets, Pill, Upload, Camera, X,
  ShieldCheck, AlertCircle, CheckCircle2,
  TrendingUp, Layers, Award
} from 'lucide-react';
import { Spinner } from './Shared.jsx';

const CATEGORIES = [
  { id: 'foods', label: 'Packaged Foods', icon: Package, placeholder: 'Search for biscuits, chips, noodles...' },
  { id: 'care', label: 'Personal Care', icon: Droplets, placeholder: 'Search for shampoo, lotion, creams...' },
  { id: 'health', label: 'Health Products', icon: Pill, placeholder: 'Search for supplements, vitamins...' },
];

const SAMPLE_QUERIES = {
  foods: ['Maggi 2-Minute Noodles', 'Nutella Hazelnut Spread', 'Oatly Barista Oat Milk', 'Lay’s Classic Potato Chips'],
  care: ['CeraVe Hydrating Cleanser', 'Dove Deep Moisture Body Wash', 'Head & Shoulders Shampoo'],
  health: ['Optimum Nutrition Gold Whey', 'Multivitamin Daily Gummies', 'Omega-3 Fish Oil 1000mg'],
};

export default function HomePage({ onNavigate }) {
  const [category, setCategory] = useState('foods');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const catData = CATEGORIES.find(c => c.id === category);

  const handleSearch = async (q = query) => {
    const trimmed = (q || '').trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      onNavigate('details', { query: trimmed, type: category });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Image upload → base64 → AI identify
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      onNavigate('details', { imageBase64: base64, type: category, fromImage: true });
      setImageLoading(false);
    };
    reader.onerror = () => setImageLoading(false);
    reader.readAsDataURL(file);
  };

  // Camera
  const openCamera = async () => {
    setCameraError('');
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError('Camera access denied or unavailable on this device.');
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    closeCamera();
    onNavigate('details', { imageBase64: base64, type: category, fromImage: true });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAF9', paddingBottom: '4rem' }}>
      {/* ── Hero Section ────────────────────────────────────────────────── */}
      <section style={{
        textAlign: 'center', padding: '3.5rem 1.5rem 2.5rem',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAF9 100%)',
        borderBottom: '1px solid rgba(15, 23, 42, 0.05)',
        position: 'relative',
      }}>
        {/* Trust Pill */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            background: '#ECFDF5', border: '1px solid #A7F3D0',
            borderRadius: '99px', padding: '0.35rem 0.95rem', marginBottom: '1.25rem',
            boxShadow: '0 1px 2px rgba(5, 150, 105, 0.08)',
          }}
        >
          <ShieldCheck size={14} color="#059669" />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46', letterSpacing: '-0.01em' }}>
            Independent Nutritional & Ingredient Safety Intelligence
          </span>
        </motion.div>

        {/* Hero Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 3.75rem)',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 800,
            color: '#0F172A',
            margin: '0 0 1rem',
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
          }}
        >
          Analyze Your{' '}
          <span className="gradient-text">Products.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16 }}
          style={{
            fontSize: 'clamp(0.95rem, 1.8vw, 1.125rem)',
            color: '#4B5563',
            maxWidth: 620,
            margin: '0 auto 2.25rem',
            lineHeight: 1.65,
          }}
        >
          Identify hidden preservatives, ultra-processed additives, and toxic chemicals across packaged foods, cosmetics, and wellness supplements.
        </motion.p>

        {/* Category Selector Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          style={{
            display: 'inline-flex', gap: '0.4rem', justifyContent: 'center',
            background: '#F1F5F9', padding: '0.35rem', borderRadius: '0.9rem',
            border: '1px solid #E2E8F0', marginBottom: '2rem', flexWrap: 'wrap',
          }}
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.6rem 1.25rem', borderRadius: '0.65rem',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
                  fontFamily: 'Inter, sans-serif',
                  background: active ? '#0E3B2E' : 'transparent',
                  color: active ? '#FFFFFF' : '#475569',
                  boxShadow: active ? '0 2px 6px rgba(14, 59, 46, 0.2)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Icon size={16} color={active ? '#FFFFFF' : '#64748B'} />
                {cat.label}
              </button>
            );
          })}
        </motion.div>
      </section>

      {/* ── Search & Scan Control Panel ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.28 }}
        style={{
          maxWidth: 720, margin: '-1.5rem auto 0', padding: '0 1.25rem', position: 'relative', zIndex: 10,
        }}
      >
        <div className="card" style={{ padding: '1.75rem', boxShadow: '0 12px 36px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03)' }}>
          {/* Search input field */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: '#F8FAFC', border: '1.5px solid #CBD5E1',
            borderRadius: '0.875rem', padding: '0.8rem 1.1rem',
            marginBottom: '1rem', transition: 'border-color 0.18s, box-shadow 0.18s',
          }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#0E3B2E';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 59, 46, 0.1)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Search size={20} color="#64748B" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={catData?.placeholder || 'Search products...'}
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontSize: '0.98rem', color: '#0F172A', fontFamily: 'Inter, sans-serif',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search query"
                style={{ background: '#E2E8F0', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick-Scan Suggestions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <TrendingUp size={12} /> Try:
            </span>
            {(SAMPLE_QUERIES[category] || SAMPLE_QUERIES.foods).map((item) => (
              <button
                key={item}
                onClick={() => { setQuery(item); handleSearch(item); }}
                style={{
                  background: '#F1F5F9', border: '1px solid #E2E8F0',
                  borderRadius: '99px', padding: '0.2rem 0.65rem',
                  fontSize: '0.75rem', color: '#334155', fontWeight: 500,
                  cursor: 'pointer', transition: 'background-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
                onMouseLeave={e => e.currentTarget.style.background = '#F1F5F9'}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Action button */}
          <button
            className="btn-primary"
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.96rem' }}
          >
            {loading ? <Spinner size={20} color="white" /> : <><Search size={18} /> Analyze Product</>}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              or scan package directly
            </span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          {/* Visual Input Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            <button
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
              style={{ flex: '1 1 200px', justifyContent: 'center' }}
            >
              {imageLoading ? <Spinner size={16} /> : <Upload size={16} />}
              Upload Image
            </button>
            <button
              className="btn-secondary"
              onClick={openCamera}
              style={{ flex: '1 1 200px', justifyContent: 'center' }}
            >
              <Camera size={16} /> Scan with Camera
            </button>
          </div>
        </div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {['AI Ingredient Analysis', 'Health Grading A–F', 'Safer Alternatives', 'Real-time Results'].map(f => (
            <span key={f} style={{
              background: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: '99px', padding: '0.35rem 0.95rem',
              fontSize: '0.78rem', color: '#475569', fontWeight: 500,
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
            }}>{f}</span>
          ))}
        </div>
      </motion.div>

      {/* ── Scientific Methodology Overview (Enterprise Polish) ─────────── */}
      <section style={{ maxWidth: 1040, margin: '4rem auto 0', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', color: '#0F172A', margin: '0 0 0.5rem' }}>
            How NutriScan Evaluates Safety
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.92rem', maxWidth: 540, margin: '0 auto' }}>
            Every product is analyzed against established international nutrition guidelines and chemical toxicology databases.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Card 1 */}
          <div className="card card-hover" style={{ padding: '1.75rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '0.75rem', background: '#ECFDF5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.1rem',
            }}>
              <Layers size={22} color="#059669" />
            </div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: '#0F172A' }}>
              Additive & Chemical Profiling
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.86rem', lineHeight: 1.65, margin: 0 }}>
              We cross-examine emulsifiers, preservatives, and synthetic aromas against FSSAI and EFSA toxicology indices to flag suspected endocrine disruptors.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card card-hover" style={{ padding: '1.75rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '0.75rem', background: '#FEF3C7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.1rem',
            }}>
              <Award size={22} color="#D97706" />
            </div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: '#0F172A' }}>
              Objective A–F Scoring
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.86rem', lineHeight: 1.65, margin: 0 }}>
              Transparent grading computed from sodium density, refined sugars, saturated fat ratios, and NOVA food processing classifications.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card card-hover" style={{ padding: '1.75rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: '0.75rem', background: '#EFF6FF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.1rem',
            }}>
              <CheckCircle2 size={22} color="#2563EB" />
            </div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem', color: '#0F172A' }}>
              Cleaner Alternatives
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.86rem', lineHeight: 1.65, margin: 0 }}>
              Discover whole-food or minimally processed substitute products with verified clean ingredient profiles and zero artificial additives.
            </p>
          </div>
        </div>
      </section>

      {/* ── Camera Scanner Modal ────────────────────────────────────────── */}
      {cameraOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 1001, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#0F172A', borderRadius: '1.25rem',
              overflow: 'hidden', width: '100%', maxWidth: 480,
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ color: '#F8FAFC', fontWeight: 600, fontFamily: 'Outfit, sans-serif', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={18} color="#4ADE80" /> Scan Product Package
              </span>
              <button onClick={closeCamera} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: 32, height: 32, color: '#CBD5E1', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} />
              </button>
            </div>

            {cameraError ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#FCA5A5' }}>
                <AlertCircle size={36} style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem' }}>{cameraError}</p>
                <button onClick={closeCamera} className="btn-secondary" style={{ padding: '0.6rem 1.5rem' }}>
                  Close
                </button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', background: '#000000' }}>
                  <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block', maxHeight: '60vw', objectFit: 'cover' }} />
                  {/* Visual reticle overlay */}
                  <div style={{
                    position: 'absolute', inset: '15%',
                    border: '2px dashed rgba(74, 222, 128, 0.7)',
                    borderRadius: '1rem', pointerEvents: 'none',
                  }} />
                </div>
                <div style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', background: '#0B132B' }}>
                  <button onClick={closeCamera} style={{
                    flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.08)',
                    color: '#E2E8F0', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600,
                  }}>
                    Cancel
                  </button>
                  <button onClick={capturePhoto} className="btn-primary" style={{
                    flex: 2, padding: '0.75rem', justifyContent: 'center',
                  }}>
                    <Camera size={17} /> Capture & Analyze
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
