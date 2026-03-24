# CropCare Backend API

Node/Express API for the AI‑Powered CropCare Dashboard. Handles image upload, crop analysis, AI recommendations/insights, statistics, notifications hooks, and secure account deletion.

## Quick Start (Local)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and set at least:

   - `OPEN_ROUTER_API_KEY` **or** `OPENAI_API_KEY`
   - `OPENAI_MODEL` (e.g. `gpt-4o` or `gpt-4o-mini`)
   - **Supabase** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) for account deletion — see `README_DELETE_ACCOUNT.md`
   - Email transport (SMTP or SendGrid) for delete‑account emails

3. **Start the server in dev mode (with watch):**
   ```bash
   npm run dev
   ```

   Or in production mode:
   ```bash
   npm start
   ```

   The server listens on `http://localhost:3001` by default.

## API Endpoints

- `POST /api/analyze`
  - **Body**: multipart/form‑data with field `image`
  - **Returns**: `{ timeTaken, accuracyRate, recoveryRate, cropType?, recommendations?, insights? }`
  - If `CROP_MODEL_URL` is set, the image is forwarded to your trained model API; otherwise a fast local demo analysis is used.

- `POST /api/recommendations`
  - **Body**: `{ analysisSummary }`
  - Uses OpenRouter/OpenAI to generate treatment recommendations.

- `POST /api/insights`
  - **Body**: `{ analysisSummary }`
  - Uses OpenRouter/OpenAI to generate explanatory insights.

- `GET /api/health`
  - Health check; also reports whether the AI key appears configured.

- `POST /api/account/delete-request`
  - Creates a delete‑account request in Supabase, sends a confirmation email with a time‑limited token.

- `POST /api/account/delete-confirm`
  - Confirms deletion using the token; deletes the user’s Supabase data, storage files, and Auth user.

## Using Your Own Crop Model

If you have a trained crop‑analysis model:

1. Set `CROP_MODEL_URL` in `.env`:
   ```env
   CROP_MODEL_URL=https://your-model-endpoint/analyze
   ```
2. The backend will `POST` the raw image bytes to this URL with content type from the upload.
3. Expected JSON response (fields are flexible; these names are preferred):
   ```json
   {
     "timeTaken": 4.8,
     "accuracyRate": 94,
     "recoveryRate": 88,
     "cropType": "Maize (corn) leaf",
     "recommendations": "…",
     "insights": "…"
   }
   ```
4. Any of `cropType`, `crop_type`, `leafType`, or `leaf_type` will be normalized to `cropType` and surfaced in the UI and exports.

## Deployment Notes

- This backend can be hosted on any Node/Express‑capable platform (Render, Railway, Fly.io, standard VPS, etc.).
- When deployed, expose the server over HTTPS and remember the base URL (e.g. `https://cropcare-backend.example.com/api`).
- In the **frontend** deployment (e.g. Vercel), set:
  ```env
  VITE_API_BASE_URL=https://cropcare-backend.example.com/api
  ```
  so the dashboard calls the deployed backend instead of `localhost`.

## Troubleshooting

### Backend not running

If you see proxy errors in the frontend console:
```text
[vite] http proxy error: /api/recommendations
Error: read ECONNRESET
```

**Solution:** Start or restart the backend server:
```bash
cd backend
npm run dev
```

The frontend will continue to render, but API‑driven features (recommendations, insights, statistics, delete‑account, etc.) will not work until the backend is reachable.
