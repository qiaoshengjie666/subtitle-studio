#!/bin/bash
# 使用 PyInstaller 将 Python 后端打包成独立可执行文件

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"
OUTPUT_DIR="$ROOT_DIR/backend-dist"

echo "📦 开始打包 Python 后端..."

# 安装后端及打包依赖。文件上传接口依赖 python-multipart，必须在打包环境中存在。
echo "📥 安装后端依赖..."
python3.11 -m pip install -r "$BACKEND_DIR/requirements.txt"

# 清理旧的构建产物
rm -rf "$ROOT_DIR/build" "$OUTPUT_DIR"

# 获取 whisper 包路径（需要打包进去）
WHISPER_PATH=$(python3.11 -c "import whisper; import os; print(os.path.dirname(whisper.__file__))")
echo "   Whisper 代码路径: $WHISPER_PATH"

# 确保 base.pt 模型文件存在，若不存在则触发下载
MODEL_CACHE="$HOME/.cache/whisper/base.pt"
if [ ! -f "$MODEL_CACHE" ]; then
    echo "📥 本地未找到 base.pt，开始下载 Whisper 模型（约 145MB）..."
    python3.11 -c "import whisper; whisper.load_model('base')"
    echo "✅ 模型下载完成"
else
    echo "   Whisper 模型已存在: $MODEL_CACHE ($(du -sh "$MODEL_CACHE" | cut -f1))"
fi

# 运行 PyInstaller，将 whisper 代码和 base.pt 模型一并打入
cd "$BACKEND_DIR"
python3.11 -m PyInstaller \
    --onefile \
    --name subtitle_backend \
    --distpath "$OUTPUT_DIR" \
    --workpath "$ROOT_DIR/build/pyinstaller" \
    --specpath "$ROOT_DIR/build" \
    --hidden-import python_multipart \
    --collect-all python_multipart \
    --hidden-import multipart \
    --collect-all multipart \
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
    --add-data "$MODEL_CACHE:whisper_models" \
    --noconfirm \
    run.py

echo ""
echo "✅ 后端打包完成！"
echo "   输出: $OUTPUT_DIR/subtitle_backend"
ls -lh "$OUTPUT_DIR/"
