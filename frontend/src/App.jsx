import { useState, useCallback, useEffect } from 'react'
import UploadZone from './components/UploadZone.jsx'
import ProcessingStatus from './components/ProcessingStatus.jsx'
import SubtitlePreview from './components/SubtitlePreview.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import { uploadVideo, translateTexts } from './api.js'
import './App.css'

const LANG_LABELS = {
  zh: '中文', en: '英语', ja: '日语', ko: '韩语',
  fr: '法语', de: '德语', es: '西班牙语', ru: '俄语',
  ar: '阿拉伯语', pt: '葡萄牙语', it: '意大利语',
  th: '泰语', vi: '越南语', id: '印尼语', ms: '马来语',
  hi: '印地语', tr: '土耳其语', nl: '荷兰语', pl: '波兰语',
}

const LANG_FLAGS = {
  zh: '🇨🇳', en: '🇬🇧', ja: '🇯🇵', ko: '🇰🇷',
  fr: '🇫🇷', de: '🇩🇪', es: '🇪🇸', ru: '🇷🇺',
  ar: '🇸🇦', pt: '🇧🇷', it: '🇮🇹', th: '🇹🇭',
  vi: '🇻🇳', id: '🇮🇩', ms: '🇲🇾', hi: '🇮🇳',
  tr: '🇹🇷', nl: '🇳🇱', pl: '🇵🇱',
}

function makeKey(prefix, id) {
  const base = `sub_${String(id).padStart(3, '0')}`
  return prefix ? `${prefix}_${base}` : base
}

// 应用状态机
// idle → uploading → processing → done | error

export default function App() {
  const [stage, setStage] = useState('idle')
  const [taskId, setTaskId] = useState(null)
  const [taskInfo, setTaskInfo] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // 多语言状态
  const [targetLangs, setTargetLangs] = useState([])
  const [translations, setTranslations] = useState({})
  const [activeLangIdx, setActiveLangIdx] = useState(null)
  const [showAddLang, setShowAddLang] = useState(false)
  const [newLangInput, setNewLangInput] = useState('')
  const [translating, setTranslating] = useState(false)

  const sourceLang = taskInfo?.language || null
  const keyPrefix = selectedFile?.name
    ? selectedFile.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_]/g, '_')
    : ''
  const runtimeLangs = sourceLang ? [sourceLang, ...targetLangs] : targetLangs
  const activeLang = runtimeLangs[activeLangIdx] || null
  const segments = taskInfo?.result?.segments || []

  // 识别完成后：填充源语言 + 自动翻译目标语言
  useEffect(() => {
    if (stage === 'done' && taskInfo?.result?.segments) {
      const detected = taskInfo.language || 'unknown'
      const segs = taskInfo.result.segments

      setTranslations(prev => {
        const t = { ...prev }
        t[detected] = {}
        segs.forEach(s => { t[detected][makeKey(keyPrefix, s.id)] = s.text })
        targetLangs.forEach(code => {
          if (!t[code]) t[code] = {}
          segs.forEach(s => {
            const key = makeKey(keyPrefix, s.id)
            if (!(key in t[code])) t[code][key] = ''
          })
        })
        return t
      })
      setActiveLangIdx(0)

      // 自动翻译
      if (targetLangs.length > 0) {
        setTranslating(true)
        const sourceTexts = segs.map(s => s.text)
        let i = 0
        const next = async () => {
          if (i >= targetLangs.length) { setTranslating(false); return }
          const code = targetLangs[i]
          try {
            const res = await translateTexts(sourceTexts, detected, code)
            setTranslations(prev => {
              const t = { ...prev }
              t[code] = {}
              segs.forEach((s, j) => { t[code][makeKey(keyPrefix, s.id)] = res.translations[j] || '' })
              return t
            })
          } catch (e) { console.error(`translate ${code} failed:`, e) }
          i++
          next()
        }
        next()
      }
    }
  }, [stage, taskInfo])

  const handleAddLang = useCallback(async (code) => {
    if (!code || targetLangs.includes(code) || sourceLang === code) return
    setTargetLangs(prev => [...prev, code])
    setShowAddLang(false)
    setNewLangInput('')
    const newIdx = sourceLang ? targetLangs.length + 1 : targetLangs.length
    setActiveLangIdx(newIdx)

    if (segments.length > 0) {
      const detected = sourceLang || 'auto'
      const sourceTexts = segments.map(s => s.text)
      try {
        const res = await translateTexts(sourceTexts, detected, code)
        setTranslations(prev => {
          const t = { ...prev }
          t[code] = {}
          segments.forEach((s, j) => { t[code][makeKey(keyPrefix, s.id)] = res.translations[j] || '' })
          return t
        })
      } catch (e) { console.error(`translate ${code} failed:`, e) }
    }
  }, [targetLangs, sourceLang, segments, keyPrefix])

  const handleRemoveLang = useCallback((code) => {
    setTranslations(prev => { const t = { ...prev }; delete t[code]; return t })
    setTargetLangs(prev => {
      const idx = prev.indexOf(code)
      const nc = prev.filter(c => c !== code)
      if (activeLangIdx !== null && idx >= 0) {
        const ri = sourceLang ? idx + 1 : idx
        if (activeLangIdx === ri || activeLangIdx >= nc.length + (sourceLang ? 1 : 0))
          setActiveLangIdx(Math.max(0, (nc.length + (sourceLang ? 1 : 0)) - 1))
      }
      return nc
    })
  }, [sourceLang, activeLangIdx])

  const handleRetranslate = useCallback(async () => {
    if (!segments.length || targetLangs.length === 0) return
    const detected = sourceLang || 'auto'
    setTranslating(true)
    const sourceTexts = segments.map(s => s.text)
    let i = 0
    const next = async () => {
      if (i >= targetLangs.length) { setTranslating(false); return }
      const code = targetLangs[i]
      try {
        const res = await translateTexts(sourceTexts, detected, code)
        setTranslations(prev => {
          const t = { ...prev }
          t[code] = {}
          segments.forEach((s, j) => { t[code][makeKey(keyPrefix, s.id)] = res.translations[j] || '' })
          return t
        })
      } catch (e) { console.error(`translate ${code} failed:`, e) }
      i++
      next()
    }
    next()
  }, [segments, targetLangs, sourceLang, keyPrefix])

  const handleUpdateTranslation = useCallback((langCode, key, value) => {
    setTranslations(prev => {
      const t = { ...prev }
      if (!t[langCode]) t[langCode] = {}
      t[langCode] = { ...t[langCode], [key]: value }
      return t
    })
  }, [])

  const handleUpload = useCallback(async (file) => {
    setSelectedFile(file)
    setStage('uploading')
    setErrorMsg('')
    try {
      const data = await uploadVideo(file)
      setTaskId(data.task_id)
      setStage('processing')
    } catch (e) { setErrorMsg(e.message); setStage('error') }
  }, [])

  const handleTaskUpdate = useCallback((info) => {
    setTaskInfo(info)
    if (info.status === 'done') setStage('done')
    else if (info.status === 'error') { setErrorMsg(info.message); setStage('error') }
  }, [])

  const handleReset = useCallback(() => {
    setStage('idle')
    setTaskId(null)
    setTaskInfo(null)
    setSelectedFile(null)
    setErrorMsg('')
    setTranslations({})
    setTargetLangs([])
    setActiveLangIdx(null)
    setTranslating(false)
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
            <>
              {/* 目标语言选择卡 */}
              <div className="shared-lang-bar">
                <div className="lang-bar-title">
                  🌐 选择目标语言（可选）
                  <span className="lang-bar-hint">选择后，识别完成即可自动翻译</span>
                </div>
                <div className="shared-lang-tabs">
                  {targetLangs.map((code) => (
                    <button key={code} className="shared-lang-tab" title={LANG_LABELS[code]}>
                      <span className="lang-flag">{LANG_FLAGS[code] || '🌐'}</span>
                      <span className="lang-name">{LANG_LABELS[code] || code}</span>
                      <span className="lang-remove" onClick={(e) => { e.stopPropagation(); handleRemoveLang(code) }}>×</span>
                    </button>
                  ))}
                  <button className="shared-lang-add-btn" onClick={() => setShowAddLang(!showAddLang)}>
                    + 添加语言
                  </button>
                </div>
                {showAddLang && (
                  <div className="shared-lang-add-row">
                    <select className="lang-select" value={newLangInput} onChange={(e) => setNewLangInput(e.target.value)}>
                      <option value="">选择语言...</option>
                      {Object.entries(LANG_LABELS).filter(([c]) => !targetLangs.includes(c)).map(([c, lb]) => (
                        <option key={c} value={c}>{LANG_FLAGS[c] || ''} {lb} ({c})</option>
                      ))}
                    </select>
                    <button className="lang-confirm-btn" onClick={() => handleAddLang(newLangInput)} disabled={!newLangInput}>确认添加</button>
                    <button className="lang-cancel-btn" onClick={() => { setShowAddLang(false); setNewLangInput('') }}>取消</button>
                  </div>
                )}
              </div>

              <UploadZone onUpload={handleUpload} isUploading={stage === 'uploading'} selectedFile={selectedFile} />
            </>
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
              {/* 共享语言标签栏 */}
              <div className="shared-lang-bar">
                <div className="lang-bar-title">
                  🌐 语言切换
                  {translating && <span className="lang-bar-translating">🔄 翻译中...</span>}
                </div>
                <div className="shared-lang-tabs">
                  {runtimeLangs.map((code, idx) => (
                    <button
                      key={code}
                      className={`shared-lang-tab ${idx === activeLangIdx ? 'active' : ''}`}
                      onClick={() => setActiveLangIdx(idx)}
                      title={LANG_LABELS[code] || code}
                    >
                      <span className="lang-flag">{LANG_FLAGS[code] || '🌐'}</span>
                      <span className="lang-name">{LANG_LABELS[code] || code}</span>
                      {code === sourceLang && <span className="lang-source-badge">源</span>}
                      {code !== sourceLang && (
                        <span className="lang-remove" onClick={(e) => { e.stopPropagation(); handleRemoveLang(code) }}>×</span>
                      )}
                    </button>
                  ))}
                  <button className="shared-lang-add-btn" onClick={() => setShowAddLang(!showAddLang)}>
                    + 添加语言
                  </button>
                </div>
                {showAddLang && (
                  <div className="shared-lang-add-row">
                    <select className="lang-select" value={newLangInput} onChange={(e) => setNewLangInput(e.target.value)}>
                      <option value="">选择语言...</option>
                      {Object.entries(LANG_LABELS).filter(([c]) => !targetLangs.includes(c) && c !== sourceLang).map(([c, lb]) => (
                        <option key={c} value={c}>{LANG_FLAGS[c] || ''} {lb} ({c})</option>
                      ))}
                    </select>
                    <button className="lang-confirm-btn" onClick={() => handleAddLang(newLangInput)} disabled={!newLangInput}>确认添加</button>
                    <button className="lang-cancel-btn" onClick={() => { setShowAddLang(false); setNewLangInput('') }}>取消</button>
                  </div>
                )}
              </div>

              <div className="result-panels">
                <SubtitlePreview
                  segments={taskInfo.result.segments}
                  langCodes={runtimeLangs}
                  translations={translations}
                  activeLangIndex={activeLangIdx}
                  sourceLang={sourceLang}
                  keyPrefix={keyPrefix}
                />
                <ExportPanel
                  segments={taskInfo.result.segments}
                  filename={selectedFile?.name}
                  langCodes={runtimeLangs}
                  translations={translations}
                  activeLangIndex={activeLangIdx}
                  onUpdateTranslation={handleUpdateTranslation}
                  translating={translating}
                  onRetranslate={handleRetranslate}
                  keyPrefix={keyPrefix}
                />
              </div>
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
