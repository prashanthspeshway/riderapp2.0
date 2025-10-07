@echo off
echo Starting RideShare Application...
echo.

echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Backend installation failed!
    pause
    exit /b 1
)

echo.
echo Installing frontend dependencies...
cd ../frontend
call npm install
if %errorlevel% neq 0 (
    echo Frontend installation failed!
    pause
    exit /b 1
)

echo.
echo Starting backend server...
start "Backend Server" cmd /k "cd ../backend && npm run dev"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo Starting frontend development server...
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo RideShare application is starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause > nul




