@echo off
echo ========================================
echo Starting RideShare with ngrok HTTPS
echo ========================================
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo.
echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo Waiting 5 seconds for frontend to start...
timeout /t 5 /nobreak > nul

echo.
echo ========================================
echo Starting ngrok tunnels...
echo ========================================
echo.
echo IMPORTANT: You need TWO ngrok tunnels:
echo.
echo 1. Backend tunnel (port 5000) - Copy the HTTPS URL
echo 2. Frontend tunnel (port 3000) - Copy the HTTPS URL
echo.
echo Then update frontend/.env with:
echo REACT_APP_BACKEND_URL=https://YOUR_BACKEND_NGROK_URL
echo.
echo ========================================
echo.

echo Starting ngrok for BACKEND (port 5000)...
start "ngrok Backend" cmd /k "ngrok http 5000"

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak > nul

echo.
echo Starting ngrok for FRONTEND (port 3000)...
start "ngrok Frontend" cmd /k "ngrok http 3000"

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo NEXT STEPS:
echo 1. Copy the BACKEND ngrok HTTPS URL (from ngrok Backend window)
echo 2. Copy the FRONTEND ngrok HTTPS URL (from ngrok Frontend window)
echo 3. Update frontend/.env file with backend URL
echo 4. Restart frontend server
echo 5. Open frontend ngrok URL on mobile
echo.
echo Press any key to exit this window...
pause > nul



