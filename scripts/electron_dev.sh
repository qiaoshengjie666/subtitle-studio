#!/bin/bash
# Electron 开发模式启动脚本
# 同时启动：后端(uvicorn) + 前端(vite) + Electron

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "🎬 =================================="
echo "   Subtitle Studio - Electron 开发模式"
echo "=================================="
echo ""

# 清理旧进程
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# 启动后端
echo "🐍 启动后端 (端口 8765)..."
cd "$ROOT_DIR/backend"
SUBTITLE_PORT=8765 python3.11 -m uvicorn main:app \
    --host 127.0.0.1 \
    --port 8765 \
    --reload &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"

# 等待后端就绪
echo "   等待后端启动..."
for i in $(seq 1 15); do
    if curl -s http://127.0.0.1:8765/api/health > /dev/null 2>&1; then
        echo "   ✅ 后端已就绪"
        break
    fi
    sleep 1
done

# 启动前端 Vite（Electron 开发模式下加载 localhost:5173）
echo "⚡ 启动前端 Vite (端口 5173)..."
cd "$ROOT_DIR/frontend"
npm run dev &
VITE_PID=$!
echo "   Vite PID: $VITE_PID"

# 等待 Vite 就绪
echo "   等待 Vite 启动..."
sleep 3

# 启动 Electron
echo "💻 启动 Electron..."
cd "$ROOT_DIR"
npx electron . &
ELECTRON_PID=$!
echo "   Electron PID: $ELECTRON_PID"

echo ""
echo "✨ 开发模式已启动！"
echo "   后端: http://127.0.0.1:8765"
echo "   前端: http://localhost:5173"
echo ""
echo "   按 Ctrl+C 停止所有服务"

# 等待并清理
trap "echo '正在停止...'; kill $BACKEND_PID $VITE_PID $ELECTRON_PID 2>/dev/null; exit 0" INT TERM
wait
