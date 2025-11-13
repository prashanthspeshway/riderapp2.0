# Fix Google Maps API for ngrok

## Problem
Google Maps is showing fallback maps because the API key doesn't allow your ngrok domain.

## Solution: Update Google Cloud Console

### Step 1: Go to Google Cloud Console
1. Open: https://console.cloud.google.com/apis/credentials
2. Sign in with your Google account
3. Select your project (or create one if needed)

### Step 2: Find Your API Key
1. Look for the API key: `AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo`
2. Click on it to edit

### Step 3: Update Application Restrictions

**Option A: Allow ngrok Domain (Recommended for Testing)**
1. Under "Application restrictions" → Select "HTTP referrers (web sites)"
2. Click "ADD AN ITEM"
3. Add your ngrok domain: `https://*.ngrok-free.app/*`
4. Also add: `https://*.ngrok.io/*` (for older ngrok domains)
5. Click "SAVE"

**Option B: No Restrictions (Easier for Development)**
1. Under "Application restrictions" → Select "None"
2. Click "SAVE"
3. ⚠️ **Warning**: This allows any website to use your key. Only use for development!

### Step 4: Verify API is Enabled
1. Go to: https://console.cloud.google.com/apis/library
2. Make sure these APIs are enabled:
   - Maps JavaScript API
   - Geocoding API
   - Places API (if using autocomplete)

### Step 5: Restart Frontend
After updating the API key restrictions:
1. Stop the frontend server (Ctrl+C)
2. Restart it: `cd frontend && npm start`
3. Refresh your mobile browser

## Quick Test
After updating, check the browser console. You should see:
- ✅ Google Maps loading successfully
- ❌ No "gm_authFailure" errors
- ❌ No "API key authentication failed" messages

## Alternative: Use Environment Variable
You can also set a different API key in `frontend/.env`:
```
REACT_APP_GOOGLE_MAPS_API_KEY=your_new_api_key_here
```

Then restart the frontend server.



