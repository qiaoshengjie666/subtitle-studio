# 🎬 Subtitle Studio

> 基于 OpenAI Whisper 的 AI 视频字幕生成工具 · 本地运行 · 数据不上传

---

## ✨ 功能特性

| 功能 | 状态 |
|------|------|
| 视频导入（MP4/MOV/AVI/MKV/WEBM） | ✅ |
| 点击 / 拖拽上传 | ✅ |
| 自动提取音频（ffmpeg） | ✅ |
| Whisper AI 语音识别 | ✅ |
| 字幕实时预览 | ✅ |
| 导出 JSON | ✅ |
| 导出 SRT | ✅ |
| 本地运行（无需联网） | ✅ |
| Electron 桌面应用 | ✅ |

---

## 🚀 快速开始（Web 模式）

### 环境要求

- Python 3.11+
- Node.js 18+
- ffmpeg（`brew install ffmpeg`）

### 一键启动

```bash
bash start.sh
```

访问 http://localhost:5173 即可使用。

---

## 💻 Electron 桌面应用

### 开发模式

同时启动后端 + 前端 + Electron 窗口：

```bash
bash scripts/electron_dev.sh
```

或手动分步启动：

```bash
# 终端 1：启动后端（端口 8765）
cd backend
SUBTITLE_PORT=8765 python3.11 -m uvicorn main:app --host 127.0.0.1 --port 8765 --reload

# 终端 2：启动前端
cd frontend && npm run dev

# 终端 3：启动 Electron
npm run electron:dev
```

### 打包为桌面应用（.dmg / .exe）

```bash
# 一键打包（macOS）
bash scripts/build_app.sh

# 或分步执行：
npm run build:frontend      # 构建前端
bash scripts/build_backend.sh  # PyInstaller 打包后端
npm run dist                # electron-builder 打包
```

打包产物在 `dist-electron/` 目录。

---

## 📁 项目结构

```
Subtitle Studio/
├── backend/                # Python FastAPI 后端
│   ├── main.py             # API 服务（Whisper 识别）
│   └── run.py              # Electron 打包入口
├── frontend/               # React + Vite 前端
│   ├── src/
│   │   ├── api.js          # API 工具（自动适配 Electron/浏览器）
│   │   ├── App.jsx         # 主应用
│   │   └── components/     # UI 组件
│   └── dist/               # 构建产物（打包后生成）
├── electron/               # Electron 主进程
│   ├── main.js             # 主进程（启动后端 + 创建窗口）
│   ├── preload.js          # 预加载脚本（IPC 桥接）
│   └── loading.html        # 启动加载页
├── scripts/                # 工具脚本
│   ├── electron_dev.sh     # Electron 开发模式
│   ├── build_backend.sh    # PyInstaller 打包后端
│   └── build_app.sh        # 一键打包桌面应用
├── package.json            # Electron + electron-builder 配置
├── start.sh                # Web 模式一键启动
└── README.md
```

---

## 📦 导出格式

### JSON 格式

```json
{
  "segments": [
    {
      "id": 1,
      "start": 0.12,
      "end": 2.53,
      "text": "你好大家好"
    },
    {
      "id": 2,
      "start": 2.70,
      "end": 4.88,
      "text": "欢迎来到今天的视频"
    }
  ]
}
```

### SRT 格式

```
1
00:00:00,120 --> 00:00:02,530
你好大家好

2
00:00:02,700 --> 00:00:04,880
欢迎来到今天的视频
```

---

## 🔧 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/transcribe` | 上传视频，创建识别任务 |
| GET | `/api/task/{id}` | 查询任务状态 |
| DELETE | `/api/task/{id}` | 删除任务 |
| GET | `/api/health` | 健康检查 |

API 文档：http://localhost:8000/docs

---

## 🛠 技术栈

- **前端**：React 18 + Vite 5
- **后端**：Python FastAPI + Uvicorn
- **AI**：OpenAI Whisper（本地运行）
- **音频处理**：ffmpeg
- **桌面应用**：Electron 28 + electron-builder
- **后端打包**：PyInstaller

---

## 📝 注意事项

1. **首次运行**会自动下载 Whisper `base` 模型（约 150MB），需要网络连接
2. 识别速度取决于视频时长和机器性能，通常 1 分钟视频需要 30-60 秒
3. 支持中文、英文等多语言自动识别
4. 所有数据均在本地处理，不会上传到任何服务器
