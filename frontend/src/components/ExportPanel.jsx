import { useState, useCallback } from 'react'
import './ExportPanel.css'

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

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return [String(h).padStart(2, '0'), String(m).padStart(2, '0'), String(s).padStart(2, '0')].join(':')
}

export default function ExportPanel({ segments, filename, langCodes, translations, activeLangIndex, onUpdateTranslation, translating, onRetranslate, keyPrefix }) {
  const [exported, setExported] = useState(false)

  const sourceLang = langCodes[0] || ''
  const currentLang = langCodes[activeLangIndex] || sourceLang

  const downloadJson = useCallback((data, downloadFilename) => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = downloadFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const handleExport = useCallback(() => {
    const baseName = filename ? filename.replace(/\.[^.]+$/, '') : 'subtitles'

    const config = {
      segments: segments.map(seg => ({
        id: seg.id,
        start: seg.start,
        end: seg.end,
        text: makeKey(keyPrefix, seg.id),
      })),
    }

    const langData = {}
    langCodes.forEach(code => {
      langData[code] = translations[code] || {}
    })

    downloadJson(config, `${baseName}_config.json`)
    downloadJson(langData, `${baseName}_language.json`)

    setExported(true)
    setTimeout(() => setExported(false), 2000)
  }, [segments, filename, langCodes, translations, keyPrefix, downloadJson])

  const previewCount = Math.min(segments.length, 3)

  const configPreview = {
    segments: segments.slice(0, previewCount).map(seg => ({
      id: seg.id,
      start: seg.start,
      end: seg.end,
      text: makeKey(keyPrefix, seg.id),
    })),
  }

  const langPreview = {}
  langCodes.forEach(code => {
    langPreview[code] = {}
    segments.slice(0, previewCount).forEach(seg => {
      const key = makeKey(keyPrefix, seg.id)
      langPreview[code][key] = translations[code]?.[key] || ''
    })
  })

  return (
    <div className="export-panel">
      <div className="export-header">
        <div className="export-header-left">
          <span className="export-icon">💾</span>
          <h3 className="export-title">翻译编辑 & 导出</h3>
        </div>
        <div className="export-stats">
          <span className="stat-item">
            <span className="stat-label">字幕条数</span>
            <span className="stat-value">{segments.length}</span>
          </span>
        </div>
      </div>

      <div className="translation-editor-wrap">
        <div className="translation-editor-header">
          <span className="editor-lang-label">
            {LANG_FLAGS[currentLang] || '🌐'} {currentLang}
            {currentLang === sourceLang ? '（源语言）' : (
              translating ? '（🔄 翻译中...）' : '（编辑翻译）'
            )}
          </span>
          {currentLang !== sourceLang && (
            <span className="editor-hint">参考原文：{sourceLang}</span>
          )}
        </div>

        <div className="translation-editor">
          {segments.map(seg => {
            const key = makeKey(keyPrefix, seg.id)
            const sourceText = translations[sourceLang]?.[key] || seg.text
            const currentText = translations[currentLang]?.[key] || ''

            return (
              <div key={seg.id} className="translation-row">
                <div className="translation-row-header">
                  <code className="translation-key">{key}</code>
                  <span className="translation-time">
                    {formatTime(seg.start)} → {formatTime(seg.end)}
                    <span className="translation-duration">({(seg.end - seg.start).toFixed(1)}s)</span>
                  </span>
                </div>

                {currentLang !== sourceLang && (
                  <div className="translation-ref">
                    <span className="translation-ref-label">🇨🇳 原文：</span>
                    {sourceText}
                  </div>
                )}

                {currentLang === sourceLang ? (
                  <div className="translation-source-text">{sourceText}</div>
                ) : (
                  <textarea
                    className="translation-input"
                    value={currentText}
                    onChange={(e) => onUpdateTranslation(currentLang, key, e.target.value)}
                    placeholder={`输入 ${currentLang} 翻译...`}
                    rows={Math.max(1, Math.ceil((currentText || sourceText).length / 50))}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="export-preview-section">
        <div className="preview-tabs">
          <span className="preview-tab active">📄 config.json 预览</span>
        </div>
        <pre className="json-preview">
          <code>{JSON.stringify(configPreview, null, 2)}</code>
          {segments.length > previewCount && (
            <div className="json-fade">
              <span className="json-more-hint">... 还有 {segments.length - previewCount} 条</span>
            </div>
          )}
        </pre>

        <div className="preview-tabs" style={{ marginTop: 12 }}>
          <span className="preview-tab active">🌐 language.json 预览</span>
        </div>
        <pre className="json-preview">
          <code>{JSON.stringify(langPreview, null, 2)}</code>
          {segments.length > previewCount && (
            <div className="json-fade">
              <span className="json-more-hint">... 还有 {segments.length - previewCount} 条</span>
            </div>
          )}
        </pre>
      </div>

      <div className="export-actions">
        {currentLang !== sourceLang && onRetranslate && (
          <button className="export-btn secondary" onClick={onRetranslate} disabled={translating}>
            {translating ? <><span>🔄</span> 翻译中...</> : <><span>🔁</span> 重新翻译</>}
          </button>
        )}
        <button className={`export-btn primary ${exported ? 'success' : ''}`} onClick={handleExport}>
          {exported ? <><span>✅</span> 已下载！</> : <><span>⬇️</span> 下载 config.json + language.json</>}
        </button>
      </div>

      <div className="export-format-info">
        <div className="format-info-title">📐 导出格式说明</div>
        <p className="format-info-desc">导出会生成两个 JSON 文件，配合使用实现多语言字幕：</p>
        <div className="format-fields">
          <div className="format-field"><code>_config.json</code><span>包含 id / start / end，text 字段引用 language.json 的 key</span></div>
          <div className="format-field"><code>_language.json</code><span>{'{ 语言代码: { key: 翻译文本 } }'} 的多语言映射表</span></div>
        </div>
        <div className="format-usage">
          <span className="format-usage-title">💡 使用方式：</span>
          <code className="format-usage-code">languageJson[langCode][configSegment.text]</code>
        </div>
      </div>
    </div>
  )
}
