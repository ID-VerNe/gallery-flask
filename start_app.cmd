@echo off
 title 快速选图工具启动器

echo 正在启动快速选图...

REM 切换到脚本所在的目录
cd /d "%~dp0"

REM 激活虚拟环境
call .venv\Scripts\activate.bat

REM 设置 Flask 调试模式 (可选，开发时可以开启)
REM set FLASK_DEBUG=True

REM ===============================================================
REM --- ADD: Wait briefly and open the browser ---
REM 启动一个新的、无窗口的 cmd 进程 (/b cmd /c "") 来执行延迟和浏览器打开命令。
REM timeout /t 2 >nul 会等待 2 秒，并隐藏输出。
REM && 连接两个命令，确保延迟成功后才执行第二个命令。
REM start http://127.0.0.1:5000/ 会使用系统默认浏览器打开指定的 URL。
REM 注意：这里的 URL 是硬编码的默认值。如果您修改了 .env 中的 FLASK_RUN_PORT，这里需要同步修改。
echo 尝试在 2 秒后打开浏览器访问 http://127.0.0.1:5000/ ...
start "" /b cmd /c "timeout /t 3 >nul && start http://127.0.0.1:5000/"
REM --- END ADD ---

REM ===============================================================
REM 运行 Python 主程序 (此命令会阻塞，直到服务器停止)
python main.py

REM ===============================================================
REM 检查 Python 脚本是否运行成功 (仅在服务器停止后执行)
REM 如果脚本退出码不为 0 (通常表示有错误发生)，则暂停，以便您可以看到错误信息。
REM 如果脚本成功运行，窗口将自动关闭。
if %ERRORLEVEL% neq 0 (
    echo.
    echo --------------------------------------------------
    echo 应用程序运行过程中发生错误，请检查上面的输出信息。
    echo --------------------------------------------------
    pause
)

EXIT /B %ERRORLEVEL%