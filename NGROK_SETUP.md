# ngrok Setup Guide - Frontend & Backend Communication

## ✅ ngrok is already configured with your token!

## Step 1: Start Both Servers

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

## Step 2: Start ngrok Tunnels

You have TWO options:

### Option A: Single Tunnel (Frontend Only) - Easiest
This works because the React dev server proxy will forward API calls to your local backend.

```bash
# In a new terminal
ngrok http 3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

**Update frontend/.env:**
```
HOST=0.0.0.0
PORT=3000
REACT_APP_BACKEND_URL=http://localhost:5000
```

**Restart frontend** after updating .env

### Option B: Two Tunnels (Frontend + Backend) - More Reliable
This exposes both frontend and backend through ngrok.

**Terminal 1 - Backend ngrok:**
```bash
ngrok http 5000
```
Copy the HTTPS URL (e.g., `https://backend123.ngrok-free.app`)

**Terminal 2 - Frontend ngrok:**
```bash
ngrok http 3000
```
Copy the HTTPS URL (e.g., `https://frontend456.ngrok-free.app`)

**Update frontend/.env:**
```
HOST=0.0.0.0
PORT=3000
REACT_APP_BACKEND_URL=https://backend123.ngrok-free.app
```

**Restart frontend** after updating .env

## Step 3: Access on Mobile

1. Open the **frontend ngrok URL** on your mobile browser
2. GPS will now work! 🎉
3. Check browser console for connection logs

## Troubleshooting

### Backend not responding?

1. **Check proxy logs** - Look in the frontend terminal for proxy messages
2. **Check backend CORS** - Backend should allow ngrok origins (already configured)
3. **Check .env file** - Make sure `REACT_APP_BACKEND_URL` is set correctly
4. **Restart frontend** - After changing .env, you MUST restart

### Still not working?

1. Open browser console on mobile
2. Look for API connection errors
3. Check the proxy logs in frontend terminal
4. Try Option B (two tunnels) instead of Option A

## Quick Test

After setup, test the connection:
- Open frontend ngrok URL on mobile
- Open browser console (if possible)
- Look for: `📍 Using environment API base: ...`
- Try making an API call (e.g., login)
- Check if requests are being proxied correctly



