import React, { useState } from 'react'
import type { SheetData } from '../api'
import { getFieldDisplayLabel } from '../config/field-labels'
import { useAppSelector } from '../ducks/hooks'
import { selectLicenses } from '../ducks/licenses'
import { selectPeople } from '../ducks/people'
import { selectOrganizations } from '../ducks/organizations'
import ReferenceSelect, { type ReferenceOption } from './ReferenceSelect'

const EDITABLE_ROWS = [
  'name',
  'description',
  'identifier',
  'isRef_license',
  'isRef_author',
  'isRef_publisher',
]
const COLLECTION_TYPE = 'RepositoryCollection'

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
  const people = useAppSelector(selectPeople)
  const organizations = useAppSelector(selectOrganizations)

  const toOptions = (
    entries: { '@id': string; name: string }[],
  ): ReferenceOption[] =>
    entries.map((entry) => ({
      value: entry['@id'],
      label: entry.name || entry['@id'],
    }))

  // Reference fields rendered as single-select dropdowns, each backed by its
  // own controlled vocabulary and an "empty" message.
  const referenceFields: Record<
    string,
    { options: ReferenceOption[]; placeholder: string; emptyLabel: string }
  > = {
    isRef_license: {
      options: toOptions(licenses),
      placeholder: 'Select a license…',
      emptyLabel: 'No licenses available',
    },
    isRef_author: {
      options: toOptions(people),
      placeholder: 'Select a person…',
      emptyLabel: 'No people available',
    },
    isRef_publisher: {
      options: toOptions(organizations),
      placeholder: 'Select an organization…',
      emptyLabel: 'No organizations available',
    },
  }

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
          const referenceField = referenceFields[key]
          return (
            <label key={key} className="edit-field">
              <span className="edit-field-key">
                {getFieldDisplayLabel(key, COLLECTION_TYPE)}
              </span>
              {!isEditable ? (
                <span className="edit-field-readonly">
                  {values[key] || '—'}
                </span>
              ) : referenceField ? (
                <ReferenceSelect
                  options={referenceField.options}
                  value={values[key] ?? ''}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, [key]: value }))
                  }
                  placeholder={referenceField.placeholder}
                  emptyLabel={referenceField.emptyLabel}
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
