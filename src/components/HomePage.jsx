// Home page – hero, category selector, search box, image/camera input
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Package, Droplets, Pill, Upload, Camera, X,
} from 'lucide-react';
import { Spinner } from './Shared.jsx';

const CATEGORIES = [
  { id: 'foods', label: 'Packaged Foods', icon: Package, placeholder: 'Search for biscuits, chips, noodles...' },
  { id: 'care', label: 'Personal Care', icon: Droplets, placeholder: 'Search for shampoo, lotion, creams...' },
  { id: 'health', label: 'Health Products', icon: Pill, placeholder: 'Search for supplements, vitamins...' },
];

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
      setCameraError('Camera access denied or unavailable.');
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
    <div style={{ minHeight: '100vh', background: '#F8F4F0', paddingBottom: '5rem' }}>
      {/* Hero */}
      <div style={{
        textAlign: 'center', padding: '4rem 1.5rem 2rem',
        background: 'linear-gradient(180deg, #ffffff 0%, #F8F4F0 100%)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(76,95,78,0.1)', borderRadius: '99px',
            padding: '0.35rem 1rem', marginBottom: '1.5rem',
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4C5F4E' }}>✨ AI-Powered Analysis</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 900,
            color: '#2C3E50',
            margin: '0 0 1rem',
            lineHeight: 1.1,
          }}
        >
          Analyze Your{' '}
          <span className="gradient-text">Products.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
            color: '#576574',
            maxWidth: 560,
            margin: '0 auto 2.5rem',
            lineHeight: 1.7,
          }}
        >
          Get instant AI analysis of packaged foods, personal care, and health products
          to understand their ingredients and potential risks.
        </motion.p>

        {/* Category selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            display: 'flex', gap: '0.75rem', justifyContent: 'center',
            flexWrap: 'wrap', marginBottom: '2rem',
          }}
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCategory(cat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.65rem 1.25rem', borderRadius: '0.85rem',
                  border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                  fontFamily: 'Inter, sans-serif',
                  background: active ? 'linear-gradient(135deg, #4C5F4E, #3a4e3c)' : 'white',
                  color: active ? 'white' : '#2C3E50',
                  boxShadow: active
                    ? '0 4px 20px rgba(76,95,78,0.35)'
                    : '0 2px 12px rgba(76,95,78,0.08)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={16} />
                {cat.label}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Search card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        style={{
          maxWidth: 680, margin: '0 auto', padding: '0 1.25rem',
        }}
      >
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Search bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: '#FAF8F5', border: '2px solid #e8e4e0',
            borderRadius: '1rem', padding: '0.75rem 1rem',
            marginBottom: '1rem', transition: 'border-color 0.2s',
          }}
            onFocus={e => e.currentTarget.style.borderColor = '#4C5F4E'}
            onBlur={e => e.currentTarget.style.borderColor = '#e8e4e0'}
          >
            <Search size={20} color="#576574" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={catData?.placeholder || 'Search products...'}
              style={{
                flex: 1, border: 'none', background: 'transparent', outline: 'none',
                fontSize: '1rem', color: '#2C3E50', fontFamily: 'Inter, sans-serif',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search query"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#576574', display: 'flex', padding: 0 }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <motion.button
            className="btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '1rem' }}
          >
            {loading ? <Spinner size={20} color="white" /> : <><Search size={18} /> Analyze Product</>}
          </motion.button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, height: 1, background: '#e8e4e0' }} />
            <span style={{ fontSize: '0.78rem', color: '#576574', whiteSpace: 'nowrap' }}>or scan with image</span>
            <div style={{ flex: 1, height: 1, background: '#e8e4e0' }} />
          </div>

          {/* Image buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageLoading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {imageLoading ? <Spinner size={16} /> : <Upload size={16} />}
              Upload Image
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="btn-secondary"
              onClick={openCamera}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Camera size={16} /> Scan with Camera
            </motion.button>
          </div>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {['AI Ingredient Analysis', 'Health Grading A–F', 'Safer Alternatives', 'Real-time Results'].map(f => (
            <span key={f} style={{
              background: 'white', border: '1px solid rgba(76,95,78,0.15)',
              borderRadius: '99px', padding: '0.3rem 0.85rem',
              fontSize: '0.78rem', color: '#576574', fontWeight: 500,
            }}>{f}</span>
          ))}
        </div>
      </motion.div>

      {/* Camera modal */}
      {cameraOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 1001, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#1a1a1a', borderRadius: '1.5rem',
              overflow: 'hidden', width: '100%', maxWidth: 480,
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ color: 'white', fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
                📸 Scan Product
              </span>
              <button onClick={closeCamera} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: 32, height: 32, color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} />
              </button>
            </div>

            {cameraError ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#E74C3C' }}>
                <p>{cameraError}</p>
                <button onClick={closeCamera} style={{
                  marginTop: '1rem', padding: '0.6rem 1.5rem', background: '#E74C3C',
                  color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600,
                }}>Close</button>
              </div>
            ) : (
              <>
                <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block', maxHeight: '65vw', objectFit: 'cover' }} />
                <div style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                  <button onClick={closeCamera} style={{
                    flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.1)',
                    color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600,
                  }}>Cancel</button>
                  <button onClick={capturePhoto} style={{
                    flex: 2, padding: '0.75rem',
                    background: 'linear-gradient(135deg, #4C5F4E, #3a4e3c)',
                    color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}>
                    <Camera size={18} /> Capture & Analyze
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
