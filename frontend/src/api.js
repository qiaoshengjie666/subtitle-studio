/**
 * API 工具 - 自动适配 Electron 和浏览器环境
 *
 * - 浏览器开发模式：使用 Vite 代理 → /api/...
 * - Electron 打包后：直接请求 http://127.0.0.1:8765/api/...
 */

let _baseURL = ''
let _initialized = false

async function initBaseURL() {
  if (_initialized) return
  _initialized = true

  // 检测是否在 Electron 环境中
  if (window.electronAPI?.isElectron) {
    const port = await window.electronAPI.getBackendPort()
    _baseURL = `http://127.0.0.1:${port}`
  } else {
    // 浏览器环境：使用相对路径（Vite 代理会转发）
    _baseURL = ''
  }
}

export async function apiFetch(path, options = {}) {
  await initBaseURL()
  const url = `${_baseURL}${path}`
  return fetch(url, options)
}

// ─── 具体 API 方法 ────────────────────────────────────────────

/** 上传视频并创建识别任务 */
export async function uploadVideo(file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `上传失败 (${res.status})`)
  }
  return res.json()
}

/** 查询任务状态 */
export async function getTaskStatus(taskId) {
  const res = await apiFetch(`/api/task/${taskId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `查询失败 (${res.status})`)
  }
  return res.json()
}

/** 健康检查 */
export async function healthCheck() {
  const res = await apiFetch('/api/health')
  return res.json()
}

/** 翻译文本 */
export async function translateTexts(texts, source, target) {
  const res = await apiFetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, source, target }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `translation failed (${res.status})`)
  }
  return res.json()
}
