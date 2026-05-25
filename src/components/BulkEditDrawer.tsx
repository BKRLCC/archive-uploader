import React, { useMemo, useRef, useState } from 'react'
import Drawer from './Drawer'
import ItemEditForm, { type ItemEditFormHandle } from './ItemEditForm'

interface BulkEditDrawerProps {
  open: boolean
  headers: string[]
  rows: string[][]
  rowIndices: number[]
  xlsxPath: string
  sheetName: string
  onComplete: (updatedRows: string[][]) => void
  onClose: () => void
}

function getSharedInitialValues(headers: string[], rows: string[][]): string[] {
  if (rows.length === 0) return headers.map(() => '')

  return headers.map((_, columnIndex) => {
    const first = String(rows[0]?.[columnIndex] ?? '')
    const allSame = rows.every(
      (row) => String(row[columnIndex] ?? '') === first,
    )
    return allSame ? first : ''
  })
}

export default function BulkEditDrawer({
  open,
  headers,
  rows,
  rowIndices,
  xlsxPath,
  sheetName,
  onComplete,
  onClose,
}: BulkEditDrawerProps) {
  const formRef = useRef<ItemEditFormHandle>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const initialValues = useMemo(
    () => getSharedInitialValues(headers, rows),
    [headers, rows],
  )

  const handleSave = async () => {
    if (!formRef.current) return

    setSaving(true)
    setFeedback('Saving…')

    const validationError = await formRef.current.validate()
    if (validationError) {
      setFeedback(validationError)
      setSaving(false)
      return
    }

    const { values, virtualValues } = formRef.current.getValues()
    const updatedValues: Record<string, string> = {}

    headers.forEach((header, index) => {
      if (header === '@id') return
      const value = String(values[index] ?? '')
      if (value.trim()) {
        updatedValues[header] = value
      }
    })

    Object.entries(virtualValues).forEach(([field, value]) => {
      const trimmed = String(value ?? '').trim()
      if (trimmed) {
        updatedValues[field] = trimmed
      }
    })

    try {
      const updatedRows: string[][] = []
      for (const rowIndex of rowIndices) {
        const updated = await window.api.updateSheetRow(
          xlsxPath,
          sheetName,
          rowIndex,
          updatedValues,
        )
        updatedRows.push(updated)
      }
      onComplete(updatedRows)
      onClose()
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`)
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} width={360}>
      <div className="drawer-inner">
        <h3>Edit selected items</h3>
        <p className="edit-field-readonly">
          {rowIndices.length} selected row{rowIndices.length === 1 ? '' : 's'}
          will receive the same changes.
        </p>
        <ItemEditForm
          ref={formRef}
          headers={headers}
          initialValues={initialValues}
          xlsxPath={xlsxPath}
          sheetName={sheetName}
          hiddenFields={['@id']}
          onFeedback={setFeedback}
        />
        <div className="edit-actions">
          <button onClick={handleSave} disabled={saving}>
            Save changes
          </button>
          <button onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
        {feedback && <p className="edit-feedback">{feedback}</p>}
      </div>
    </Drawer>
  )
}
