# 🌿 NutriScan AI

**AI-powered food, nutrition, packaged-product, personal-care & health-product analysis platform.**

Built with React 19 · Vite · Tailwind CSS 4 · Framer Motion · Firebase · Gemini 2.0 Flash

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 **Product Analysis** | AI-powered ingredient breakdown with health grading A–F |
| 📸 **Image Recognition** | Upload or scan product/food images with your camera |
| 🥗 **Nutrition Analysis** | Calories, protein, carbs, fat, sodium for any food |
| 🍽️ **Multi-item Detection** | Detect multiple food items on a plate |
| 🔄 **Serving Recalculation** | AI recalculates nutrition for custom serving sizes |
| 🤖 **AI Health Coach** | Personalized Gemini-powered dietary insights |
| 💬 **AI Chatbot** | Ask anything about nutrition, ingredients, or product safety |
| 📰 **Blog** | Health & nutrition articles with animated cards |
| 🔒 **Auth** | Firebase Auth: Email/Password, Google, Phone OTP |
| 💾 **Caching** | Firestore caches AI responses to reduce API calls |
| 📱 **Responsive** | Desktop nav + mobile bottom nav, works on all screen sizes |

---

## 🏗️ Architecture

```
NutriScan AI
├── Frontend (React 19 + Vite)
│   ├── Homepage (search, categories, camera/upload)
│   ├── Product Details (ingredients, grade, alternatives)
│   ├── Nutrition Analysis (food analysis, insights)
│   ├── Blog
│   ├── AI Chatbot
│   └── User Profile
│
└── Backend (Firebase Cloud Functions + Node.js 22)
    ├── /api/analyzeProduct   → Gemini Product Analysis
    ├── /api/analyzeNutrition → Gemini Nutrition Analysis
    ├── /api/identifyFood     → Gemini Image Recognition
    ├── /api/aiInsight        → Gemini AI Insights
    └── /api/getProductData   → OpenFoodFacts + Scrapers
```

### Security Architecture

```
React App
   ↓  (HTTPS only)
Firebase Cloud Functions  ← GEMINI_API_KEY (Secret Manager)
   ↓
Gemini 2.0 Flash API
```

> ⚠️ API keys **never** appear in client-side code. All AI calls go through Cloud Functions.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd Nutriscan
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Firebase and Gemini credentials:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc

# DEV ONLY - For production, use Cloud Functions instead
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run Dev Server

```bash
npm run dev
```

Open http://localhost:5173

---

## 🔑 API Keys Setup

### Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable: Authentication, Firestore, Functions, Hosting
4. Copy config values to `.env.local`
5. Enable auth providers: Email/Password, Google, Phone

### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key
3. For **development**: add to `.env.local` as `VITE_GEMINI_API_KEY`
4. For **production**: store in Firebase Secret Manager and use Cloud Functions

---

## 🚢 Deploying to Firebase

### Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use --add  # Select your project
```

### Build & Deploy Frontend

```bash
npm run build
firebase deploy --only hosting
```

### Deploy Cloud Functions

```bash
cd functions
npm install

# Set Gemini key as a secret
firebase functions:secrets:set GEMINI_API_KEY

cd ..
firebase deploy --only functions
```

### Set Backend URL in env

After deploying functions, update `.env.local` (or your hosting environment):

```env
VITE_BACKEND_URL=https://us-central1-your-project.cloudfunctions.net
```

Then rebuild and redeploy hosting.

---

## 📁 Project Structure

```
Nutriscan/
├── src/
│   ├── App.jsx                    # Root: header, nav, routing, auth
│   ├── main.jsx                   # React entry point
│   ├── index.css                  # Global styles + Tailwind 4
│   ├── firebaseConfig.js          # Firebase init (uses env vars)
│   └── components/
│       ├── Shared.jsx             # Reusable: Spinner, GradeBadge, etc.
│       ├── Modals.jsx             # AuthModal (email, Google, phone)
│       ├── HomePage.jsx           # Hero, search, category selector
│       ├── ProductDetailsPage.jsx # AI product analysis result
│       ├── NutritionAnalysisPage.jsx  # Calories & food analysis
│       ├── BlogPage.jsx           # Health blog
│       ├── ChatbotInterface.jsx   # AI chatbot
│       └── UserProfilePage.jsx    # User profile & scan history
│
├── functions/
│   ├── src/
│   │   └── index.ts              # Cloud Functions (Express + Gemini)
│   ├── package.json
│   └── tsconfig.json
│
├── firebase.json                  # Hosting + Functions config
├── firestore.rules                # Security rules
├── firestore.indexes.json
├── .env.example                   # Copy → .env.local
└── vite.config.js                 # Vite + Tailwind CSS 4
```

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary Background | `#F8F4F0` |
| Card Background | `#FFFFFF` |
| Primary Green | `#4C5F4E` |
| Safe | `#27AE60` |
| Limited | `#F39C12` |
| Harmful | `#E74C3C` |
| Font | Inter + Outfit (Google Fonts) |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License – see [LICENSE](LICENSE) for details.
