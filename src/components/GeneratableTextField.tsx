import React, { useState } from 'react'
import { UiIcons } from '../config/icons'

interface Props {
  value: string
  onChange: (value: string) => void
  // When provided, a button that fills the field with its return value appears
  // while the field is empty.
  onGenerate?: () => string
  // Once the field has a value (on mount or after generating), lock it read-only.
  lockWhenSet?: boolean
  placeholder?: string
  buttonTitle?: string
}

// A text input with an optional generate button, used to backfill values like
// a persistent identifier while keeping the field free-text editable.
export default function GeneratableTextField({
  value,
  onChange,
  onGenerate,
  lockWhenSet = false,
  placeholder,
  buttonTitle = 'Generate',
}: Props) {
  const [locked, setLocked] = useState(() => Boolean(lockWhenSet && value))

  if (locked) {
    return (
      <span className="generatable-field">
        <input
          type="text"
          className="generatable-field-locked"
          value={value}
          readOnly
          title="This identifier is fixed once set and cannot be edited."
        />
      </span>
    )
  }

  const handleGenerate = () => {
    if (!onGenerate) return
    onChange(onGenerate())
    if (lockWhenSet) setLocked(true)
  }

  const showGenerate = Boolean(onGenerate) && !value
  return (
    <span className="generatable-field">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {showGenerate && (
        <button
          type="button"
          className="generatable-field-button"
          title={buttonTitle}
          aria-label={buttonTitle}
          onClick={handleGenerate}
        >
          {UiIcons.refresh}
        </button>
      )}
    </span>
  )
}
