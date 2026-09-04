@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ==========================================
echo   Subtitle Studio - Windows 打包
echo ==========================================
echo.

:: 获取脚本所在目录的上级（项目根目录）
set "ROOT_DIR=%~dp0.."
cd /d "%ROOT_DIR%"

:: ── 检查依赖 ──────────────────────────────────────────────────
echo [1/5] 检查环境依赖...

where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装：https://nodejs.org
    pause & exit /b 1
)

where python >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装：https://python.org
    pause & exit /b 1
)

where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo [警告] 未找到 ffmpeg，音频提取功能将不可用
    echo        安装方式：winget install ffmpeg
    echo        或下载：https://ffmpeg.org/download.html
    echo.
)

echo    Node.js: OK
echo    Python:  OK
echo.

:: ── 安装 Node 依赖 ────────────────────────────────────────────
echo [2/5] 安装 Node.js 依赖...
call npm install --prefer-offline 2>&1
if errorlevel 1 (
    echo [错误] npm install 失败
    pause & exit /b 1
)
cd frontend
call npm install --prefer-offline 2>&1
if errorlevel 1 (
    echo [错误] frontend npm install 失败
    pause & exit /b 1
)
cd ..
echo    依赖安装完成
echo.

:: ── 构建前端 ──────────────────────────────────────────────────
echo [3/5] 构建前端...
cd frontend
call npm run build 2>&1
if errorlevel 1 (
    echo [错误] 前端构建失败
    cd ..
    pause & exit /b 1
)
cd ..
echo    前端构建完成 → frontend\dist\
echo.

:: ── 打包 Python 后端 ──────────────────────────────────────────
echo [4/5] 打包 Python 后端（PyInstaller）...

:: 安装 Python 依赖（含 FastAPI 文件上传所需的 python-multipart）
python -m pip install -r backend\requirements.txt --quiet 2>&1
if errorlevel 1 (
    echo [警告] 部分 Python 依赖安装失败，尝试继续...
)

:: 清理旧产物
if exist "backend-dist" rmdir /s /q "backend-dist"
if exist "build\pyinstaller" rmdir /s /q "build\pyinstaller"

:: 获取 whisper 路径
for /f "delims=" %%i in ('python -c "import whisper, os; print(os.path.dirname(whisper.__file__))"') do set "WHISPER_PATH=%%i"
echo    Whisper 路径: %WHISPER_PATH%

:: PyInstaller 打包
cd backend
python -m PyInstaller ^
    --onefile ^
    --name subtitle_backend ^
    --distpath "..\backend-dist" ^
    --workpath "..\build\pyinstaller" ^
    --specpath "..\build" ^
    --hidden-import python_multipart ^
    --collect-all python_multipart ^
    --hidden-import multipart ^
    --collect-all multipart ^
    --hidden-import uvicorn.logging ^
    --hidden-import uvicorn.loops ^
    --hidden-import uvicorn.loops.auto ^
    --hidden-import uvicorn.protocols ^
    --hidden-import uvicorn.protocols.http ^
    --hidden-import uvicorn.protocols.http.auto ^
    --hidden-import uvicorn.protocols.websockets ^
    --hidden-import uvicorn.protocols.websockets.auto ^
    --hidden-import uvicorn.lifespan ^
    --hidden-import uvicorn.lifespan.on ^
    --hidden-import fastapi ^
    --hidden-import whisper ^
    --hidden-import tiktoken ^
    --hidden-import tiktoken_ext ^
    --hidden-import tiktoken_ext.openai_public ^
    --add-data "%WHISPER_PATH%;whisper" ^
    --noconfirm ^
    run.py 2>&1

if errorlevel 1 (
    echo [错误] PyInstaller 打包失败
    cd ..
    pause & exit /b 1
)
cd ..
echo    后端打包完成 → backend-dist\subtitle_backend.exe
echo.

:: ── 打包 Electron 安装包 ──────────────────────────────────────
echo [5/5] 打包 Electron Windows 安装包...
call npx electron-builder --win --x64 2>&1
if errorlevel 1 (
    echo [错误] electron-builder 打包失败
    pause & exit /b 1
)

echo.
echo ==========================================
echo   打包完成！
echo ==========================================
echo.
echo   安装包位置: dist-electron\
dir /b "dist-electron\*.exe" 2>nul
echo.
echo   双击安装包即可安装到 Windows 电脑
echo   用户无需安装 Python / Node.js / ffmpeg
echo.
pause
