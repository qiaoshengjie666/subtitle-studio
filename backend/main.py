import os
import sys
import uuid
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import whisper
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI(title="Subtitle Studio API", version="1.0.0")

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 目录配置
# 支持通过环境变量指定数据目录（Electron 打包时使用用户数据目录）
_data_dir = os.environ.get("SUBTITLE_DATA_DIR")
BASE_DIR = Path(_data_dir) if _data_dir else Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
TEMP_DIR = BASE_DIR / "temp"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# 支持的视频格式
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

# 任务状态存储（内存，生产环境可换 Redis）
tasks: dict = {}

# 全局 Whisper 模型（懒加载）
_whisper_model = None


def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        print("正在加载 Whisper 模型（base）...")
        _whisper_model = whisper.load_model("base")
        print("Whisper 模型加载完成")
    return _whisper_model


def extract_audio(video_path: str, audio_path: str) -> bool:
    """使用 ffmpeg 从视频中提取音频"""
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            audio_path
        ]
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=300
        )
        return result.returncode == 0
    except Exception as e:
        print(f"音频提取失败: {e}")
        return False


def process_video(task_id: str, video_path: str):
    """后台任务：提取音频 + Whisper 识别"""
    try:
        tasks[task_id]["status"] = "extracting"
        tasks[task_id]["message"] = "正在提取音频..."

        # 提取音频
        audio_path = str(TEMP_DIR / f"{task_id}.wav")
        success = extract_audio(video_path, audio_path)

        if not success:
            tasks[task_id]["status"] = "error"
            tasks[task_id]["message"] = "音频提取失败，请确认视频文件是否有效"
            return

        tasks[task_id]["status"] = "transcribing"
        tasks[task_id]["message"] = "AI 正在识别语音..."

        # Whisper 识别
        model = get_whisper_model()
        result = model.transcribe(
            audio_path,
            verbose=False,
            word_timestamps=False
        )

        # 构建字幕数据
        # Whisper 时间戳偏移补偿（秒）
        # Whisper 的时间戳有时会比实际音频早，可根据实际情况调整
        TIME_OFFSET = 1.0

        segments = []
        for i, seg in enumerate(result["segments"]):
            start = round(max(0.0, seg["start"] + TIME_OFFSET), 2)
            end = round(max(0.0, seg["end"] + TIME_OFFSET), 2)
            segments.append({
                "id": i + 1,
                "start": start,
                "end": end,
                "text": seg["text"].strip()
            })

        tasks[task_id]["status"] = "done"
        tasks[task_id]["message"] = "识别完成"
        tasks[task_id]["result"] = {"segments": segments}
        tasks[task_id]["language"] = result.get("language", "unknown")

        # 清理临时音频文件
        try:
            os.remove(audio_path)
        except Exception:
            pass

    except Exception as e:
        tasks[task_id]["status"] = "error"
        tasks[task_id]["message"] = f"识别失败: {str(e)}"
        print(f"任务 {task_id} 失败: {e}")


@app.get("/")
def root():
    return {"message": "Subtitle Studio API is running"}


@app.post("/api/transcribe")
async def transcribe_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """上传视频并开始识别"""
    # 检查文件格式
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式: {ext}，支持: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 生成任务 ID
    task_id = str(uuid.uuid4())

    # 保存上传文件
    video_path = str(UPLOAD_DIR / f"{task_id}{ext}")
    with open(video_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # 初始化任务状态
    tasks[task_id] = {
        "status": "pending",
        "message": "任务已创建，等待处理...",
        "filename": file.filename,
        "result": None,
        "language": None
    }

    # 后台执行识别
    background_tasks.add_task(process_video, task_id, video_path)

    return {"task_id": task_id, "message": "任务已提交"}


@app.get("/api/task/{task_id}")
def get_task_status(task_id: str):
    """查询任务状态"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="任务不存在")
    return tasks[task_id]


@app.delete("/api/task/{task_id}")
def delete_task(task_id: str):
    """删除任务及相关文件"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 清理上传文件
    for ext in ALLOWED_EXTENSIONS:
        video_path = UPLOAD_DIR / f"{task_id}{ext}"
        if video_path.exists():
            video_path.unlink()

    del tasks[task_id]
    return {"message": "任务已删除"}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "whisper_loaded": _whisper_model is not None}
