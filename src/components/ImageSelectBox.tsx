import React from 'react'
import ClickableImagePreview from './ClickableImagePreview'
import { UiIcons } from '../config/icons'
import './ImageSelectBox.css'

interface ImageSelectBoxProps {
  imageUrl?: string
  onPick: () => void
  onClear: () => void
  picking?: boolean
  emptyLabel?: string
  altText?: string
}

// Prominent, centered image selector. Standalone and reusable.
// - No image: a grey box with a camera icon; clicking it triggers `onPick`.
// - Image set: the image (click-to-enlarge via ClickableImagePreview) with
//   "Change image" and "Clear" buttons beneath it.
export default function ImageSelectBox({
  imageUrl,
  onPick,
  onClear,
  picking = false,
  emptyLabel = 'Add image',
  altText = 'Depiction Preview',
}: ImageSelectBoxProps): React.ReactElement {
  return (
    <div className="image-select-box">
      {imageUrl ? (
        <div className="image-select-preview">
          <ClickableImagePreview imageUrl={imageUrl} altText={altText} />
          <div className="image-select-overlay">
            <button
              type="button"
              className="image-select-overlay-button"
              onClick={onPick}
              disabled={picking}
              aria-label="Change image"
              title="Change image"
            >
              <span aria-hidden="true">{UiIcons.edit}</span>
            </button>
            <button
              type="button"
              className="image-select-overlay-button"
              onClick={onClear}
              disabled={picking}
              aria-label="Clear image"
              title="Clear image"
            >
              <span aria-hidden="true">{UiIcons.clear}</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="image-select-empty"
          onClick={onPick}
          disabled={picking}
          aria-label={emptyLabel}
        >
          <span className="image-select-empty-icon" aria-hidden="true">
            {UiIcons.camera}
          </span>
          <span className="image-select-empty-label">
            {picking ? 'Choosing…' : emptyLabel}
          </span>
        </button>
      )}
    </div>
  )
}
