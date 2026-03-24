# 🚀 15-Minute Deployment Checklist - Vercel

## Phase 1: Prepare (5 min)

```bash
# Build frontend (backend includes it)
cd backend
npm install
npm run build

# Verify frontend is in dist folder
ls -la ../frontend/dist/
```

## Phase 2: Deploy Backend to Vercel (5 min)

1. Go to https://vercel.com
2. Click "New Project" → "Import from GitHub"
3. Select your repository
4. **Root Directory**: `backend/`
5. Set environment variables:

```
PORT=3000
NODE_ENV=production
OPEN_ROUTER_API_KEY=sk-or-v1-xxxxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
FRONTEND_URL=https://your-app.vercel.app
CROP_MODEL_URL=https://your-ml-model.up.railway.app/predict
```

6. Click Deploy
7. Get your Vercel backend URL: `https://your-backend.vercel.app`

## Phase 3: Deploy Frontend to Vercel (5 min)

1. Go to https://vercel.com
2. Click "New Project" → "Import from GitHub"
3. Select **same repository** (or different if separate)
4. **Root Directory**: `frontend/`
5. Set environment variables:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
VITE_API_BASE_URL=https://your-backend.vercel.app/api
```

6. Click Deploy
7. Get your Vercel frontend URL: `https://your-app.vercel.app`

## ✅ Test Deployment

```bash
# Check backend is running
curl https://your-backend.vercel.app/api/health

# Open frontend
https://your-app.vercel.app

# Test image upload and analysis
```

## 📝 Key Points

- **Frontend URL** = Vercel frontend URL
- **Backend URL** = Vercel backend URL
- **ML Model URL** = Existing Railway project (`https://your-ml-model.up.railway.app/predict`)
- **API calls** = Frontend (Vercel) → Backend (Vercel) → ML Model (Railway)
- **Environment variables** = Critical for production

---

**You're done! Your app is now live on Vercel! 🎉**
