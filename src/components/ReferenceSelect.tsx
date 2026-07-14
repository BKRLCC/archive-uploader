import React from 'react'
import Select from 'react-select'

export interface ReferenceOption {
  value: string
  label: string
}

interface Props {
  options: ReferenceOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
}

// A lightweight, single-select reference dropdown for the bespoke collection
// forms (create + edit). It deals in bare @id strings — mapping to and from
// react-select's option objects internally — and handles the "no options"
// disabled/placeholder case, so callers only supply an options list and a key.
export default function ReferenceSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  emptyLabel = 'None available',
}: Props) {
  const isEmpty = options.length === 0
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Select<ReferenceOption>
      isClearable
      options={options}
      value={selected}
      onChange={(option) => onChange(option?.value ?? '')}
      placeholder={isEmpty ? emptyLabel : placeholder}
      noOptionsMessage={() => emptyLabel}
      isDisabled={isEmpty}
    />
  )
}
