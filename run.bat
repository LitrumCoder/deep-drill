@echo off
rem Starts a local server for the game and opens it in the browser. Close this window to stop.
cd /d "%~dp0deep-drill"
set "PY=%LOCALAPPDATA%\Python\bin\python.exe"
if not exist "%PY%" set "PY=py"
start "" http://localhost:8080
"%PY%" -m http.server 8080
pause
