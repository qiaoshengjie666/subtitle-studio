import { useEffect, useRef } from 'react'
import { getTaskStatus } from '../api.js'
import './ProcessingStatus.css'

const POLL_INTERVAL = 1500 // ms

const STEPS = [
  { status: 'pending',      label: '任务排队中',     icon: '⏳' },
  { status: 'extracting',   label: '提取音频',       icon: '🎵' },
  { status: 'transcribing', label: 'AI 语音识别',    icon: '🤖' },
  { status: 'done',         label: '识别完成',       icon: '✅' },
]

function getStepIndex(status) {
  const idx = STEPS.findIndex(s => s.status === status)
  return idx === -1 ? 0 : idx
}

export default function ProcessingStatus({ taskId, onUpdate, filename }) {
  const timerRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const poll = async () => {
      if (!isMountedRef.current) return
      try {
        const data = await getTaskStatus(taskId)

        if (!isMountedRef.current) return
        onUpdate(data)

        // 未完成则继续轮询
        if (data.status !== 'done' && data.status !== 'error') {
          timerRef.current = setTimeout(poll, POLL_INTERVAL)
        }
      } catch (e) {
        if (!isMountedRef.current) return
        onUpdate({ status: 'error', message: '网络错误，无法获取任务状态' })
      }
    }

    poll()

    return () => {
      isMountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [taskId, onUpdate])

  return (
    <div className="processing-card">
      {/* 顶部文件名 */}
      {filename && (
        <div className="processing-file">
          <span className="file-icon">🎬</span>
          <span className="file-name">{filename}</span>
        </div>
      )}

      {/* 主动画区 */}
      <div className="processing-animation">
        <div className="wave-ring ring1" />
        <div className="wave-ring ring2" />
        <div className="wave-ring ring3" />
        <div className="processing-center-icon">🤖</div>
      </div>

      <h3 className="processing-title">AI 正在识别语音</h3>
      <p className="processing-subtitle">请稍候，这可能需要几分钟...</p>

      {/* 步骤进度 */}
      <div className="processing-steps">
        {STEPS.map((step, i) => (
          <ProcessStep key={step.status} step={step} index={i} />
        ))}
      </div>

      <p className="processing-tip">
        💡 首次运行会自动下载 Whisper 模型（约 150MB），请保持网络连接
      </p>
    </div>
  )
}

// 单个步骤（通过轮询数据动态更新）
function ProcessStep({ step, index }) {
  return (
    <div className="process-step">
      <div className="process-step-icon">{step.icon}</div>
      <div className="process-step-info">
        <span className="process-step-label">{step.label}</span>
        <div className="process-step-bar">
          <div className="process-step-bar-fill" style={{ animationDelay: `${index * 0.3}s` }} />
        </div>
      </div>
    </div>
  )
}
