import React from 'react'
import PopupOverlay from './PopupOverlay'
import ZoomableImage from './ZoomableImage'

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
      <ZoomableImage src={imageUrl} alt={altText} />
    </PopupOverlay>
  )
}

export default ImagePreviewPopup
