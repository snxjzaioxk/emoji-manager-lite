@echo off
echo Starting Emoji Manager Lite with LOW MEMORY mode...
echo.

REM Set ultra-low memory limits
set NODE_OPTIONS=--max-old-space-size=96 --max-semi-space-size=2

REM Start the application with memory constraints
start "" "release\Emoji-Manager-Lite-Setup-4.1.0.exe" --js-flags="--max-old-space-size=96 --max-semi-space-size=2 --expose-gc" --disable-gpu --disable-software-rasterizer --no-sandbox

echo.
echo Application started with memory limits:
echo - Max memory: 96MB
echo - GPU: Disabled
echo - Hardware acceleration: Disabled
echo.
pause