@echo off
echo Setting up Instructor Training Backend...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing pnpm...
    npm install -g pnpm
)

REM Install dependencies
echo Installing dependencies...
pnpm install

REM Create uploads directory
if not exist "uploads" mkdir uploads

REM Check if .env exists
if not exist ".env" (
    echo.
    echo WARNING: .env file not found!
    echo Please copy .env.example to .env and configure your database settings.
    echo.
    pause
)

REM Initialize database
echo.
echo Initializing database...
echo Make sure MySQL is running and you have created the database!
pause
npm run db:init

echo.
echo Setup complete! You can now run:
echo npm run dev
echo.
pause
