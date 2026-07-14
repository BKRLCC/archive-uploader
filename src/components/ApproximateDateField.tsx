import React, { useState } from 'react'
import DatePicker from './DatePicker'

interface ApproximateDateFieldProps {
  /** Exact machine date (ISO YYYY-MM-DD). */
  dateValue: string
  /** Human-readable approximate label, e.g. "Before 1957". */
  approximateValue: string
  onDateChange: (nextValue: string) => void
  onApproximateChange: (nextValue: string) => void
}

// An exact date input paired with an optional "Approximate date?" toggle.
// When ticked, a free-text box lets the user record a human-readable label
// (e.g. "Before 1957") while the exact date is still kept for the system.
// The approximate entry is gated behind having an exact date first.
export default function ApproximateDateField({
  dateValue,
  approximateValue,
  onDateChange,
  onApproximateChange,
}: ApproximateDateFieldProps): React.ReactElement {
  const [isApproximate, setIsApproximate] = useState(
    () => approximateValue.trim() !== '',
  )

  const hasExactDate = dateValue.trim() !== ''
  const showApproximateInput = isApproximate

  return (
    <div className="approximate-date-field">
      <div className="approximate-date-inputs">
        <DatePicker value={dateValue} onChange={onDateChange} />
        <label className="approximate-date-toggle">
          <input
            type="checkbox"
            checked={isApproximate}
            onChange={(e) => {
              const nextChecked = e.target.checked
              setIsApproximate(nextChecked)
              if (!nextChecked) onApproximateChange('')
            }}
          />
          Approximate?
        </label>
      </div>
      {!hasExactDate && showApproximateInput && (
        <span className="approximate-date-hint">
          Enter an exact date first to add an approximate date.
        </span>
      )}
      {showApproximateInput && (
        <input
          type="text"
          className="approximate-date-text"
          disabled={!hasExactDate}
          value={approximateValue}
          placeholder={`e.g. "Before 1957"`}
          onChange={(e) => {
            onApproximateChange(e.target.value)
          }}
        />
      )}
    </div>
  )
}
