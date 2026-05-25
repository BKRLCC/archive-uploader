import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  isImagePreviewExtension,
  isVideoPreviewExtension,
} from '../config/previewable-file-types'
import { toCamelCase } from '../helpers/string-formatters'
import ItemEditForm, { type ItemEditFormHandle } from './ItemEditForm'
import PopupOverlay from './PopupOverlay'
import './BulkAddPopup.css'

interface BulkAddPopupProps {
  isOpen: boolean
  xlsxPath: string
  sheetName: string
  headers: string[]
  existingIds: Set<string>
  onComplete: (
    addedRows: string[][],
    skippedFiles: string[],
    depictionWarningFiles: string[],
  ) => void
  onClose: () => void
}

function getFileName(filePath: string): string {
  const parts = String(filePath ?? '').split(/[\\/]/)
  return parts[parts.length - 1] || filePath
}

function getFileStem(filePath: string): string {
  const fileName = getFileName(filePath)
  return fileName.replace(/\.[^.]+$/, '')
}

function getFileExtension(filePath: string): string {
  const fileName = getFileName(filePath)
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return fileName.slice(dotIndex + 1).toLowerCase()
}

export default function BulkAddPopup({
  isOpen,
  xlsxPath,
  sheetName,
  headers,
  existingIds,
  onComplete,
  onClose,
}: BulkAddPopupProps) {
  const formRef = useRef<ItemEditFormHandle>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [pickingFiles, setPickingFiles] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const archiveFolderPath = useMemo(
    () => xlsxPath.replace(/[/\\][^/\\]+$/, ''),
    [xlsxPath],
  )

  useEffect(() => {
    if (!isOpen) return
    setPickingFiles(true)
    setSaving(false)
    setFeedback('')
    setSelectedFiles([])

    void window.api
      .pickFiles(archiveFolderPath)
      .then((picked) => {
        if (!picked || picked.length === 0) {
          onClose()
          return
        }
        setSelectedFiles(picked)
      })
      .catch((err: unknown) => {
        setFeedback(`✗ ${(err as Error).message}`)
      })
      .finally(() => {
        setPickingFiles(false)
      })
  }, [archiveFolderPath, isOpen, onClose])

  const handleConfirm = async () => {
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
    const sharedValues: Record<string, string> = {}
    headers.forEach((header, index) => {
      const value = String(values[index] ?? '')
      if (value.trim()) {
        sharedValues[header] = value
      }
    })
    Object.entries(virtualValues).forEach(([field, value]) => {
      const trimmed = String(value ?? '').trim()
      if (trimmed) {
        sharedValues[field] = trimmed
      }
    })

    const seenIds = new Set(existingIds)
    const skippedFiles: string[] = []
    const depictionWarningFiles: string[] = []
    const addedRows: string[][] = []

    try {
      for (const relativePath of selectedFiles) {
        const fileStem = getFileStem(relativePath).trim()
        if (!fileStem) {
          skippedFiles.push(relativePath)
          continue
        }

        const id = `#RepositoryObject_${toCamelCase(fileStem)}`
        if (seenIds.has(id)) {
          skippedFiles.push(relativePath)
          continue
        }

        const rowValues: Record<string, string> = {
          ...sharedValues,
          '@id': id,
          '@type': 'RepositoryObject',
          name: fileStem,
        }

        if (isImagePreviewExtension(getFileExtension(relativePath))) {
          rowValues.depiction = relativePath
        } else if (isVideoPreviewExtension(getFileExtension(relativePath))) {
          try {
            const generated = await window.api.generateVideoDepiction(
              archiveFolderPath,
              relativePath,
            )
            rowValues.depiction = generated.depictionPath
          } catch {
            depictionWarningFiles.push(relativePath)
          }
        }

        const addedRow = await window.api.addSheetRow(
          xlsxPath,
          sheetName,
          rowValues,
        )
        addedRows.push(addedRow)
        seenIds.add(id)
      }

      onComplete(addedRows, skippedFiles, depictionWarningFiles)
      onClose()
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`)
      setSaving(false)
    }
  }

  return (
    <PopupOverlay isOpen={isOpen} onClose={onClose}>
      <div className="bulk-add-popup-content">
        <h3>Bulk add items</h3>
        {pickingFiles ? (
          <p className="bulk-add-popup-state">Choosing files…</p>
        ) : (
          <>
            <p className="bulk-add-popup-summary">
              {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}
              selected
            </p>
            <ul className="bulk-add-popup-files">
              {selectedFiles.map((filePath) => (
                <li key={filePath}>{getFileName(filePath)}</li>
              ))}
            </ul>

            <p className="bulk-add-popup-subheader">Shared metadata</p>
            <ItemEditForm
              ref={formRef}
              headers={headers}
              initialValues={headers.map(() => '')}
              xlsxPath={xlsxPath}
              sheetName={sheetName}
              hiddenFields={['@id', '@type', 'name', 'depiction']}
              lockedFieldValues={{ '@type': 'RepositoryObject' }}
              onFeedback={setFeedback}
            />

            <div className="edit-actions">
              <button onClick={handleConfirm} disabled={saving || pickingFiles}>
                Confirm add
              </button>
              <button onClick={onClose} disabled={saving}>
                Cancel
              </button>
            </div>
          </>
        )}

        {feedback && <p className="edit-feedback">{feedback}</p>}
      </div>
    </PopupOverlay>
  )
}
