@echo off
echo ========================================
echo Restarting Backend Server
echo ========================================
echo.

echo Stopping existing backend processes...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Backend*" 2>nul
timeout /t 2 /nobreak > nul

echo.
echo Starting Backend Server with fixes...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo.
echo ========================================
echo Backend restarted!
echo ========================================
echo.
echo The backend now checks BOTH Rider and User collections
echo for authentication, which should fix the "User not found" error.
echo.
echo Press any key to exit...
pause > nul



