import React, { useState } from 'react'
import PopupOverlay from './PopupOverlay'
import './ImagePreviewPopup.css'

interface ImagePreviewPopupProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  altText?: string
}

const ImagePreviewPopup: React.FC<ImagePreviewPopupProps> = ({
  isOpen,
  onClose,
  imageUrl,
  altText,
}) => {
  return (
    <PopupOverlay isOpen={isOpen} onClose={onClose}>
      <img
        src={imageUrl}
        alt={altText || 'Image preview'}
        className="image-preview"
      />
    </PopupOverlay>
  )
}

export default ImagePreviewPopup
