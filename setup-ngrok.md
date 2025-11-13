# Easy HTTPS Setup with ngrok (2 minutes)

## Step 1: Install ngrok

**Option A: Download (Easiest)**
1. Go to https://ngrok.com/download
2. Download for Windows
3. Extract `ngrok.exe` to a folder (e.g., `C:\ngrok\`)
4. Add to PATH or use full path

**Option B: Using Chocolatey (if you have it)**
```powershell
choco install ngrok
```

**Option C: Using npm (if you have Node.js)**
```powershell
npm install -g ngrok
```

## Step 2: Sign up (Free)
1. Go to https://dashboard.ngrok.com/signup
2. Sign up (free account)
3. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken

## Step 3: Configure ngrok
```powershell
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

## Step 4: Start ngrok
```powershell
# Terminal 1: Start your backend (if not running)
cd backend
npm run dev

# Terminal 2: Start your frontend (if not running)  
cd frontend
npm start

# Terminal 3: Start ngrok for frontend
ngrok http 3000
```

## Step 5: Use the HTTPS URL
ngrok will give you a URL like: `https://abc123.ngrok-free.app`

1. Open this URL on your mobile browser
2. GPS will now work! 🎉

## Optional: Keep ngrok running automatically
Create a batch file to start everything:



