import './SubtitlePreview.css'

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return [
    String(h).padStart(2, '0'),
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].join(':')
}

const LANG_MAP = {
  zh: '中文',
  en: '英语',
  ja: '日语',
  ko: '韩语',
  fr: '法语',
  de: '德语',
  es: '西班牙语',
  ru: '俄语',
  ar: '阿拉伯语',
  pt: '葡萄牙语',
  it: '意大利语',
  unknown: '未知',
}

export default function SubtitlePreview({ segments, language }) {
  const langLabel = LANG_MAP[language] || language || '未知'

  return (
    <div className="subtitle-panel">
      {/* 面板头部 */}
      <div className="subtitle-header">
        <div className="subtitle-header-left">
          <span className="subtitle-icon">📝</span>
          <h3 className="subtitle-title">字幕预览</h3>
          <span className="subtitle-count">{segments.length} 条</span>
        </div>
        <div className="subtitle-header-right">
          <span className="lang-badge">🌐 {langLabel}</span>
        </div>
      </div>

      {/* 字幕列表 */}
      <div className="subtitle-list">
        {segments.length === 0 ? (
          <div className="subtitle-empty">
            <span>🔇</span>
            <p>未识别到语音内容</p>
          </div>
        ) : (
          segments.map((seg, idx) => (
            <div key={seg.id} className="subtitle-item">
              {/* 序号 */}
              <div className="seg-index">{seg.id}</div>

              {/* 内容 */}
              <div className="seg-body">
                {/* 时间轴 */}
                <div className="seg-time">
                  <span className="time-start">{formatTime(seg.start)}</span>
                  <span className="time-arrow">→</span>
                  <span className="time-end">{formatTime(seg.end)}</span>
                  <span className="time-duration">
                    {(seg.end - seg.start).toFixed(1)}s
                  </span>
                </div>

                {/* 字幕文本 */}
                <p className="seg-text">{seg.text}</p>
              </div>

              {/* 分隔线（最后一条不显示） */}
              {idx < segments.length - 1 && <div className="seg-divider" />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
