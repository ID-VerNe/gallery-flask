@echo off
title 快速选图工具 (Tauri 2.0 原生版)

echo 正在启动快速选图桌面应用...
cd /d "%~dp0"

REM 启动 Tauri 桌面应用
pnpm tauri dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo --------------------------------------------------
    echo 应用程序运行过程中出现错误，请查看上方错误信息。
    echo --------------------------------------------------
    pause
)

EXIT /B %ERRORLEVEL%
