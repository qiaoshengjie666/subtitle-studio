#!/bin/bash

# Subtitle Studio 启动脚本
# 同时启动后端（FastAPI）和前端（Vite）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🎬 =================================="
echo "   Subtitle Studio - AI 字幕生成工具"
echo "=================================="
echo ""

# 检查 ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  未检测到 ffmpeg，请先安装："
    echo "   brew install ffmpeg"
    echo ""
    exit 1
fi

# 检查 Python（优先使用 python3.11，其次 python3）
if command -v python3.11 &> /dev/null; then
    PYTHON=python3.11
elif command -v python3 &> /dev/null; then
    PYTHON=python3
else
    echo "❌ 未检测到 python3"
    exit 1
fi
echo "   Python: $($PYTHON --version)"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 node"
    exit 1
fi

echo "✅ 环境检查通过"
echo ""

# 启动后端
echo "🚀 启动后端服务 (http://localhost:8000)..."
cd "$SCRIPT_DIR/backend"
$PYTHON -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 2

# 启动前端
echo "🚀 启动前端服务 (http://localhost:5173)..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "   前端 PID: $FRONTEND_PID"

echo ""
echo "✨ 启动完成！"
echo ""
echo "   🌐 前端地址: http://localhost:5173"
echo "   🔧 后端 API: http://localhost:8000"
echo "   📖 API 文档: http://localhost:8000/docs"
echo ""
echo "   按 Ctrl+C 停止所有服务"
echo ""

# 捕获退出信号，清理进程
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "✅ 已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

# 等待子进程
wait
