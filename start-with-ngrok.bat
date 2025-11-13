@echo off
echo ========================================
echo Starting RideShare with ngrok HTTPS
echo ========================================
echo.

echo Make sure you have:
echo 1. ngrok installed and configured
echo 2. Your ngrok authtoken set up
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
echo Starting ngrok (HTTPS tunnel)...
echo.
echo IMPORTANT: Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok-free.app)
echo Use that URL on your mobile device for GPS to work!
echo.
start "ngrok HTTPS" cmd /k "ngrok http 3000"

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo 1. Wait for ngrok to start
echo 2. Copy the HTTPS URL (starts with https://)
echo 3. Open that URL on your mobile device
echo 4. GPS will now work! 🎉
echo.
echo Press any key to exit this window...
pause > nul



