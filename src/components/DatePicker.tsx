import React from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  id?: string
  disabled?: boolean
}

// A minimal shared wrapper over the native date input. It deals in ISO
// YYYY-MM-DD strings, matching how dates are stored throughout the app. Kept
// intentionally small for now — this is the single seam through which future
// date behaviour (min/max, normalisation, clearing) can be added.
export default function DatePicker({ value, onChange, id, disabled }: Props) {
  return (
    <input
      type="date"
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
