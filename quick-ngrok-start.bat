@echo off
echo ========================================
echo Quick ngrok Setup
echo ========================================
echo.

echo This will start ngrok for FRONTEND (port 3000)
echo The proxy will automatically forward API calls to backend
echo.

echo Make sure:
echo 1. Backend is running on port 5000
echo 2. Frontend is running on port 3000
echo.

pause

echo.
echo Starting ngrok for frontend...
start "ngrok Frontend" cmd /k "ngrok http 3000"

echo.
echo ========================================
echo ngrok Started!
echo ========================================
echo.
echo 1. Copy the HTTPS URL from ngrok window (e.g., https://abc123.ngrok-free.app)
echo 2. Open that URL on your mobile device
echo 3. GPS will work! 🎉
echo.
echo The frontend proxy will automatically forward API calls to your local backend
echo.
echo Press any key to exit...
pause > nul



