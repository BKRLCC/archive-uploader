import React, { useRef, useState } from 'react'
import { getItemTypeForSheetName } from '../helpers/item-types'
import { toCamelCase } from '../helpers/string-formatters'
import { resolveEditableEntityType } from '../types/types'
import ItemEditForm, { type ItemEditFormHandle } from './ItemEditForm'

function generateId(type: string, name: string): string {
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `#${type}_${toCamelCase(name)}_${rand}`
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  headers: string[]
  row: string[]
  rowIndex: number
  xlsxPath: string
  sheetName: string
  onSave: (rowIndex: number, updated: string[]) => void
  onClose: () => void
  onDirtyChange?: (dirty: boolean) => void
  isNew?: boolean
  defaultType?: string
}

export default function EditDrawer({
  headers,
  row,
  rowIndex,
  xlsxPath,
  sheetName,
  onSave,
  onClose,
  onDirtyChange,
  isNew = false,
  defaultType,
}: Props) {
  const formRef = useRef<ItemEditFormHandle>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  // Licences identify themselves by @id (a URL or a file path), so unlike every
  // other entity the @id is user-supplied rather than auto-generated, and its
  // coupled @type is set by the editor rather than locked.
  const isLicenseSheet =
    resolveEditableEntityType(
      defaultType ?? getItemTypeForSheetName(sheetName),
    ) === 'ldac:DataReuseLicense'

  // For a new license the @type is no longer locked (the editor sets it), so
  // seed it into the initial row instead, defaulting to the URL variant.
  const initialRow = (() => {
    if (!isLicenseSheet) return row
    const typeIdx = headers.indexOf('@type')
    if (typeIdx < 0 || String(row[typeIdx] ?? '').trim()) return row
    const seeded = [...row]
    seeded[typeIdx] = defaultType ?? getItemTypeForSheetName(sheetName)
    return seeded
  })()

  function handleCancel() {
    if (
      formRef.current?.isDirty() &&
      !window.confirm('Discard unsaved changes to the current item?')
    ) {
      return
    }
    onClose()
  }

  async function handleSave() {
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

    if (isNew) {
      const nameIdx = headers.indexOf('name')
      const nameVal = (values[nameIdx] ?? '').trim()
      if (!nameVal) {
        setFeedback('✗ Name is required')
        setSaving(false)
        return
      }

      const typeIdx = headers.indexOf('@type')
      const typeVal = values[typeIdx] ?? ''

      const idIdx = headers.indexOf('@id')
      let id: string
      if (isLicenseSheet) {
        id = (values[idIdx] ?? '').trim()
        if (!id) {
          setFeedback('✗ A license URL or file is required')
          setSaving(false)
          return
        }
      } else {
        id = generateId(typeVal, nameVal)
      }

      const updatedValues: Record<string, string> = { '@id': id }
      headers.forEach((header, index) => {
        if (header === '@id') return
        updatedValues[header] = values[index] ?? ''
      })
      if (!String(updatedValues.dateAdded ?? '').trim()) {
        updatedValues.dateAdded = getTodayIsoDate()
      }
      if (!String(updatedValues.isPublishable ?? '').trim()) {
        updatedValues.isPublishable = 'FALSE'
      }
      Object.entries(virtualValues).forEach(([field, value]) => {
        const trimmed = String(value ?? '').trim()
        if (trimmed) updatedValues[field] = trimmed
      })

      try {
        const updated = await window.api.addSheetRow(
          xlsxPath,
          sheetName,
          updatedValues,
        )
        onSave(rowIndex, updated)
        onClose()
      } catch (err) {
        setFeedback(`✗ ${(err as Error).message}`)
        setSaving(false)
      }
      return
    }

    const updatedValues: Record<string, string> = {}
    headers.forEach((header, index) => {
      if (header !== '@id' || isLicenseSheet) {
        updatedValues[header] = values[index] ?? ''
      }
    })
    Object.entries(virtualValues).forEach(([field, value]) => {
      const trimmed = String(value ?? '').trim()
      if (trimmed) updatedValues[field] = trimmed
    })

    try {
      const updated = await window.api.updateSheetRow(
        xlsxPath,
        sheetName,
        rowIndex,
        updatedValues,
      )
      onSave(rowIndex, updated)
      onClose()
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`)
      setSaving(false)
    }
  }

  return (
    <div className="drawer-inner">
      <h3>{isNew ? 'Add item' : 'Edit item'}</h3>
      <ItemEditForm
        ref={formRef}
        headers={headers}
        initialValues={initialRow}
        xlsxPath={xlsxPath}
        sheetName={sheetName}
        hiddenFields={isNew && !isLicenseSheet ? ['@id'] : []}
        lockedFieldValues={
          isLicenseSheet
            ? {}
            : {
                '@type': defaultType ?? getItemTypeForSheetName(sheetName),
              }
        }
        onFeedback={setFeedback}
        onDirtyChange={onDirtyChange}
      />
      <div className="edit-actions">
        <button onClick={handleSave} disabled={saving}>
          Save
        </button>
        <button onClick={handleCancel}>Cancel</button>
      </div>
      {feedback && <p className="edit-feedback">{feedback}</p>}
    </div>
  )
}
