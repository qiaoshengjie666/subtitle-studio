#!/bin/bash
# 使用 PyInstaller 将 Python 后端打包成独立可执行文件

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"
OUTPUT_DIR="$ROOT_DIR/backend-dist"

echo "📦 开始打包 Python 后端..."

# 检查 PyInstaller
if ! python3.11 -m PyInstaller --version &>/dev/null; then
    echo "📥 安装 PyInstaller..."
    python3.11 -m pip install pyinstaller
fi

# 清理旧的构建产物
rm -rf "$ROOT_DIR/build" "$OUTPUT_DIR"

# 获取 whisper 包路径（需要打包进去）
WHISPER_PATH=$(python3.11 -c "import whisper; import os; print(os.path.dirname(whisper.__file__))")
echo "   Whisper 路径: $WHISPER_PATH"

# 运行 PyInstaller
cd "$BACKEND_DIR"
python3.11 -m PyInstaller \
    --onefile \
    --name subtitle_backend \
    --distpath "$OUTPUT_DIR" \
    --workpath "$ROOT_DIR/build/pyinstaller" \
    --specpath "$ROOT_DIR/build" \
    --hidden-import uvicorn.logging \
    --hidden-import uvicorn.loops \
    --hidden-import uvicorn.loops.auto \
    --hidden-import uvicorn.protocols \
    --hidden-import uvicorn.protocols.http \
    --hidden-import uvicorn.protocols.http.auto \
    --hidden-import uvicorn.protocols.websockets \
    --hidden-import uvicorn.protocols.websockets.auto \
    --hidden-import uvicorn.lifespan \
    --hidden-import uvicorn.lifespan.on \
    --hidden-import fastapi \
    --hidden-import whisper \
    --hidden-import tiktoken \
    --hidden-import tiktoken_ext \
    --hidden-import tiktoken_ext.openai_public \
    --add-data "$WHISPER_PATH:whisper" \
    --noconfirm \
    run.py

echo ""
echo "✅ 后端打包完成！"
echo "   输出: $OUTPUT_DIR/subtitle_backend"
ls -lh "$OUTPUT_DIR/"
