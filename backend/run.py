"""
Electron 打包后的后端启动入口
支持通过环境变量 SUBTITLE_PORT 指定端口
"""
import os
import sys
from pathlib import Path


def setup_ffmpeg():
    """
    PyInstaller 打包时把 ffmpeg.exe 放在 _MEIPASS/ffmpeg/ 下，
    运行时把该目录加到 PATH 最前面，确保 subprocess 能找到 ffmpeg。
    """
    if hasattr(sys, "_MEIPASS"):
        ffmpeg_dir = Path(sys._MEIPASS) / "ffmpeg"
        if ffmpeg_dir.exists():
            os.environ["PATH"] = str(ffmpeg_dir) + os.pathsep + os.environ.get("PATH", "")
            print(f"[Backend] ffmpeg 路径已注入: {ffmpeg_dir}")


if __name__ == "__main__":
    # 注入 ffmpeg 路径（打包版专用）
    setup_ffmpeg()

    import uvicorn
    port = int(os.environ.get("SUBTITLE_PORT", 8765))
    print(f"[Subtitle Studio Backend] 启动在端口 {port}")

    # 直接导入 app 对象，避免 PyInstaller 打包后模块字符串解析失败
    from main import app
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="warning",
        reload=False,
    )
