@echo off
title 快速选图工具

echo 正在启动快速选图...

REM 切换到脚本所在目录
cd /d "%~dp0"

REM 使用 uv 启动（自动管理虚拟环境）
echo 等待 2 秒后自动打开浏览器 http://127.0.0.1:5000/ ...
start "" /b cmd /c "timeout /t 1 >nul && start http://127.0.0.1:5000/"

uv run python main.py

if %ERRORLEVEL% neq 0 (
    echo.
    echo --------------------------------------------------
    echo 应用程序运行过程中出现错误，请查看上方错误信息。
    echo --------------------------------------------------
    pause
)

EXIT /B %ERRORLEVEL%