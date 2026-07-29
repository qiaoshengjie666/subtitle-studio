import { useState, useRef, useCallback } from 'react'
import './UploadZone.css'

const ACCEPTED_TYPES = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
const ACCEPTED_MIME = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/webm',
]

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

export default function UploadZone({ onUpload, isUploading, selectedFile }) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragError, setDragError] = useState('')
  const inputRef = useRef(null)

  const validateFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
      return `不支持的格式：${ext}，请上传 MP4 / MOV / AVI / MKV / WEBM`
    }
    return null
  }

  const handleFile = useCallback((file) => {
    if (!file) return
    const err = validateFile(file)
    if (err) {
      setDragError(err)
      return
    }
    setDragError('')
    onUpload(file)
  }, [onUpload])

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // 重置 input，允许重复选同一文件
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
    setDragError('')
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleClick = () => {
    if (!isUploading) inputRef.current?.click()
  }

  return (
    <div className="upload-wrapper">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''} ${dragError ? 'has-error' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label="点击或拖拽上传视频"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {isUploading ? (
          /* 上传中状态 */
          <div className="upload-state uploading-state">
            <div className="upload-spinner" />
            <p className="upload-title">正在上传...</p>
            {selectedFile && (
              <p className="upload-filename">{selectedFile.name}</p>
            )}
          </div>
        ) : (
          /* 默认状态 */
          <div className="upload-state idle-state">
            <div className="upload-icon-wrap">
              <span className="upload-icon">🎬</span>
            </div>
            <p className="upload-title">拖拽视频到此处，或点击选择文件</p>
            <p className="upload-hint">支持 MP4 · MOV · AVI · MKV · WEBM</p>
            <button className="upload-btn" type="button" onClick={(e) => { e.stopPropagation(); handleClick() }}>
              选择视频文件
            </button>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {dragError && (
        <div className="upload-error">
          <span>⚠️</span> {dragError}
        </div>
      )}

      {/* 格式说明 */}
      <div className="format-tags">
        {ACCEPTED_TYPES.map(ext => (
          <span key={ext} className="format-tag">{ext.toUpperCase().slice(1)}</span>
        ))}
      </div>
    </div>
  )
}
