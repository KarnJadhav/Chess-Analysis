# MongoDB Setup Guide for Chanakya

## Option 1: MongoDB Atlas (Cloud)

### Setup Steps:
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster (M0 tier)
3. Create database user with strong password
4. Go to **Network Access** and whitelist your IP (or use 0.0.0.0/0 for development)
5. Click **Connect** and copy the connection string
6. Replace `<password>` with your actual password

### Expected Connection String Format:
```
mongodb+srv://username:password@cluster-name.xxxxx.mongodb.net/database-name?retryWrites=true&w=majority&appName=AppName
```

### Add to `.env.local`:
```env
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/chanakya?retryWrites=true&w=majority&appName=Cluster0
```

---

## Option 2: Local MongoDB with Docker

### Prerequisites:
- Docker Desktop installed (https://www.docker.com/products/docker-desktop)

### Start MongoDB:
```powershell
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Add to `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/chanakya
```

### Stop MongoDB:
```powershell
docker stop mongodb
```

### Restart MongoDB:
```powershell
docker start mongodb
```

---

## Option 3: MongoDB Community Edition (Windows)

### Download and Install:
1. Download from https://www.mongodb.com/try/download/community
2. Choose Windows and run the installer
3. Install MongoDB Community Server
4. MongoDB will run on `localhost:27017` by default

### Add to `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/chanakya
```

---

## Testing Connection

Run the test script:
```powershell
node test-mongo.js
```

Expected output if successful:
```
✓ Connection successful!
✓ Ping successful
✓ Collections found: (none)
✓ Connection closed - All tests passed!
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `ENOTFOUND` | DNS resolution failed | Check internet, verify domain spelling in URI |
| `ECONNREFUSED` | Can't connect to MongoDB | Ensure MongoDB is running locally |
| `Authentication failed` | Wrong username/password | Verify credentials in connection string |
| `Whitelist error` | IP not whitelisted | Add your IP in MongoDB Atlas Network Access |
| `retryWrites cannot be specified with no value` | Malformed URI | Check for missing `=true` or `=false` after parameters |

---

## After Setting Up MongoDB

1. Update `.env.local` with your connection string
2. Run `npm run dev` to start the development server
3. Open http://localhost:3000 in your browser
4. Try signing up - it should now work!
