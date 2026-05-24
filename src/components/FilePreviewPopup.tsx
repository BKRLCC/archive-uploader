import React from 'react'
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
  const mediaUrl = `localfile://${filePath}`

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
        ) : (
          <p className="file-preview-popup-fallback">Preview is unavailable.</p>
        )}
      </div>
    </PopupOverlay>
  )
}

export default FilePreviewPopup
