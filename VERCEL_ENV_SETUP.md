# Quick Vercel Environment Setup

## Current Issue
- ❌ `/api/auth/session` returns 500 with HTML instead of JSON
- ❌ Auth system cannot start without `MONGODB_URI` and `NEXTAUTH_SECRET`

## How to Fix (5 minutes)

### Step 1: Generate NEXTAUTH_SECRET
Run this command in your terminal:
```bash
openssl rand -base64 32
```
Copy the output (example: `AbC123xyz...==`)

### Step 2: Get MONGODB_URI
Have your MongoDB connection string ready:
- Local: `mongodb://localhost:27017/chanakya`
- Atlas: `mongodb+srv://user:password@cluster.mongodb.net/chanakya?retryWrites=true&w=majority`

### Step 3: Set Environment Variables on Vercel
1. Go to https://vercel.com/dashboard
2. Click the **chess-analysis-five** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)
5. Add these three variables:

#### Variable 1: MONGODB_URI
- **Name:** `MONGODB_URI`
- **Value:** `mongodb://localhost:27017/chanakya` (or your Atlas URI)
- **Environments:** Production, Preview, Development (checkall)
- Click **Save**

#### Variable 2: NEXTAUTH_SECRET
- **Name:** `NEXTAUTH_SECRET`
- **Value:** Paste the result from `openssl rand -base64 32`
- **Environments:** Production, Preview, Development (check all)
- Click **Save**

#### Variable 3: NEXTAUTH_URL (if not already set)
- **Name:** `NEXTAUTH_URL`
- **Value:** `https://chess-analysis-five.vercel.app`
- **Environments:** Production only
- Click **Save**

### Step 4: Redeploy
1. Go to **Deployments** (top menu)
2. Find the latest deployment (should show your recent commits)
3. Click the three-dot menu → **Redeploy**
4. Wait for deployment to complete (should see "✅ Production")

### Step 5: Test
After redeployment, run:
```bash
curl https://chess-analysis-five.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-05-01T05:25:00.000Z",
  "checks": {
    "mongodb_uri": true,
    "nextauth_secret": true,
    "nextauth_url": "https://chess-analysis-five.vercel.app"
  }
}
```

## Optional Variables (Already have defaults)
If you want to customize Stockfish or other settings:
- `STOCKFISH_MODE`: `wasm` (default)
- `STOCKFISH_DEPTH`: `20` (default)
- `STOCKFISH_TIMEOUT`: `5000` (default)
- See `.env.example` for full list

---

**Summary:** Set 3 variables (MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL) → Redeploy → Test with `/api/health`
