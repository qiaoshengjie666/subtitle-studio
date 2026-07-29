"""
Electron 打包后的后端启动入口
支持通过环境变量 SUBTITLE_PORT 指定端口
"""
import os
import sys
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("SUBTITLE_PORT", 8765))
    print(f"[Subtitle Studio Backend] 启动在端口 {port}")
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=port,
        log_level="warning",
        reload=False,
    )
