#!/bin/bash
# 一键打包 Subtitle Studio 为 Electron 桌面应用

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "🎬 =================================="
echo "   Subtitle Studio - 打包桌面应用"
echo "=================================="
echo ""

# ── 步骤 1：安装 Electron 依赖 ──────────────────────────────
echo "📦 [1/4] 安装 Electron 依赖..."
cd "$ROOT_DIR"
npm install
echo "✅ Electron 依赖安装完成"
echo ""

# ── 步骤 2：打包前端 ────────────────────────────────────────
echo "🔨 [2/4] 构建前端..."
cd "$ROOT_DIR/frontend"
npm install
npm run build
echo "✅ 前端构建完成 → frontend/dist/"
echo ""

# ── 步骤 3：打包 Python 后端 ────────────────────────────────
echo "🐍 [3/4] 打包 Python 后端（PyInstaller）..."
bash "$SCRIPT_DIR/build_backend.sh"
echo ""

# ── 步骤 4：打包 Electron 应用 ──────────────────────────────
echo "💿 [4/4] 打包 Electron 应用..."
cd "$ROOT_DIR"
npx electron-builder --mac
echo ""

echo "🎉 =================================="
echo "   打包完成！"
echo "   输出目录: dist-electron/"
echo "=================================="
ls -lh "$ROOT_DIR/dist-electron/" 2>/dev/null || true
