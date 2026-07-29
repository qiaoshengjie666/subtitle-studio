import { useState } from 'react'
import './ExportPanel.css'

export default function ExportPanel({ segments, filename }) {
  const [copied, setCopied] = useState(false)
  const [exported, setExported] = useState(false)

  // 构建标准 JSON 数据
  const buildJsonData = () => ({
    segments: segments.map(seg => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text,
    }))
  })

  // 下载 JSON 文件
  const handleExportJson = () => {
    const data = buildJsonData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const baseName = filename
      ? filename.replace(/\.[^.]+$/, '')
      : 'subtitles'

    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}_subtitles.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }

  // 复制 JSON 到剪贴板
  const handleCopyJson = async () => {
    const data = buildJsonData()
    const json = JSON.stringify(data, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级方案
      const ta = document.createElement('textarea')
      ta.value = json
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 预览 JSON（前 3 条）
  const previewData = {
    segments: segments.slice(0, 3).map(seg => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: seg.text,
    }))
  }
  const previewJson = JSON.stringify(previewData, null, 2)
  const hasMore = segments.length > 3

  return (
    <div className="export-panel">
      {/* 头部 */}
      <div className="export-header">
        <div className="export-header-left">
          <span className="export-icon">💾</span>
          <h3 className="export-title">导出字幕</h3>
        </div>
        <div className="export-stats">
          <span className="stat-item">
            <span className="stat-label">字幕条数</span>
            <span className="stat-value">{segments.length}</span>
          </span>
        </div>
      </div>

      {/* JSON 预览 */}
      <div className="json-preview-wrap">
        <div className="json-preview-header">
          <span className="json-label">📄 JSON 预览</span>
          {hasMore && (
            <span className="json-more">仅显示前 3 条，共 {segments.length} 条</span>
          )}
        </div>
        <pre className="json-preview">
          <code>{previewJson}</code>
          {hasMore && (
            <div className="json-fade">
              <span className="json-more-hint">... 还有 {segments.length - 3} 条</span>
            </div>
          )}
        </pre>
      </div>

      {/* 导出按钮区 */}
      <div className="export-actions">
        {/* 主要：下载 JSON */}
        <button
          className={`export-btn primary ${exported ? 'success' : ''}`}
          onClick={handleExportJson}
        >
          {exported ? (
            <><span>✅</span> 已下载！</>
          ) : (
            <><span>⬇️</span> 下载 JSON</>
          )}
        </button>

        {/* 次要：复制 JSON */}
        <button
          className={`export-btn secondary ${copied ? 'success' : ''}`}
          onClick={handleCopyJson}
        >
          {copied ? (
            <><span>✅</span> 已复制！</>
          ) : (
            <><span>📋</span> 复制 JSON</>
          )}
        </button>
      </div>

      {/* 格式说明 */}
      <div className="export-format-info">
        <div className="format-info-title">📐 数据格式</div>
        <div className="format-fields">
          <div className="format-field">
            <code>id</code>
            <span>字幕序号（从 1 开始）</span>
          </div>
          <div className="format-field">
            <code>start</code>
            <span>开始时间（秒，精确到 0.01）</span>
          </div>
          <div className="format-field">
            <code>end</code>
            <span>结束时间（秒，精确到 0.01）</span>
          </div>
          <div className="format-field">
            <code>text</code>
            <span>字幕文本内容</span>
          </div>
        </div>
      </div>
    </div>
  )
}
