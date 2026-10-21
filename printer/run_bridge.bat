@echo off
setlocal
cd /d "%~dp0"
if "%BRIDGE_TOKEN%"=="" (
  echo Enter the same long random secret you will save in Cyber Arena Settings.
  set /p BRIDGE_TOKEN=Bridge secret: 
)
if "%BRIDGE_TOKEN%"=="" (
  echo ERROR: A bridge secret is required.
  pause
  exit /b 1
)
py -3 bridge.py
if errorlevel 1 (
  echo.
  echo Bridge stopped or failed to start. Check Python and the message above.
  pause
)
