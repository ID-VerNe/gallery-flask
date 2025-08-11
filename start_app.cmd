@echo off
cd /d "%~dp0"
call .venv\Scripts\activate.bat
start "" /b cmd /c "timeout /t 1 >nul && start http://127.0.0.1:5000/"
python main.py
if %ERRORLEVEL% neq 0 (
    pause
)
EXIT /B %ERRORLEVEL%
