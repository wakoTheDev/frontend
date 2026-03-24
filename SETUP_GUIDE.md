# CropCare AI - Setup & Deployment Guide (Vercel)

## ✅ What's Been Configured

Your application is now set up for production deployment on **Vercel** with the following architecture:

### Frontend → Backend → ML Model Flow

```
User Browser
    ↓
[Frontend - Vercel]
    ↓
[Backend - Vercel] (serves static frontend + APIs)
    ↓
[ML Model - Railway] (your existing predict endpoint)
```

## 🔧 Configuration Changes Made

### 1. **Frontend API URL** (`frontend/src/lib/api.js`)
   - Changed from hardcoded Railway endpoint to configurable environment variable
   - Routes through backend (`/api`) instead of directly to ML model
   - Use `VITE_API_BASE_URL` environment variable for production

### 2. **Backend Serving Frontend** (`backend/src/server.js`)
   - Added static file serving for built React app
   - SPA routing support (fallback to index.html for non-API routes)
   - Added compression middleware for optimized delivery
   - Image analysis flows through backend → Railway ML model

### 3. **Build Configuration** (`backend/package.json`)
   - Added `npm run build` that builds frontend
   - Added `postinstall` hook to auto-build frontend on deployment
   - Backend's `dist` directory includes compiled frontend

### 4. **Environment Variables**
   - Updated `.env.example` files with required variables
   - Created `.env.production.example` for frontend production config
   - Added `CROP_MODEL_URL` to point to your Railway ML model endpoint

### 5. **Deployment Configs**
   - Created `backend/vercel.json` for Vercel deployment (primary)
   - Created `backend/railway.json` for Railway deployment (optional)
   - Complete `DEPLOYMENT.md` guide

## 🚀 Quick Start - Deployment on Vercel

### Step 1: Prepare Backend for Deployment

```bash
# Build frontend (backend will include it)
cd backend
npm install
npm run build  # This builds frontend too
```

### Step 2: Deploy Backend to Vercel

```bash
# 1. Go to https://vercel.com
# 2. New Project → Import from GitHub
# 3. Select your repository
# 4. Root Directory: backend/
# 5. Add environment variables:
PORT=3000
NODE_ENV=production
OPEN_ROUTER_API_KEY=sk-or-v1-xxxxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
FRONTEND_URL=https://your-app.vercel.app
CROP_MODEL_URL=https://your-ml-model.up.railway.app/predict

# 6. Deploy - Vercel auto-deploys on push
# 7. Get backend URL from Vercel dashboard (e.g., https://your-backend.vercel.app)
```

### Step 3: Deploy Frontend to Vercel

```bash
# 1. Go to https://vercel.com → New Project
# 2. Import your GitHub repository
# 3. Root Directory: frontend/
# 4. Environment variables:
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
VITE_API_BASE_URL=https://your-backend.vercel.app/api

# 5. Deploy - Vercel auto-deploys on push
```

### Step 4: Connect ML Model (if using Railway)

```bash
# Get your ML model deployed to Railway
# In your backend environment variables, set:
CROP_MODEL_URL=https://your-ml-model.up.railway.app/predict

# Backend will forward image analysis requests to this URL
```

## 📋 Environment Variables Summary

### Backend `.env` (Vercel)
```
PORT=3000
NODE_ENV=production
CROP_MODEL_URL=https://your-ml-model.up.railway.app/predict
OPEN_ROUTER_API_KEY=sk-or-v1-xxxxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend `.env` (Vercel)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
VITE_API_BASE_URL=https://your-backend.vercel.app/api
```

## ✨ How It Works (Request Flow)

```
1. User opens: https://your-app.vercel.app
   ↓
2. Vercel redirects to backend serving frontend:
   GET https://your-backend-url/ → serves frontend/dist/index.html
   ↓
3. User uploads crop image
   ↓
4. Frontend sends: POST /api/analyze
   ↓
5. Backend receives image
   ↓
6. Backend forwards to Railway ML model:
   POST https://your-ml-model.up.railway.app/predict
   ↓
7. ML Model processes and returns predictions
   ↓
8. Backend formats response and returns to frontend
   ↓
9. Frontend displays results to user
```

## 🧪 Testing Locally

```bash
# Terminal 1: Start backend (serves frontend + APIs)
cd backend
npm run dev

# Terminal 2: Frontend development server (optional, proxies to backend)
cd frontend
npm run dev

# Open http://localhost:3001 (backend serves frontend)
# Or http://localhost:5173 (frontend dev server)
```

## 📊 Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Vercel Backend                          │
│           (serves frontend + API endpoints)              │
│                                                          │
│  - Serves: Frontend static files (React built app)       │
│  - API Routes: /api/analyze, /api/insights, etc.        │
│  - Platform: Vercel (serverless/edge functions)        │
└──────────────┬────────────────────────────┬──────────────┘
               │                            │
       ┌───────▼────────┐          ┌────────▼──────────────┐
       │  Supabase      │          │  Railway ML Model      │
       │  (Auth, DB)    │          │  (existing project)    │
       │                │          │  (/predict endpoint)   │
       └────────────────┘          └────────────────────────┘
```

## 🔗 Your URLs (After Deployment)

```
Frontend/Backend URL (Vercel serves both):
https://your-backend.vercel.app

Backend API URL:
https://your-backend.vercel.app/api

ML Model URL (existing Railway project):
https://your-ml-model.up.railway.app/predict

Health Check:
https://your-backend.vercel.app/api/health
```

## ⚙️ Key Configuration Files

- **Backend Config**
  - `backend/vercel.json` - Vercel deployment config
  - `backend/railway.json` - Railway deployment config
  - `backend/package.json` - Build scripts with frontend build
  
- **Frontend Config**
  - `frontend/vite.config.js` - Vite build config
  - `frontend/package.json` - Build and scripts

- **Documentation**
  - `DEPLOYMENT.md` - Detailed deployment guide
  - `backend/.env.example` - Backend environment template
  - `frontend/.env.example` - Frontend environment template
  - `.env.production.example` - Frontend production template

## 🐛 Troubleshooting

**Frontend not loading?**
- Check backend is running and serving from `frontend/dist`
- Verify frontend was built: `npm run build`
- Check browser console for errors

**API calls failing?**
- Ensure `VITE_API_BASE_URL` is set correctly on frontend
- Check backend logs: `LOG_LEVEL=debug npm start`
- Verify backend can reach Railway ML model if configured

**Image analysis not working?**
- Check `CROP_MODEL_URL` is set in backend
- Verify Railway ML model is running
- Review backend logs for connection errors

## 📚 Next Steps

1. **Set up your repositories** on GitHub
2. **Deploy backend** to Railway or Vercel
3. **Deploy frontend** to Vercel
4. **Configure environment variables** in deployment platforms
5. **Connect your ML model** if not using local fallback
6. **Test the full flow** through the UI
7. **Monitor logs** to ensure everything works

## 🎯 What's Working Now

✅ Frontend served by backend  
✅ Image analysis routes through backend  
✅ Backend forwards to Railway ML model  
✅ Environment variables configured  
✅ Build scripts set up for deployment  
✅ Deployment configs created  
✅ SPA routing handled properly  
✅ Compression enabled for performance  

## 📖 For More Details

See `DEPLOYMENT.md` for comprehensive deployment guide including:
- Detailed Railway setup
- Detailed Vercel setup
- ML model integration
- Email configuration
- Troubleshooting guide
- Environment variables reference

---

**You're ready to deploy! 🚀**
