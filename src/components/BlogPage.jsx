// Health & Nutrition Blog page – Editorial research & consumer intelligence
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, CheckCircle, Clock, ShieldCheck, BookOpen, Search } from 'lucide-react';
import { PageWrapper, ModalOverlay } from './Shared.jsx';

const ARTICLES = [
  {
    id: 1,
    category: 'Food Safety',
    date: 'Sep 28, 2026',
    readTime: '5 min read',
    title: 'Understanding Food Labels in India',
    excerpt: 'Decoding FSSAI labels, ingredient lists, and nutritional tables on Indian packaged foods: what to look for and what to avoid.',
    color: '#0E3B2E',
    content: `Packaged food sales in India have grown significantly over the last decade. However, deciphering what actually goes into processed items remains critical.

Key things to check on Indian food labels:
1. The Ingredient Order: Ingredients are listed in descending order by weight. If sugar, palm oil, or refined wheat flour (maida) are in the top 3, the product is primarily processed carbs and fats.
2. Hidden Sugars: Watch out for maltodextrin, high-fructose corn syrup, inverted sugar syrup, dextrose, and malt extract.
3. Sodium & Serving Sizes: Many nutrition tables report values "per 100g", whereas a single pack might be 250g or only 30g. Always calculate per actual serving consumed.
4. Food Additives: Look out for artificial flavor enhancers like INS 621 (MSG) or preservatives like Sodium Benzoate (INS 211).

Pro Tip: Use NutriScan AI's camera scanner to evaluate any packaged item before putting it into your shopping cart!`,
  },
  {
    id: 2,
    category: 'Nutrition',
    date: 'Sep 20, 2026',
    readTime: '4 min read',
    title: "The Truth About 'Sugar-Free' Claims",
    excerpt: "Sugar-free does not mean calorie-free. Artificial sweeteners, hidden sugars, and the marketing strategies that confuse consumers every day.",
    color: '#DC2626',
    content: `Many beverages and sweets marketed as 'zero sugar' replace sucrose with non-nutritive sweeteners such as sucralose, aspartame, or acesulfame potassium.

What science tells us:
• Gut Microbiome Impact: Certain non-nutritive sweeteners have been linked in clinical studies to alterations in beneficial gut flora.
• Sugar Alcohols (Polyols): Sorbitol, maltitol, and erythritol can cause digestive distress and bloating if consumed in excess.
• Calorie Compensation: Studies show that consuming artificial sweeteners can trigger cravings for high-calorie foods later in the day.

Healthier Swaps: Choose natural whole foods, fresh fruits, or beverages infused with mint, lemon, or cucumber instead of artificial zero-sugar soft drinks.`,
  },
  {
    id: 3,
    category: 'Personal Care',
    date: 'Sep 12, 2026',
    readTime: '6 min read',
    title: 'Navigating Personal Care Ingredients',
    excerpt: 'Parabens, sulphates, phthalates: a complete guide to identifying harmful chemicals in your skincare, haircare, and cosmetic products.',
    color: '#7C3AED',
    content: `Your skin is your largest organ, absorbing a significant percentage of topical products. Here is our quick safety checklist:

1. Parabens (Methylparaben, Propylparaben): Used as preservatives; known endocrine disruptors. Look for "paraben-free" certified labels.
2. Sulphates (SLS / SLES): Harsh detergents that strip the skin's natural moisture barrier, often leading to dermatitis or scalp irritation.
3. Synthetic Fragrances ('Parfum'): A catch-all term that can conceal hundreds of undisclosed phthalates.

NutriScan Care Scanner classifies all cosmetic ingredients according to international INCI safety indices.`,
  },
  {
    id: 4,
    category: 'Wellness',
    date: 'Sep 5, 2026',
    readTime: '5 min read',
    title: 'Supplements: What Science Actually Says',
    excerpt: 'The booming supplement industry promises everything. Here is what clinical evidence confirms and what is pure marketing hype.',
    color: '#2563EB',
    content: `While multivitamin gummies and herbal extracts flood the shelves, evidence suggests whole food nutrition outperforms synthetic pills for most healthy individuals.

Proven Supplements:
• Vitamin D3: Essential if you have limited sun exposure; blood test verification is recommended.
• Vitamin B12: Critical for strict vegetarians and vegans.
• Omega-3 EPA/DHA: Proven support for cardiovascular health and inflammation reduction.

Always consult your physician before starting high-dose supplement regimens.`,
  },
  {
    id: 5,
    category: 'Clean Eating',
    date: 'Aug 29, 2026',
    readTime: '4 min read',
    title: '10 Ultra-Processed Foods You Should Limit',
    excerpt: 'Ultra-processed foods now make up more than 50% of calories in many households. Here are the key culprits and better swaps.',
    color: '#D97706',
    content: `Ultra-processed foods (Nova Group 4) undergo multiple industrial processes and contain formulations of industrial ingredients like hydrogenated oils, emulsifiers, and modified starches.

The top culprits:
1. Instant packaged noodles
2. Commercial white bread and rusks
3. Flavored breakfast cereals
4. Soda and packaged fruit drinks
5. Processed meat sausages

Simple swaps: Switch to rolled oats, boiled sprouts, homemade paneer, and seasonal fresh fruits.`,
  },
  {
    id: 6,
    category: 'Cooking',
    date: 'Aug 22, 2026',
    readTime: '7 min read',
    title: 'Healthy Indian Cooking Oils: A Complete Guide',
    excerpt: 'Cold-pressed mustard, coconut, sesame: which oils are genuinely healthy and which ones are just expensive marketing?',
    color: '#059669',
    content: `Cooking oils differ in their fatty acid composition (MUFA, PUFA, SFA) and smoke point.

Our breakdown:
• Cold-Pressed Mustard Oil: High MUFA content, ideal smoke point for Indian curries and tadka.
• Extra Virgin Coconut Oil: Rich in Lauric acid (MCTs); great for South Indian cooking and gentle heating.
• Pure Ghee: High smoke point, rich in fat-soluble vitamins (A, D, E), but calorie-dense so moderation is key.
• Refined Seed Oils: Highly chemically processed with hexane; best minimized in everyday home cooking.`,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function BlogPage({ onNavigate }) {
  const [activeArticle, setActiveArticle] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    setNewsletterError('');
    const email = newsletterEmail.trim();
    if (!email || !email.includes('@')) {
      setNewsletterError('Please enter a valid email address.');
      return;
    }
    setNewsletterSubscribed(true);
    setNewsletterEmail('');
  };

  return (
    <PageWrapper style={{ background: '#F8FAF9', minHeight: '100vh', paddingBottom: '6rem' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '2.5rem 1.25rem' }}>

        {/* Editorial Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '99px',
              padding: '0.3rem 0.9rem', marginBottom: '1rem',
            }}
          >
            <BookOpen size={14} color="#059669" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#065F46' }}>
              Evidence-Based Nutritional Research
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 2.75rem)', margin: '0 0 0.75rem', color: '#0F172A', letterSpacing: '-0.02em' }}>
            Health & Nutrition Blog
          </h1>
          <p style={{ color: '#4B5563', maxWidth: 580, margin: '0 auto', fontSize: '0.98rem', lineHeight: 1.65 }}>
            Stay informed with our latest articles on clean eating, safe products, and healthy living.
          </p>
        </div>

        {/* Featured Article Hero Card */}
        <div
          className="card card-hover"
          onClick={() => setActiveArticle(ARTICLES[0])}
          style={{
            marginBottom: '2.5rem', padding: 0, overflow: 'hidden', cursor: 'pointer',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.05)',
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #0E3B2E 0%, #166534 100%)',
            padding: '2.5rem',
            color: '#FFFFFF',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{
                background: '#ECFDF5', color: '#065F46', borderRadius: '99px',
                padding: '0.2rem 0.75rem', fontSize: '0.74rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>{ARTICLES[0].category}</span>
              <span style={{ color: '#CBD5E1', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={13} /> {ARTICLES[0].date}
              </span>
              <span style={{ color: '#A7F3D0', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={13} /> {ARTICLES[0].readTime}
              </span>
            </div>
            <h2 style={{ margin: '0 0 1rem', fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              {ARTICLES[0].title}
            </h2>
            <p style={{ margin: '0 0 1.75rem', color: '#E2E8F0', lineHeight: 1.7, maxWidth: 720, fontSize: '1rem' }}>
              {ARTICLES[0].excerpt}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveArticle(ARTICLES[0]); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: '#FFFFFF', color: '#0E3B2E', border: 'none',
                borderRadius: '0.75rem', padding: '0.65rem 1.4rem',
                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              Read More <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Article Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {ARTICLES.slice(1).map((article) => (
            <motion.div
              key={article.id}
              variants={item}
              onClick={() => setActiveArticle(article)}
              className="card card-hover"
              style={{
                cursor: 'pointer', padding: 0, overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                border: '1px solid rgba(15, 23, 42, 0.08)',
              }}
            >
              {/* Clean category header bar */}
              <div style={{ height: 4, background: article.color }} />
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                  <span style={{
                    background: `${article.color}14`, color: article.color,
                    border: `1px solid ${article.color}30`,
                    borderRadius: '99px', padding: '0.15rem 0.65rem', fontSize: '0.72rem', fontWeight: 700,
                  }}>{article.category}</span>
                  <span style={{ color: '#64748B', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={11} /> {article.date}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 0.65rem', fontSize: '1.1rem', lineHeight: 1.35, color: '#0F172A', fontWeight: 700 }}>
                  {article.title}
                </h3>
                <p style={{ margin: '0 0 1.25rem', color: '#4B5563', fontSize: '0.86rem', lineHeight: 1.6, flex: 1 }}>
                  {article.excerpt}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveArticle(article); }}
                  style={{
                    background: 'none', border: 'none', color: article.color, fontWeight: 700,
                    fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                    fontFamily: 'Inter, sans-serif', padding: 0, marginTop: 'auto',
                  }}
                >
                  Read More <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Newsletter Editorial CTA */}
        <div
          style={{
            marginTop: '3.5rem', background: '#0E3B2E',
            borderRadius: '1.25rem', padding: '3rem 2rem', textAlign: 'center', color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 48px -12px rgba(14, 59, 46, 0.3)',
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
          }}>
            <ShieldCheck size={22} color="#86EFAC" />
          </div>
          <h2 style={{ margin: '0 0 0.5rem', color: '#FFFFFF', fontSize: '1.6rem', fontFamily: 'Outfit, sans-serif' }}>
            Stay Updated
          </h2>
          <p style={{ margin: '0 auto 1.75rem', color: '#CBD5E1', fontSize: '0.94rem', maxWidth: 460, lineHeight: 1.6 }}>
            Get the latest nutrition tips and product safety alerts in your inbox. No marketing fluff: only peer-reviewed insights.
          </p>

          {newsletterSubscribed ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '0.875rem', padding: '1.1rem 1.75rem', maxWidth: 440, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
              }}
            >
              <CheckCircle size={20} color="#4ADE80" />
              <span style={{ fontWeight: 600, fontSize: '0.94rem', color: '#FFFFFF' }}>
                You're subscribed! Welcome to our wellness community.
              </span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0.6rem', maxWidth: 460, margin: '0 auto', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder="Your email address"
                aria-label="Newsletter email address"
                required
                style={{
                  flex: '1 1 240px', border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)',
                  borderRadius: '0.75rem', padding: '0.75rem 1.1rem', outline: 'none', color: '#FFFFFF',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.92rem',
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#FFFFFF', color: '#0E3B2E', border: 'none', borderRadius: '0.75rem',
                  padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  fontSize: '0.92rem', transition: 'background-color 0.15s',
                }}
              >
                Subscribe
              </button>
              {newsletterError && (
                <div style={{ width: '100%', color: '#FCA5A5', fontSize: '0.82rem', marginTop: '0.35rem', textAlign: 'left' }}>
                  {newsletterError}
                </div>
              )}
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.76rem', color: '#94A3B8', textAlign: 'center', width: '100%' }}>
                By subscribing, you agree to receive editorial research digests. You can unsubscribe at any time. View our{' '}
                <button
                  type="button"
                  onClick={() => onNavigate?.('privacy')}
                  style={{ background: 'none', border: 'none', color: '#86EFAC', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                >
                  Privacy Policy
                </button>.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Article Detail Reading Modal */}
      <ModalOverlay isOpen={Boolean(activeArticle)} onClose={() => setActiveArticle(null)} maxWidth="680px">
        {activeArticle && (
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                background: activeArticle.color, color: 'white', borderRadius: '99px',
                padding: '0.25rem 0.85rem', fontSize: '0.76rem', fontWeight: 700,
              }}>{activeArticle.category}</span>
              <span style={{ color: '#64748B', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={13} /> {activeArticle.date}
              </span>
              <span style={{ color: '#64748B', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={13} /> {activeArticle.readTime || '5 min read'}
              </span>
            </div>
            <h2 style={{ margin: '0 0 1.25rem', fontSize: '1.65rem', color: '#0F172A', lineHeight: 1.3, letterSpacing: '-0.02em' }}>
              {activeArticle.title}
            </h2>
            <div style={{
              color: '#334155', fontSize: '0.96rem', lineHeight: 1.8,
              whiteSpace: 'pre-wrap', marginBottom: '2rem',
              borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem',
            }}>
              {activeArticle.content || activeArticle.excerpt}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
              <button
                className="btn-primary"
                onClick={() => { setActiveArticle(null); onNavigate?.('home'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
              >
                <Search size={15} /> Analyze a Product Now
              </button>
              <button
                className="btn-secondary"
                onClick={() => setActiveArticle(null)}
              >
                Close Article
              </button>
            </div>
          </div>
        )}
      </ModalOverlay>
    </PageWrapper>
  );
}
