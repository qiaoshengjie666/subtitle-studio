import { useState, useCallback } from 'react'
import UploadZone from './components/UploadZone.jsx'
import ProcessingStatus from './components/ProcessingStatus.jsx'
import SubtitlePreview from './components/SubtitlePreview.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import { uploadVideo } from './api.js'
import './App.css'

// 应用状态机
// idle → uploading → processing → done | error

export default function App() {
  const [stage, setStage] = useState('idle')       // idle | uploading | processing | done | error
  const [taskId, setTaskId] = useState(null)
  const [taskInfo, setTaskInfo] = useState(null)   // { status, message, result, language, filename }
  const [selectedFile, setSelectedFile] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // 上传并开始识别
  const handleUpload = useCallback(async (file) => {
    setSelectedFile(file)
    setStage('uploading')
    setErrorMsg('')

    try {
      const data = await uploadVideo(file)
      setTaskId(data.task_id)
      setStage('processing')
    } catch (e) {
      setErrorMsg(e.message)
      setStage('error')
    }
  }, [])

  // 轮询任务状态（由 ProcessingStatus 组件调用）
  const handleTaskUpdate = useCallback((info) => {
    setTaskInfo(info)
    if (info.status === 'done') {
      setStage('done')
    } else if (info.status === 'error') {
      setErrorMsg(info.message)
      setStage('error')
    }
  }, [])

  // 重置，重新开始
  const handleReset = useCallback(() => {
    setStage('idle')
    setTaskId(null)
    setTaskInfo(null)
    setSelectedFile(null)
    setErrorMsg('')
  }, [])

  return (
    <div className="app">
      {/* 顶部导航 */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🎬</span>
            <span className="logo-text">Subtitle Studio</span>
            <span className="logo-badge">AI</span>
          </div>
          <p className="header-desc">基于 Whisper 的智能视频字幕生成工具</p>
        </div>
      </header>

      {/* 主内容 */}
      <main className="app-main">
        {/* 步骤指示器 */}
        <StepIndicator stage={stage} />

        {/* 内容区域 */}
        <div className="content-area">
          {/* 空闲 / 上传中 */}
          {(stage === 'idle' || stage === 'uploading') && (
            <UploadZone
              onUpload={handleUpload}
              isUploading={stage === 'uploading'}
              selectedFile={selectedFile}
            />
          )}

          {/* 处理中 */}
          {stage === 'processing' && (
            <ProcessingStatus
              taskId={taskId}
              onUpdate={handleTaskUpdate}
              filename={selectedFile?.name}
            />
          )}

          {/* 完成 */}
          {stage === 'done' && taskInfo?.result && (
            <div className="result-layout">
              <SubtitlePreview segments={taskInfo.result.segments} language={taskInfo.language} />
              <ExportPanel segments={taskInfo.result.segments} filename={selectedFile?.name} />
            </div>
          )}

          {/* 错误 */}
          {stage === 'error' && (
            <div className="error-card">
              <div className="error-icon">⚠️</div>
              <h3>处理失败</h3>
              <p>{errorMsg || '发生未知错误，请重试'}</p>
              <button className="btn-primary" onClick={handleReset}>
                重新开始
              </button>
            </div>
          )}
        </div>

        {/* 完成后的重置按钮 */}
        {stage === 'done' && (
          <div className="reset-bar">
            <button className="btn-ghost" onClick={handleReset}>
              ↩ 识别新视频
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by OpenAI Whisper · 本地运行，数据不上传</p>
      </footer>
    </div>
  )
}

// 步骤指示器组件
function StepIndicator({ stage }) {
  const steps = [
    { key: 'upload', label: '上传视频', icon: '📁' },
    { key: 'recognize', label: 'AI 识别', icon: '🤖' },
    { key: 'preview', label: '字幕预览', icon: '📝' },
    { key: 'export', label: '导出', icon: '💾' },
  ]

  const activeIndex = {
    idle: 0,
    uploading: 0,
    processing: 1,
    done: 3,
    error: 0,
  }[stage] ?? 0

  return (
    <div className="step-indicator">
      {steps.map((step, i) => (
        <div
          key={step.key}
          className={`step ${i < activeIndex ? 'done' : ''} ${i === activeIndex ? 'active' : ''}`}
        >
          <div className="step-circle">
            {i < activeIndex ? '✓' : step.icon}
          </div>
          <span className="step-label">{step.label}</span>
          {i < steps.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  )
}
