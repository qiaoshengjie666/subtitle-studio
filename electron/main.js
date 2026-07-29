const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')

// 是否是打包后的生产环境
const isProd = app.isPackaged

let mainWindow = null
let backendProcess = null
const BACKEND_PORT = 8765  // 使用固定端口避免冲突

// ─── 工具函数 ───────────────────────────────────────────────

/**
 * 等待后端 HTTP 服务就绪
 */
function waitForBackend(port, maxRetries = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let retries = 0
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve()
        } else {
          retry()
        }
      })
      req.on('error', retry)
      req.setTimeout(500, () => { req.destroy(); retry() })
    }
    const retry = () => {
      retries++
      if (retries >= maxRetries) {
        reject(new Error(`后端服务启动超时（${maxRetries}s）`))
      } else {
        setTimeout(check, interval)
      }
    }
    check()
  })
}

// ─── 启动 Python 后端 ────────────────────────────────────────

function startBackend() {
  let backendExe
  let backendArgs = []

  if (isProd) {
    // 生产环境：使用 PyInstaller 打包的可执行文件
    const platform = process.platform
    const exeName = platform === 'win32' ? 'subtitle_backend.exe' : 'subtitle_backend'
    backendExe = path.join(process.resourcesPath, 'backend', exeName)
  } else {
    // 开发环境：直接用 python3.11 运行
    backendExe = 'python3.11'
    backendArgs = [
      path.join(__dirname, '..', 'backend', 'main.py')
    ]
  }

  console.log(`[Backend] 启动: ${backendExe} ${backendArgs.join(' ')}`)

  const env = {
    ...process.env,
    SUBTITLE_PORT: String(BACKEND_PORT),
    // 生产环境下设置数据目录到用户数据目录
    SUBTITLE_DATA_DIR: isProd
      ? path.join(app.getPath('userData'), 'data')
      : path.join(__dirname, '..', 'backend')
  }

  backendProcess = spawn(backendExe, backendArgs, {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`)
  })

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend ERR] ${data.toString().trim()}`)
  })

  backendProcess.on('exit', (code) => {
    console.log(`[Backend] 进程退出，code=${code}`)
    backendProcess = null
  })

  backendProcess.on('error', (err) => {
    console.error(`[Backend] 启动失败: ${err.message}`)
  })
}

// ─── 创建主窗口 ──────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Subtitle Studio',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // macOS 风格
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,  // 先隐藏，加载完再显示
  })

  // 加载中页面
  mainWindow.loadFile(path.join(__dirname, 'loading.html'))
  mainWindow.show()

  try {
    // 启动后端
    startBackend()

    // 等待后端就绪
    console.log('[App] 等待后端服务启动...')
    await waitForBackend(BACKEND_PORT)
    console.log('[App] 后端服务已就绪')

    // 加载前端
    if (isProd) {
      mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'))
    } else {
      // 开发模式：加载 Vite 开发服务器
      mainWindow.loadURL('http://localhost:5173')
    }

  } catch (err) {
    console.error('[App] 启动失败:', err)
    dialog.showErrorBox('启动失败', `后端服务无法启动：\n${err.message}`)
    app.quit()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── IPC 通信 ────────────────────────────────────────────────

// 获取后端端口
ipcMain.handle('get-backend-port', () => BACKEND_PORT)

// 打开文件选择对话框
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '视频文件', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] }
    ]
  })
  return result
})

// 保存文件对话框
ipcMain.handle('save-file-dialog', async (event, { defaultName, content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [
      { name: 'JSON 文件', extensions: ['json'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { success: true, filePath: result.filePath }
  }
  return { success: false }
})

// 在 Finder/Explorer 中显示文件
ipcMain.handle('show-in-folder', (event, filePath) => {
  shell.showItemInFolder(filePath)
})

// ─── App 生命周期 ────────────────────────────────────────────

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // 关闭后端进程
  if (backendProcess) {
    console.log('[App] 正在关闭后端进程...')
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill('SIGTERM')
    backendProcess = null
  }
})
