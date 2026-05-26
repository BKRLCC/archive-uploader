import React, { useEffect, useState } from 'react'
import ImagePreviewPopup from './ImagePreviewPopup'
import './ClickableImagePreview.css'

const ClickableImagePreview: React.FC<{
  imageUrl: string
  popupImageUrl?: string
  altText?: string
}> = ({ imageUrl, popupImageUrl, altText }) => {
  const [isPopupOpen, setPopupOpen] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [imageUrl])

  if (hasError) return null

  return (
    <>
      <img
        src={imageUrl}
        alt={altText || 'Thumbnail'}
        className="clickable-thumbnail"
        loading="lazy"
        decoding="async"
        onError={() => setHasError(true)}
        onClick={() => setPopupOpen(true)}
      />
      <ImagePreviewPopup
        isOpen={isPopupOpen}
        onClose={() => setPopupOpen(false)}
        imageUrl={popupImageUrl ?? imageUrl}
        altText={altText}
      />
    </>
  )
}

export default ClickableImagePreview
