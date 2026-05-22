import React, { useState } from 'react'
import ImagePreviewPopup from './ImagePreviewPopup'
import './ClickableImagePreview.css'

const ClickableImagePreview: React.FC<{
  imageUrl: string
  altText?: string
}> = ({ imageUrl, altText }) => {
  const [isPopupOpen, setPopupOpen] = useState(false)

  return (
    <>
      <img
        src={imageUrl}
        alt={altText || 'Thumbnail'}
        className="clickable-thumbnail"
        onClick={() => setPopupOpen(true)}
      />
      <ImagePreviewPopup
        isOpen={isPopupOpen}
        onClose={() => setPopupOpen(false)}
        imageUrl={imageUrl}
        altText={altText}
      />
    </>
  )
}

export default ClickableImagePreview
