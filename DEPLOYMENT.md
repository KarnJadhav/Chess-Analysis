# Vercel Deployment & Testing Guide

## Current Status
- ✅ Local build passes (`npm run build`)
- ✅ All fixes implemented:
  - Auth error page with `getServerSideProps` (dynamic, can capture query params)
  - Auth secret fallback resolver
  - Health check endpoint
  - MongoDB graceful error handling
- ❌ Vercel deployment NOT updated yet
  - Health endpoint returns 404
  - `/api/auth/session` still returning 500

## Deployment Steps

### Step 1: Push to GitHub
```bash
# From project root (c:\Users\CW-PC\Desktop\chanakya)
git add .
git commit -m "fix: auth hardening - getServerSideProps on error page, secret fallback, health endpoint"
git push origin main
```

### Step 2: Redeploy on Vercel
Option A: **Automatic** (if GitHub is connected)
- Push to `main` branch → Vercel automatically redeploys

Option B: **Manual Trigger**
- Go to https://vercel.com/dashboard
- Select the "chess-analysis-five" project
- Click "Deployments" → Find latest → Click "Redeploy"
- Or go to project settings → Deployment Triggers → Redeploy

### Step 3: Verify Environment Variables on Vercel
Before deployment, ensure these are set in Vercel project settings (Settings → Environment Variables):
- `MONGODB_URI` - Your MongoDB connection string
- `NEXTAUTH_URL` - https://chess-analysis-five.vercel.app (exact match with your URL)
- `NEXTAUTH_SECRET` - A secure random string (generate: `openssl rand -base64 32`)
- Optional: `STOCKFISH_MODE`, `NEXT_PUBLIC_STOCKFISH_WASM_URL`, etc. (see .env.example)

**Critical:** If `NEXTAUTH_SECRET` is missing, the app will fall back to a default secret (degraded security). Set it explicitly for production.

### Step 4: Test After Deployment

**Test 1: Health Endpoint**
```bash
curl https://chess-analysis-five.vercel.app/api/health
```
Expected response (if vars are set):
```json
{
  "status": "ok",
  "timestamp": "2026-05-01T05:20:00.000Z",
  "checks": {
    "mongodb_uri": true,
    "nextauth_secret": true,
    "nextauth_url": "https://chess-analysis-five.vercel.app"
  }
}
```

**Test 2: Auth Error Page**
```bash
curl https://chess-analysis-five.vercel.app/auth/error?error=AccessDenied
```
Expected: HTML error page (not 500), status 200

**Test 3: Sign In Flow**
- Navigate to https://chess-analysis-five.vercel.app/auth/signin
- Console should NOT show "CLIENT_FETCH_ERROR" about HTML in JSON
- `/api/auth/session` should return JSON (not HTML with 500)

**Test 4: Dashboard (Protected Route)**
- Navigate to https://chess-analysis-five.vercel.app/dashboard
- Should redirect to `/auth/signin` (not 500 error)
- Sign in with test credentials
- Should load dashboard successfully

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Health endpoint 404 | Old code deployed | Push to GitHub and redeploy |
| `/api/auth/session` returns 500 | Missing MONGODB_URI | Set in Vercel env vars |
| `/api/auth/session` returns 500 | Missing NEXTAUTH_SECRET | Set in Vercel env vars |
| Auth error page returns 500 | Old version before getServerSideProps fix | Redeploy after push |
| Sign in form crashes | Missing NEXTAUTH_URL | Verify matches Vercel domain exactly |

## Rollback (if needed)
If deployment breaks, go to Vercel Dashboard → Deployments → Select previous good deployment → click "Promote to Production"

## Next Steps
1. ✅ [COMPLETE] Local build and testing
2. → Push code to GitHub
3. → Redeploy on Vercel
4. → Run smoke tests (health, auth, dashboard)
5. → Monitor for errors in Vercel logs

