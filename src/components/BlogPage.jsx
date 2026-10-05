// Health & Nutrition Blog page
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, CheckCircle } from 'lucide-react';
import { PageWrapper, ModalOverlay } from './Shared.jsx';

const ARTICLES = [
  {
    id: 1,
    category: 'Food Safety',
    date: 'Sep 28, 2026',
    title: 'Understanding Food Labels in India',
    excerpt: 'Decoding FSSAI labels, ingredient lists, and nutritional tables on Indian packaged foods — what to look for and what to avoid.',
    color: '#4C5F4E',
    emoji: '🏷️',
    content: `Packaged food sales in India have grown more than 300% over the last decade. However, deciphering what actually goes into processed items remains tricky.

Key things to check on Indian food labels:
1. The Ingredient Order: Ingredients are listed in descending order by weight. If sugar, palm oil, or refined wheat flour (maida) are in the top 3, the product is primarily processed carbs and fats.
2. Hidden Sugars: Watch out for maltodextrin, high-fructose corn syrup, inverted sugar syrup, dextrose, and malt extract.
3. Sodium & Serving Sizes: Many nutrition tables report values "per 100g", whereas a single pack might be 250g or only 30g. Always calculate per actual serving consumed.
4. Food Additives: Look out for artificial flavor enhancers like INS 621 (MSG) or preservatives like Sodium Benzoate (INS 211).

Pro Tip: Use NutriScan AI's camera scanner to instantly grade any packaged item before putting it into your shopping cart!`,
  },
  {
    id: 2,
    category: 'Nutrition',
    date: 'Sep 20, 2026',
    title: "The Truth About 'Sugar-Free' Claims",
    excerpt: "Sugar-free doesn't mean calorie-free. Artificial sweeteners, hidden sugars, and the marketing tricks that fool consumers every day.",
    color: '#E74C3C',
    emoji: '🍬',
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
    title: 'Navigating Personal Care Ingredients',
    excerpt: 'Parabens, sulphates, phthalates — a complete guide to identifying harmful chemicals in your skincare, haircare, and cosmetic products.',
    color: '#8e44ad',
    emoji: '🧴',
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
    title: 'Supplements: What Science Actually Says',
    excerpt: 'The booming supplement industry promises everything. Here is what clinical evidence confirms — and what is pure marketing hype.',
    color: '#2980b9',
    emoji: '💊',
    content: `While multivitamin gummies and herbal extracts flood the shelves, evidence suggests whole-food nutrition outperforms synthetic pills for most healthy individuals.

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
    title: '10 Ultra-Processed Foods You Should Limit',
    excerpt: 'Ultra-processed foods now make up more than 50% of calories in many Indian households. Here are the key culprits and better swaps.',
    color: '#F39C12',
    emoji: '🛒',
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
    title: 'Healthy Indian Cooking Oils — A Complete Guide',
    excerpt: "Cold-pressed mustard, coconut, sesame — which oils are genuinely healthy and which ones are just expensive marketing?",
    color: '#27AE60',
    emoji: '🫙',
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
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
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
    <PageWrapper style={{ background: '#F8F4F0', minHeight: '100vh', paddingBottom: '6rem' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(76,95,78,0.1)', borderRadius: '99px',
              padding: '0.35rem 1rem', marginBottom: '1rem',
            }}
          >
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#4C5F4E' }}>📰 Latest Articles</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', margin: '0 0 0.75rem' }}
          >
            Health & Nutrition Blog
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ color: '#576574', maxWidth: 520, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.7 }}
          >
            Stay informed with our latest articles on clean eating, safe products, and healthy living.
          </motion.p>
        </div>

        {/* Featured article */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card card-hover"
          onClick={() => setActiveArticle(ARTICLES[0])}
          style={{ marginBottom: '2rem', padding: 0, overflow: 'hidden', cursor: 'pointer' }}
          whileHover={{ y: -3 }}
        >
          <div style={{
            background: `linear-gradient(135deg, ${ARTICLES[0].color}22, ${ARTICLES[0].color}08)`,
            padding: '2.5rem',
            borderBottom: `4px solid ${ARTICLES[0].color}`,
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{ARTICLES[0].emoji}</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: ARTICLES[0].color, color: 'white', borderRadius: '99px',
                padding: '0.2rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
              }}>{ARTICLES[0].category}</span>
              <span style={{ color: '#576574', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={12} /> {ARTICLES[0].date}
              </span>
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem' }}>{ARTICLES[0].title}</h2>
            <p style={{ margin: '0 0 1.5rem', color: '#576574', lineHeight: 1.7 }}>{ARTICLES[0].excerpt}</p>
            <motion.button
              whileHover={{ scale: 1.04, x: 4 }} whileTap={{ scale: 0.97 }}
              onClick={(e) => { e.stopPropagation(); setActiveArticle(ARTICLES[0]); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: ARTICLES[0].color, color: 'white', border: 'none',
                borderRadius: '0.75rem', padding: '0.6rem 1.25rem',
                fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Read More <ArrowRight size={14} />
            </motion.button>
          </div>
        </motion.div>

        {/* Article grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {ARTICLES.slice(1).map((article) => (
            <motion.div
              key={article.id}
              variants={item}
              whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(76,95,78,0.15)' }}
              onClick={() => setActiveArticle(article)}
              className="card"
              style={{ cursor: 'pointer', padding: 0, overflow: 'hidden', transition: 'box-shadow 0.2s' }}
            >
              {/* Color top bar */}
              <div style={{
                height: 6,
                background: `linear-gradient(90deg, ${article.color}, ${article.color}99)`,
              }} />
              <div style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{article.emoji}</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{
                    background: `${article.color}18`, color: article.color,
                    border: `1px solid ${article.color}33`,
                    borderRadius: '99px', padding: '0.15rem 0.65rem', fontSize: '0.72rem', fontWeight: 600,
                  }}>{article.category}</span>
                  <span style={{ color: '#576574', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Calendar size={10} /> {article.date}
                  </span>
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', lineHeight: 1.4 }}>{article.title}</h3>
                <p style={{ margin: '0 0 1.25rem', color: '#576574', fontSize: '0.83rem', lineHeight: 1.6 }}>
                  {article.excerpt.slice(0, 110)}…
                </p>
                <motion.button
                  whileHover={{ x: 3 }}
                  onClick={(e) => { e.stopPropagation(); setActiveArticle(article); }}
                  style={{
                    background: 'none', border: 'none', color: article.color, fontWeight: 600,
                    fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                    fontFamily: 'Inter, sans-serif', padding: 0,
                  }}
                >
                  Read More <ArrowRight size={13} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Newsletter CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          style={{
            marginTop: '3rem', background: 'linear-gradient(135deg, #4C5F4E 0%, #3a4e3c 100%)',
            borderRadius: '1.5rem', padding: '2.5rem', textAlign: 'center', color: 'white',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📬</div>
          <h2 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: '1.4rem' }}>Stay Updated</h2>
          <p style={{ margin: '0 0 1.5rem', opacity: 0.8, fontSize: '0.9rem' }}>
            Get the latest nutrition tips and product safety alerts in your inbox.
          </p>

          {newsletterSubscribed ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                background: 'rgba(255,255,255,0.15)', borderRadius: '1rem',
                padding: '1rem 1.5rem', maxWidth: 420, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              <CheckCircle size={20} color="#2ECC71" />
              <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                🎉 You're subscribed! Welcome to our wellness community.
              </span>
            </motion.div>
          ) : (
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0.6rem', maxWidth: 420, margin: '0 auto', flexWrap: 'wrap' }}>
              <input
                type="email"
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder="Your email address"
                aria-label="Newsletter email address"
                required
                style={{
                  flex: 1, border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)',
                  borderRadius: '0.75rem', padding: '0.7rem 1rem', outline: 'none', color: 'white',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', minWidth: 200,
                }}
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{
                  background: 'white', color: '#4C5F4E', border: 'none', borderRadius: '0.75rem',
                  padding: '0.7rem 1.25rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Subscribe
              </motion.button>
              {newsletterError && (
                <div style={{ width: '100%', color: '#FFB8B8', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {newsletterError}
                </div>
              )}
            </form>
          )}
        </motion.div>
      </div>

      {/* Article Detail Modal */}
      <ModalOverlay isOpen={Boolean(activeArticle)} onClose={() => setActiveArticle(null)} maxWidth="640px">
        {activeArticle && (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{activeArticle.emoji}</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{
                background: activeArticle.color, color: 'white', borderRadius: '99px',
                padding: '0.2rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
              }}>{activeArticle.category}</span>
              <span style={{ color: '#576574', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={12} /> {activeArticle.date}
              </span>
            </div>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.4rem', color: '#2C3E50', lineHeight: 1.3 }}>
              {activeArticle.title}
            </h2>
            <div style={{
              color: '#34495E', fontSize: '0.92rem', lineHeight: 1.75,
              whiteSpace: 'pre-wrap', marginBottom: '1.5rem',
            }}>
              {activeArticle.content || activeArticle.excerpt}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="btn-primary"
                onClick={() => { setActiveArticle(null); onNavigate?.('home'); }}
              >
                🔍 Analyze a Product Now
              </motion.button>
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

