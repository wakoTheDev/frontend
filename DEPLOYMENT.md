# Deployment Guide - CropCare AI (Vercel)

## Architecture Overview

The application consists of:
- **Backend**: Node.js/Express server on Vercel that serves the frontend + API endpoints
- **Frontend**: React app built with Vite (served by backend)
- **ML Model**: Existing Railway endpoint that receives crop image predictions

## Deployment Flow

```
1. User opens https://your-backend.vercel.app
2. Vercel backend serves Frontend (React static files from dist/)
3. User uploads crop image
4. Frontend sends request to Backend API (/api/analyze)
5. Backend forwards image to Railway ML model (CROP_MODEL_URL)
6. Railway returns prediction results
7. Backend processes and returns to frontend
8. Frontend displays results
```

## Step 1: Deploy Backend to Vercel ⭐ (RECOMMENDED)

### 1. Create Vercel Project

1. Go to https://vercel.com
2. Click "New Project" → "Import from GitHub"
3. Select your GitHub repository
4. **Root Directory**: `backend/` (IMPORTANT)
5. Click "Continue"

### 2. Configure Build Settings

- **Build Command**: `npm run build` (this also builds frontend)
- **Start Command**: `npm start`
- **Framework Preset**: Other (Node.js)

### 3. Add Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

```
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# OpenRouter API (AI recommendations/insights)
OPEN_ROUTER_API_KEY=sk-or-v1-your-key-here
OPENAI_MODEL=gpt-4o

# Supabase (for account features)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
FRONTEND_URL=https://your-backend.vercel.app

# CRITICAL: Your existing Railway ML Model endpoint
CROP_MODEL_URL=https://your-ml-model.up.railway.app/predict

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=16-char-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=AI-Powered CropCare
```

### 4. Deploy

- Click "Deploy"
- Vercel auto-deploys on every push to main
- Get your backend URL: `https://your-backend.vercel.app`

**That's it! Your backend is now deployed and serving your frontend! 🎉**

---

## Step 2: Deploy Frontend to Vercel (OPTIONAL)

**Note**: The backend already serves your frontend, so this step is optional. Only do this if you want a separate frontend deployment.

### 1. Create Another Vercel Project (if desired)

1. Go to https://vercel.com
2. Click "New Project" → "Import from GitHub"
3. Select your GitHub repository
4. **Root Directory**: `frontend/`

### 2. Configure Build Settings

- **Build Command**: `npm run build`
- **Start Command**: `npm start` (or leave empty)
- **Output Directory**: `dist`

### 3. Add Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_BASE_URL=https://your-backend.vercel.app/api
```

### 4. Deploy

- Click "Deploy"
- Frontend auto-deploys on every push to main
- Get your frontend URL: `https://your-app.vercel.app`

---

## Alternative: Deploy Backend to Railway (Optional)

If you prefer Railway instead of Vercel for backend:

1. **Create Railway Project**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub"
   - Select your repository

2. **Configure Environment Variables** in Railway dashboard with same values as Vercel

3. **Deploy**
   - Railway auto-deploys on push
   - Get your backend URL from Railway dashboard

**However, Vercel is recommended for this project as it scales better and has better integration with the frontend.**

## Step 3: Configure Backend to Serve Frontend

The backend is already configured to:
- Serve the built frontend from `../frontend/dist` (built by `npm run build`)
- Route all non-API requests to `index.html` (for SPA routing)
- Forward image analysis to your Railway ML model (CROP_MODEL_URL)

### Build Process

When you deploy to Vercel:

1. Vercel runs `npm run build` in the backend directory
2. The backend's `package.json` `postinstall` hook runs, which:
   - Builds the frontend: `cd ../frontend && npm install && npm run build`
   - Frontend output is saved to `../frontend/dist`
3. Backend's Express app serves files from this `dist` directory
4. Backend is ready at your Vercel URL

**No manual build needed!** Vercel handles everything automatically.

## Step 4: Connect Your Existing Railway ML Model

Your existing ML model on Railway should already be deployed. The backend will forward image analysis requests to it:

1. **Ensure CROP_MODEL_URL is set** in backend environment variables:
   ```
   CROP_MODEL_URL=https://your-ml-model.up.railway.app/predict
   ```

2. **Backend Flow**
   - Receives image upload at POST `/api/analyze`
   - Forwards to CROP_MODEL_URL with image
   - Gets prediction results from Railway ML model
   - Formats and returns response to frontend

3. **Local Testing** (with existing Railway ML model)
   ```bash
   export CROP_MODEL_URL=https://your-ml-model.up.railway.app/predict
   cd backend && npm run dev
   # Test at http://localhost:3001
   ```

## Step 5: Test Production Deployment

### 1. Verify Backend is Running

```bash
# Check backend health endpoint
curl https://your-backend.vercel.app/api/health

# Expected response:
# { "status": "ok", "services": { ... } }
```

### 2. Test Frontend Is Served

Open `https://your-backend.vercel.app` in your browser
- Should see CropCare interface
- If not, check Vercel logs for errors

### 3. Test Image Analysis

1. Upload a crop image through the frontend UI
2. Observe request flow:
   - Frontend → Backend → Railway ML Model
3. Results should display within seconds
4. If fails, check:
   - `CROP_MODEL_URL` is set in backend
   - Railway ML model is running
   - Vercel backend logs show forwarding to ML model

### 4. Check Vercel Logs

In Vercel Dashboard → Deployments → Logs:
- Look for successful image processing
- Check for any connection errors to Railway ML model
- Monitor response times

## Troubleshooting

### Frontend Not Loading
**Problem**: Visiting backend URL shows 404 or blank page
- **Solution**: 
  - Verify frontend was built: `npm run build` in `frontend/` directory
  - Check Vercel logs for build errors
  - Ensure `backend/dist` contains frontend files
  - Manual rebuild: Push new commit to GitHub, Vercel redeploys

### API Calls Fail
**Problem**: Image upload fails or API endpoints return 500
- **Solution**:
  - Check backend environment variables are set in Vercel
  - Verify `CROP_MODEL_URL` points to correct Railway endpoint
  - Check backend logs for errors: Vercel Dashboard → Logs
  - Test locally first: `cd backend && npm run dev`

### ML Model Not Processing Images
**Problem**: Image uploads but no results returned
- **Solution**:
  - Verify Railway ML model is running and accessible
  - Test URL directly: `curl https://your-ml-model.up.railway.app/predict`
  - Check CROP_MODEL_URL in backend environment variables
  - Review Railway ML model logs for errors

### Errors in Vercel Logs
**Common errors and solutions**:
- `Cannot find module`: Run `npm install` locally and push
- `EADDRINUSE`: Port already in use (Vercel handles ports automatically)
- `CROP_MODEL_URL is not set`: Add to Vercel environment variables
- `Timeout connecting to Railway`: Check Railway ML model is running

## Environment Variables Reference

### Backend (.env)
```
PORT                  # Server port (default 3001)
LOG_LEVEL            # Logging level (error|warn|info|debug)
NODE_ENV             # Environment (development|production)
CROP_MODEL_URL       # Railway ML model URL
OPEN_ROUTER_API_KEY  # OpenRouter API key for AI
OPENAI_MODEL         # OpenAI model to use (gpt-4o, etc)
SUPABASE_URL         # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY # Service role key
FRONTEND_URL         # Frontend domain (for redirects)
SMTP_HOST            # Email SMTP server
SMTP_PORT            # Email SMTP port
SMTP_USER            # Email account
SMTP_PASSWORD        # Email password/app password
EMAIL_FROM           # From email address
EMAIL_FROM_NAME      # From display name
SUPPORT_EMAIL        # Support contact email
FEEDBACK_REPLY_FROM  # Feedback reply email
```

### Frontend (.env)
```
VITE_SUPABASE_URL         # Supabase project URL
VITE_SUPABASE_ANON_KEY    # Supabase anonymous key
VITE_API_BASE_URL         # Backend API URL (production only)
VITE_AUTH_REDIRECT_URL    # OAuth redirect URL (optional)
```

## Deployment Checklist for Vercel

- [ ] Backend environment variables configured in Vercel
- [ ] CROP_MODEL_URL points to your Railway ML model
- [ ] Frontend built: `cd frontend && npm run build` (or automatic via postinstall)
- [ ] Backend deployed to Vercel (both serves frontend + APIs)
- [ ] Backend URL obtained from Vercel: `https://xxx.vercel.app`
- [ ] Test backend health: `curl https://xxx.vercel.app/api/health`
- [ ] Frontend accessible via backend: `https://xxx.vercel.app`
- [ ] Image analysis working (frontend → backend → Railway)
- [ ] All API routes responding
- [ ] Logs checked for errors in Vercel Dashboard
- [ ] (Optional) Frontend separately deployed to Vercel

## Architecture Summary

```
Your Code (GitHub)
        ↓
Vercel (Backend Project)
  - Runs: Node.js/Express (npm start)
  - Serves: Built React frontend from dist/
  - APIs: /api/* routes
  - Builds: Frontend automatically on deploy
        ↓
     Two Options:
     
Option A: Access via Backend
https://your-backend.vercel.app → sees frontend, APIs work

Option B: Separate Frontend (optional)
Vercel (Frontend Project)
  - Runs: Static React app
  - APIs: Proxy to backend
https://your-app.vercel.app → sees frontend, APIs proxy to backend
```

## Local Development

### Quick Start

```bash
# Install and start backend (serves frontend + APIs)
cd backend
npm install
npm run dev

# In another terminal (optional - for separate frontend dev)
cd frontend
npm install
npm run dev

# Access:
# - Backend: http://localhost:3001
# - Frontend dev: http://localhost:5173 (proxies /api to localhost:3001)
```

### Building for Vercel Deployment

```bash
# Verify frontend builds correctly
cd frontend
npm run build

# Verify backend can build (with frontend included)
cd backend
npm run build

# Both commands should complete without errors
```

## Next Steps

1. **Set up GitHub repository** with backend + frontend folders
2. **Deploy backend to Vercel**:
   - New Project → Import GitHub repo
   - Root Directory: `backend/`
   - Add environment variables (CROP_MODEL_URL, etc)
   - Deploy
3. **Test backend**: `curl https://your-backend.vercel.app/api/health`
4. **Verify frontend loads**: Open `https://your-backend.vercel.app` in browser
5. **Test image analysis**: Upload image, verify it goes through Railway ML model
6. **(Optional) Deploy frontend separately** if desired
7. **Monitor logs** in Vercel Dashboard for any issues

## Quick Reference: Environment Variables

**Set in Vercel → Backend Project Settings → Environment Variables**:

```
CROP_MODEL_URL=https://your-ml-model.up.railway.app/predict
OPEN_ROUTER_API_KEY=sk-or-v1-xxxxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
FRONTEND_URL=https://your-backend.vercel.app
NODE_ENV=production
```

**Set in Vercel → Frontend Project Settings (optional)**:

```
VITE_API_BASE_URL=https://your-backend.vercel.app/api
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

## Support & Debugging

**Check Vercel Logs**:
- Vercel Dashboard → Deployments → Select deployment → Logs
- Look for build errors or runtime errors
- Check if frontend assets are being served (HTTP 200 for .html, .js, .css)

**Local Testing**:
```bash
LOG_LEVEL=debug npm start  # Run backend locally with debug logging
```

**Common Commands**:
```bash
# Test backend API
curl https://your-backend.vercel.app/api/health

# Test frontend loads
curl https://your-backend.vercel.app/

# Check if frontend is being served
curl -I https://your-backend.vercel.app/
```

