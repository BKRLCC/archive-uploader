import React, { useMemo, useState } from 'react'
import { getItemTypeForSheetName } from '../helpers/item-types'
import { toCamelCase } from '../helpers/string-formatters'
import PopupOverlay from './PopupOverlay'
import './BulkAddListPopup.css'

interface Props {
  isOpen: boolean
  xlsxPath: string
  sheetName: string
  headers: string[]
  onComplete: (addedRows: string[][]) => void
  onClose: () => void
}

function generateId(type: string, name: string): string {
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `#${type}_${toCamelCase(name || 'item')}_${rand}`
}

interface ParseResult {
  rows: Array<Record<string, string>>
  unknownHeaders: string[]
}

function parseInput(rawText: string, sheetHeaders: string[]): ParseResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return { rows: [], unknownHeaders: [] }

  const csvHeaders = lines[0].split(',').map((h) => h.trim())
  const sheetHeadersLower = sheetHeaders.map((h) => h.toLowerCase())

  const unknownHeaders = csvHeaders.filter(
    (h) => !sheetHeadersLower.includes(h.toLowerCase()),
  )

  const resolvedHeaders = csvHeaders.map((h) => {
    const idx = sheetHeadersLower.indexOf(h.toLowerCase())
    return idx >= 0 ? sheetHeaders[idx] : null
  })

  const rows: Array<Record<string, string>> = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim())
    const record: Record<string, string> = {}
    resolvedHeaders.forEach((header, j) => {
      if (header !== null) {
        record[header] = cells[j] ?? ''
      }
    })
    // Skip rows where the name field is present but empty
    if ('name' in record && !record['name']) continue
    rows.push(record)
  }

  return { rows, unknownHeaders }
}

export default function BulkAddListPopup({
  isOpen,
  xlsxPath,
  sheetName,
  headers,
  onComplete,
  onClose,
}: Props) {
  const [rawText, setRawText] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const { rows: parsedRows, unknownHeaders } = useMemo(
    () => parseInput(rawText, headers),
    [rawText, headers],
  )

  async function handleSubmit() {
    if (parsedRows.length === 0 || busy) return
    setBusy(true)
    setFeedback('Adding…')

    const type = getItemTypeForSheetName(sheetName)
    const addedRows: string[][] = []

    try {
      for (const record of parsedRows) {
        const name = record['name'] ?? ''
        const id = generateId(type, name)
        const values: Record<string, string> = {
          ...record,
          '@id': id,
          '@type': type,
        }
        const row = await window.api.addSheetRow(xlsxPath, sheetName, values)
        addedRows.push(row)
      }
      onComplete(addedRows)
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`)
      setBusy(false)
    }
  }

  const rowCount = parsedRows.length

  return (
    <PopupOverlay isOpen={isOpen} onClose={onClose}>
      <div className="bulk-list-popup-content">
        <h3>Bulk add to {sheetName}</h3>
        <p className="bulk-list-help">
          Paste a list with a header row naming the columns (e.g.{' '}
          <code>name</code> or <code>name,description</code>). One item per
          line. <code>@id</code> and <code>@type</code> are set automatically.
        </p>
        <textarea
          className="bulk-list-textarea"
          placeholder={`name,description\nDan Kennedy,teacher\nJohn Smith,student\nRosa Johnson,student`}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value)
            setFeedback('')
          }}
          disabled={busy}
          spellCheck={false}
        />
        {unknownHeaders.length > 0 && (
          <p className="bulk-list-warning">
            Unknown columns (will be ignored): {unknownHeaders.join(', ')}
          </p>
        )}
        <p className="bulk-list-preview">
          {rowCount > 0
            ? `Will add ${rowCount} row${rowCount === 1 ? '' : 's'}`
            : rawText.trim()
              ? 'No valid rows found — check the format above.'
              : ''}
        </p>
        <div className="bulk-list-footer">
          <button onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={rowCount === 0 || busy}>
            {busy
              ? 'Adding…'
              : rowCount > 0
                ? `Add ${rowCount} row${rowCount === 1 ? '' : 's'}`
                : 'Add rows'}
          </button>
        </div>
        {feedback && <p className="bulk-list-feedback">{feedback}</p>}
      </div>
    </PopupOverlay>
  )
}
