import React, { useState } from 'react'
import Select from 'react-select'

interface FileOption {
  value: string
  label: string
  searchText: string
}

export const FILE_LINKS_FIELD_NAME = 'isRef_hasPart'

interface FileLinksFieldProps {
  value: string
  archiveFolderPath: string
  onChange: (nextValue: string) => void
  onFeedback?: (message: string) => void
}

function normalizeLinkedFilePath(pathValue: string): string {
  return String(pathValue ?? '')
    .trim()
    .replace(/\\+/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
}

function parseLinkedFilePaths(rawValue: string): string[] {
  const unique = new Set<string>()
  for (const token of String(rawValue ?? '').split(',')) {
    const normalized = normalizeLinkedFilePath(token)
    if (!normalized) continue
    unique.add(normalized)
  }
  return Array.from(unique)
}

export default function FileLinksField({
  value,
  archiveFolderPath,
  onChange,
  onFeedback,
}: FileLinksFieldProps) {
  const [isPicking, setIsPicking] = useState(false)
  const linkedFilePaths = parseLinkedFilePaths(value)
  const linkedFileOptions: FileOption[] = linkedFilePaths.map((linkedPath) => ({
    value: linkedPath,
    label: linkedPath,
    searchText: linkedPath.toLowerCase(),
  }))

  const handlePickLinkedFiles = async () => {
    setIsPicking(true)
    try {
      const picked = await window.api.pickLinkedFiles(archiveFolderPath)
      if (!picked || picked.length === 0) return

      const combined = [...linkedFilePaths]
      for (const pathValue of picked) {
        const normalized = normalizeLinkedFilePath(pathValue)
        if (!normalized) continue
        if (!combined.includes(normalized)) {
          combined.push(normalized)
        }
      }

      onChange(combined.join(', '))
      onFeedback?.('')
    } catch (err) {
      onFeedback?.(`✗ ${(err as Error).message}`)
    } finally {
      setIsPicking(false)
    }
  }

  return (
    <>
      <Select
        isMulti
        isSearchable={false}
        menuIsOpen={false}
        options={linkedFileOptions}
        value={linkedFileOptions}
        onChange={(selected) => {
          const ids = Array.isArray(selected)
            ? selected.map((option) => option.value)
            : []
          onChange(ids.join(', '))
        }}
        placeholder="No files selected"
        styles={{
          multiValue: (base) => ({
            ...base,
            background: 'rgba(166,43,43,0.15)',
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: '#a62b2b',
          }),
          control: (base) => ({
            ...base,
            borderColor: '#a62b2b',
            minHeight: 34,
          }),
        }}
      />
      <div className="depiction-actions">
        <button
          type="button"
          onClick={() => {
            void handlePickLinkedFiles()
          }}
          disabled={isPicking}
        >
          {isPicking ? 'Choosing…' : 'Add files…'}
        </button>
        <button
          type="button"
          onClick={() => {
            onChange('')
          }}
          disabled={linkedFilePaths.length === 0}
        >
          Clear
        </button>
      </div>
    </>
  )
}
