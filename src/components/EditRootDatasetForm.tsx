import React, { useState } from 'react'
import Select from 'react-select'
import type { SheetData } from '../api'
import { getFieldDisplayLabel } from '../config/field-labels'
import { useAppSelector } from '../ducks/hooks'
import { selectLicenses } from '../ducks/licenses'

const EDITABLE_ROWS = ['name', 'description', 'identifier', 'isRef_license']
const COLLECTION_TYPE = 'RepositoryCollection'

interface LicenseOption {
  value: string
  label: string
}

interface Props {
  sheetData: SheetData
  xlsxPath: string
  onSave: (updated: SheetData) => void
  onClose: () => void
}

export default function EditRootDatasetForm({
  sheetData,
  xlsxPath,
  onSave,
  onClose,
}: Props) {
  const valueIndex = sheetData.headers.indexOf('Value')
  const licenses = useAppSelector(selectLicenses)

  const licenseOptions: LicenseOption[] = licenses.map((license) => ({
    value: license['@id'],
    label: license.name || license['@id'],
  }))

  const initialValues = Object.fromEntries(
    sheetData.rows.map((row) => [row[0] ?? '', row[valueIndex] ?? '']),
  )

  // Ensure editable fields render even if the sheet predates them.
  const displayKeys = [
    ...sheetData.rows.map((row) => row[0] ?? ''),
    ...EDITABLE_ROWS.filter(
      (key) => !sheetData.rows.some((row) => (row[0] ?? '') === key),
    ),
  ]

  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleSave() {
    setSaving(true)
    setFeedback('Saving…')
    const updates: Record<string, string> = {}
    for (const key of EDITABLE_ROWS) {
      updates[key] = values[key] ?? ''
    }
    try {
      const updated = await window.api.updateRootDataset(xlsxPath, updates)
      onSave(updated)
      onClose()
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`)
      setSaving(false)
    }
  }

  return (
    <div className="drawer-inner">
      <h3>Edit collection</h3>
      <div className="edit-fields">
        {displayKeys.map((key) => {
          const isEditable = EDITABLE_ROWS.includes(key)
          const selectedLicense =
            licenseOptions.find((option) => option.value === values[key]) ??
            null
          return (
            <label key={key} className="edit-field">
              <span className="edit-field-key">
                {getFieldDisplayLabel(key, COLLECTION_TYPE)}
              </span>
              {!isEditable ? (
                <span className="edit-field-readonly">
                  {values[key] || '—'}
                </span>
              ) : key === 'isRef_license' ? (
                <Select<LicenseOption>
                  isClearable
                  options={licenseOptions}
                  value={selectedLicense}
                  onChange={(option) =>
                    setValues((prev) => ({
                      ...prev,
                      [key]: option?.value ?? '',
                    }))
                  }
                  placeholder={
                    licenseOptions.length === 0
                      ? 'No licenses available'
                      : 'Select a license…'
                  }
                  noOptionsMessage={() => 'No licenses available'}
                  isDisabled={licenseOptions.length === 0}
                />
              ) : key === 'description' ? (
                <textarea
                  value={values[key] ?? ''}
                  rows={4}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              ) : (
                <input
                  type="text"
                  value={values[key] ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              )}
            </label>
          )
        })}
      </div>
      <div className="edit-actions">
        <button onClick={handleSave} disabled={saving}>
          Save
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
      {feedback && <p className="edit-feedback">{feedback}</p>}
    </div>
  )
}
