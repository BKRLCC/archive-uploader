import React from 'react'
import Select from 'react-select'
import type { ReferenceOption } from './ReferenceSelect'

interface Props {
  options: ReferenceOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
}

const splitIds = (value: string): string[] =>
  value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

// A multi-select reference dropdown for the bespoke collection forms (create +
// edit). Like ReferenceSelect it deals in bare @id strings, but the value is a
// comma-separated list of @ids — split into option objects on the way in and
// joined back with commas on the way out. Handles the "no options" disabled
// case so callers only supply an options list and a key.
export default function MultiReferenceSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  emptyLabel = 'None available',
}: Props) {
  const isEmpty = options.length === 0
  const selectedIds = splitIds(value)
  const selected = selectedIds
    .map((id) => options.find((option) => option.value === id))
    .filter((option): option is ReferenceOption => option != null)

  return (
    <Select<ReferenceOption, true>
      isMulti
      isClearable
      options={options}
      value={selected}
      onChange={(selectedOptions) =>
        onChange(selectedOptions.map((option) => option.value).join(','))
      }
      placeholder={isEmpty ? emptyLabel : placeholder}
      noOptionsMessage={() => emptyLabel}
      isDisabled={isEmpty}
    />
  )
}
