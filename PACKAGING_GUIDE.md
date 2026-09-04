# 📦 Subtitle Studio 打包教程

> 将 Subtitle Studio 打包成可分发的桌面安装包（.dmg / .exe / .AppImage）

---

## 目录

- [打包原理](#打包原理)
- [环境准备](#环境准备)
- [macOS 打包（.dmg）](#macos-打包dmg)
- [Windows 打包（.exe 安装包）](#windows-打包exe-安装包)
- [Linux 打包（.AppImage）](#linux-打包appimage)
- [跨平台打包说明](#跨平台打包说明)
- [常见问题](#常见问题)

---

## 打包原理

Subtitle Studio 由三部分组成，打包时需要分别处理：

```
┌─────────────────────────────────────────────┐
│              Electron 应用                   │
│  ┌──────────────┐   ┌──────────────────────┐ │
│  │  前端 (React) │   │  后端 (Python+Whisper)│ │
│  │  → Vite 构建  │   │  → PyInstaller 打包   │ │
│  │  → 静态 HTML  │   │  → 独立可执行文件      │ │
│  └──────────────┘   └──────────────────────┘ │
│         ↓                    ↓               │
│  ┌─────────────────────────────────────────┐ │
│  │     electron-builder 打包成安装包         │ │
│  │     macOS: .dmg   Windows: .exe          │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**打包步骤：**
1. `npm run build:frontend` — Vite 构建前端为静态文件
2. `bash scripts/build_backend.sh` — PyInstaller 将 Python 后端打包为单个可执行文件
3. `electron-builder` — 将 Electron + 前端 + 后端可执行文件打包成安装包

---

## 环境准备

### 通用依赖

| 工具 | 版本要求 | 安装方式 |
|------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| Python | 3.11 | https://python.org |
| ffmpeg | 任意 | 见下方 |

### macOS 环境

```bash
# 安装 Homebrew（如未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 ffmpeg
brew install ffmpeg

# 安装 Python 3.11
brew install python@3.11

# 安装 Python 依赖
python3.11 -m pip install -r backend/requirements.txt

# 安装 Node 依赖（在项目根目录）
npm install
cd frontend && npm install && cd ..
```

### Windows 环境

```powershell
# 1. 安装 Node.js（官网下载 LTS 版本）
# https://nodejs.org/zh-cn/download/

# 2. 安装 Python 3.11（官网下载，勾选"Add to PATH"）
# https://www.python.org/downloads/

# 3. 安装 ffmpeg
# 方式一：使用 winget
winget install ffmpeg

# 方式二：手动下载
# https://ffmpeg.org/download.html → Windows builds
# 解压后将 bin 目录添加到系统 PATH

# 4. 安装 Python 依赖（在 PowerShell 中）
python -m pip install -r backend\requirements.txt

# 5. 安装 Node 依赖（在项目根目录）
npm install
cd frontend && npm install && cd ..
```

---

## macOS 打包（.dmg）

### 方式一：一键打包（推荐）

```bash
cd "/path/to/Subtitle Studio"
bash scripts/build_app.sh
```

脚本会自动完成所有步骤，最终在 `dist-electron/` 目录生成 `.dmg` 文件。

### 方式二：手动分步打包

**步骤 1：构建前端**

```bash
cd frontend
npm run build
# 产物在 frontend/dist/
cd ..
```

**步骤 2：打包 Python 后端**

```bash
bash scripts/build_backend.sh
# 产物在 backend-dist/subtitle_backend（约 200-400MB）
```

> ⚠️ 首次打包较慢（需要打包 Whisper 模型依赖），约 5-10 分钟

**步骤 3：打包 Electron 应用**

```bash
# 打包 macOS（生成 .dmg）
npx electron-builder --mac

# 同时打包 arm64 和 x64（Apple Silicon + Intel）
npx electron-builder --mac --arm64 --x64
```

**产物位置：**

```
dist-electron/
├── Subtitle Studio-1.0.0-arm64.dmg    ← Apple Silicon Mac
├── Subtitle Studio-1.0.0.dmg          ← Intel Mac
└── mac-arm64/
    └── Subtitle Studio.app            ← 直接运行（不安装）
```

### 安装方式

双击 `.dmg` 文件 → 将 `Subtitle Studio.app` 拖入 `Applications` 文件夹 → 完成。

---

## Windows 打包（.exe 安装包）

> ⚠️ **在 Mac 上无法直接打出 Windows .exe**（PyInstaller 必须在目标平台上运行）。
> 有两种解决方案：**方案 A（推荐）** 用 GitHub Actions 云端 Windows 机器打包；**方案 B** 在 Windows 电脑上本地打包。

---

### 🌟 方案 A：GitHub Actions 云端打包（在 Mac 上触发，免费）

**原理：** 把代码推送到 GitHub，由 GitHub 提供的免费 Windows 云端机器自动完成打包，打包完成后下载 `.exe` 文件。

#### 第一步：把项目推送到 GitHub

```bash
cd "/Users/a123/Documents/songguo/Subtitle Studio"

# 初始化 git（如果还没有）
git init
git add .
git commit -m "init"

# 在 GitHub 创建仓库后，推送
git remote add origin https://github.com/你的用户名/subtitle-studio.git
git push -u origin main
```

#### 第二步：在 GitHub 网页上手动触发打包

1. 打开你的 GitHub 仓库页面
2. 点击顶部 **Actions** 标签
3. 左侧找到 **"打包 Windows .exe 安装包"**
4. 点击右侧 **"Run workflow"** → **"Run workflow"**
5. 等待约 **10-20 分钟**（需要下载 Whisper 等依赖）

#### 第三步：下载 .exe 安装包

打包完成后（绿色 ✅）：
1. 点击该次运行记录
2. 页面底部 **Artifacts** 区域
3. 点击 **"subtitle-studio-windows"** 下载 zip
4. 解压得到 `Subtitle Studio Setup 1.0.0.exe`

#### 自动触发（可选）

每次推送 tag 时自动打包并发布到 GitHub Release：

```bash
git tag v1.0.0
git push --tags
# → 自动触发打包，完成后在 Releases 页面可直接下载 .exe
```

---

### 方案 B：在 Windows 电脑上本地打包

把整个项目文件夹复制到 Windows 电脑，双击运行：

```
scripts\build_win.bat
```

**打包前需要在 Windows 上安装：**

| 工具 | 下载地址 |
|------|---------|
| Node.js ≥ 18 | https://nodejs.org |
| Python 3.11 | https://python.org（安装时勾选 Add to PATH） |
| ffmpeg | `winget install ffmpeg` 或 https://ffmpeg.org |

> Python 依赖（fastapi、uvicorn、whisper、pyinstaller）由脚本自动安装。

**产物位置：**

```
dist-electron\
└── Subtitle Studio Setup 1.0.0.exe    ← 双击安装，自动创建桌面快捷方式
```

### 安装方式

双击 `Subtitle Studio Setup 1.0.0.exe` → 按向导安装 → 桌面快捷方式自动创建。  
用户**无需安装 Python / Node.js / ffmpeg**，开箱即用。

---

## Linux 打包（.AppImage）

```bash
# 构建前端
cd frontend && npm run build && cd ..

# 打包后端
bash scripts/build_backend.sh

# 打包 Linux
npx electron-builder --linux

# 或指定格式
npx electron-builder --linux AppImage deb
```

**产物：**

```
dist-electron/
├── Subtitle Studio-1.0.0.AppImage     ← 通用格式（推荐）
└── subtitle-studio_1.0.0_amd64.deb   ← Debian/Ubuntu 安装包
```

---

## 跨平台打包说明

| 目标平台 | 构建平台 | 说明 |
|---------|---------|------|
| macOS .dmg | macOS | ✅ 原生支持 |
| Windows .exe | Windows | ✅ 原生支持 |
| Windows .exe | macOS | ⚠️ 需要 Wine，不推荐 |
| Linux .AppImage | macOS/Linux | ✅ 支持 |
| macOS .dmg | Windows | ❌ 不支持 |

**结论：要打 Windows 安装包，必须在 Windows 机器上操作。**

---

## 应用图标（可选）

在 `electron/assets/` 目录放置图标文件：

```
electron/assets/
├── icon.icns    ← macOS（1024x1024 PNG 转换）
├── icon.ico     ← Windows（256x256 PNG 转换）
└── icon.png     ← Linux（512x512 PNG）
```

**转换工具：**

```bash
# macOS：PNG → icns
brew install makeicns
makeicns -in icon.png -out icon.icns

# Windows：PNG → ico（使用在线工具）
# https://convertio.co/png-ico/
```

> 如果不提供图标，electron-builder 会使用默认图标，打包不会失败。

---

## 常见问题

### Q1：PyInstaller 打包失败，提示找不到模块

```bash
# 手动安装缺失的模块后重试
python3.11 -m pip install <缺失模块名>
bash scripts/build_backend.sh
```

### Q2：打包后运行提示"无法打开，因为它来自身份不明的开发者"（macOS）

```bash
# 方式一：右键点击 → 打开 → 仍然打开
# 方式二：命令行移除隔离属性
xattr -cr "/Applications/Subtitle Studio.app"
```

### Q3：Windows 安装包被杀毒软件误报

这是 PyInstaller 打包的已知问题。解决方案：
- 购买代码签名证书并签名（推荐正式发布时使用）
- 或在 VirusTotal 提交误报申请

### Q4：打包后 Whisper 模型在哪里？

Whisper 模型**不会**打包进安装包（太大，约 150MB+）。  
首次运行时会自动下载到用户目录：
- macOS/Linux：`~/.cache/whisper/`
- Windows：`C:\Users\<用户名>\.cache\whisper\`

### Q5：如何减小安装包体积？

```bash
# 使用更小的 Whisper 模型（在 backend/main.py 中修改）
# tiny: ~75MB，速度最快，精度较低
# base: ~150MB，推荐
# small: ~500MB，精度更高
_whisper_model = whisper.load_model("tiny")  # 改为 tiny
```

### Q6：electron-builder 下载很慢

```bash
# 设置镜像源
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
npx electron-builder --mac
```

---

## 完整打包流程速查

```bash
# ① 确保依赖已安装
npm install
cd frontend && npm install && cd ..
python3.11 -m pip install -r backend/requirements.txt

# ② 一键打包（macOS）
bash scripts/build_app.sh

# ③ 查看产物
ls -lh dist-electron/
```

打包完成后，将 `dist-electron/` 中的安装包分发给用户即可。用户**无需安装 Python、Node.js 或任何依赖**，双击安装包即可使用。
