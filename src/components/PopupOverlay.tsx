import React, { useState, useEffect } from 'react'
import './PopupOverlay.css'

interface PopupOverlayProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

const PopupOverlay: React.FC<PopupOverlayProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  )
}

export default PopupOverlay
