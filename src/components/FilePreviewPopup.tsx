import React, { useEffect, useMemo, useState } from 'react'
import type { PreviewKind } from '../config/previewable-file-types'
import PopupOverlay from './PopupOverlay'
import './FilePreviewPopup.css'

interface FilePreviewPopupProps {
  isOpen: boolean
  onClose: () => void
  filePath: string
  fileName?: string
  previewKind: PreviewKind
}

const FilePreviewPopup: React.FC<FilePreviewPopupProps> = ({
  isOpen,
  onClose,
  filePath,
  fileName,
  previewKind,
}) => {
  const [resolvedVideoPath, setResolvedVideoPath] = useState(filePath)
  const [videoPreparing, setVideoPreparing] = useState(false)
  const [videoError, setVideoError] = useState('')

  useEffect(() => {
    setResolvedVideoPath(filePath)
    setVideoPreparing(false)
    setVideoError('')

    if (!isOpen || previewKind !== 'video') return

    setVideoPreparing(true)
    void window.api
      .getVideoPreviewPath(filePath)
      .then((result) => {
        if (!result?.previewPath) return
        setResolvedVideoPath(result.previewPath)
      })
      .catch((err: unknown) => {
        setVideoError(
          `Preview transcoding failed: ${(err as Error).message}. Trying original file.`,
        )
      })
      .finally(() => {
        setVideoPreparing(false)
      })
  }, [filePath, isOpen, previewKind])

  const mediaUrl = useMemo(() => {
    const targetPath = previewKind === 'video' ? resolvedVideoPath : filePath
    return `localfile://${targetPath}`
  }, [filePath, previewKind, resolvedVideoPath])

  return (
    <PopupOverlay isOpen={isOpen} onClose={onClose}>
      <div className="file-preview-popup-content">
        {fileName && <p className="file-preview-popup-title">{fileName}</p>}

        {previewKind === 'image' ? (
          <img
            src={mediaUrl}
            alt={fileName || 'Image preview'}
            className="file-preview-popup-image"
          />
        ) : previewKind === 'audio' ? (
          <audio
            className="file-preview-popup-audio"
            controls
            autoPlay
            src={mediaUrl}
          >
            Your browser does not support audio playback.
          </audio>
        ) : previewKind === 'video' ? (
          <>
            {videoPreparing && (
              <p className="file-preview-popup-status">Preparing video preview…</p>
            )}
            {videoError && (
              <p className="file-preview-popup-status">{videoError}</p>
            )}
            <video
              className="file-preview-popup-video"
              controls
              autoPlay
              src={mediaUrl}
              onError={() => {
                setVideoError(
                  'Video codec is not supported for in-app playback. Open externally if needed.',
                )
              }}
            >
              Your browser does not support video playback.
            </video>
          </>
        ) : (
          <p className="file-preview-popup-fallback">Preview is unavailable.</p>
        )}
      </div>
    </PopupOverlay>
  )
}

export default FilePreviewPopup
