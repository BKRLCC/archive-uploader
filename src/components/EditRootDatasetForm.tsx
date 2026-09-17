import React, { useState } from 'react'
import type { SheetData } from '../api'
import { getFieldDisplayLabel } from '../config/field-labels'
import { useAppSelector } from '../ducks/hooks'
import { selectLicenses } from '../ducks/licenses'
import { selectPeople } from '../ducks/people'
import { selectOrganizations } from '../ducks/organizations'
import { selectLanguages } from '../ducks/languages'
import { selectCollections } from '../ducks/collections'
import ReferenceSelect, { type ReferenceOption } from './ReferenceSelect'
import MultiReferenceSelect from './MultiReferenceSelect'
import DatePicker from './DatePicker'
import GeneratableTextField from './GeneratableTextField'
import { newArcpIdentifier } from '../helpers/identifiers'

const EDITABLE_ROWS = [
  'name',
  'description',
  'identifier',
  'isRef_isPartOf',
  'isRef_license',
  'isRef_author',
  'isRef_publisher',
  'datePublished',
  'isRef_inLanguage',
  'isRef_ldac:subjectLanguage',
  'ldac:metadataIsPublic',
]
// Required by the RO-Crate spec for the Root Data Entity.
const REQUIRED_ROWS = ['name', 'description', 'datePublished']
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
  const languages = useAppSelector(selectLanguages)
  const collections = useAppSelector(selectCollections)

  const toOptions = (
    entries: { '@id': string; name: string }[],
  ): ReferenceOption[] =>
    entries.map((entry) => ({
      value: entry['@id'],
      label: entry.name || entry['@id'],
    }))

  // isRef_ fields serialise as one row per @id; aggregate repeated rows into a
  // single comma-joined value for the multi-select. Other keys take the last row.
  const initialValues = sheetData.rows.reduce<Record<string, string>>(
    (acc, row) => {
      const key = row[0] ?? ''
      const value = row[valueIndex] ?? ''
      if (key.startsWith('isRef_')) {
        const ids = acc[key] ? acc[key].split(',') : []
        const trimmed = value.trim()
        if (trimmed && !ids.includes(trimmed)) ids.push(trimmed)
        acc[key] = ids.join(',')
      } else {
        acc[key] = value
      }
      return acc
    },
    {},
  )

  // The collection being edited, excluded from its own "part of" options so it
  // cannot reference itself.
  const currentIdentifier = initialValues['identifier'] ?? ''
  const collectionOptions: ReferenceOption[] = collections
    .filter((collection) => collection.identifier !== currentIdentifier)
    .map((collection) => ({
      value: collection.identifier,
      label: collection.name || 'Master collection',
    }))

  // Reference fields rendered as single-select dropdowns, each backed by its
  // own controlled vocabulary and an "empty" message.
  const referenceFields: Record<
    string,
    { options: ReferenceOption[]; placeholder: string; emptyLabel: string }
  > = {
    isRef_isPartOf: {
      options: collectionOptions,
      placeholder: 'Select a collection…',
      emptyLabel: 'No collections available',
    },
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

  // Language fields reference the Languages list and allow multiple selections,
  // stored as a comma-separated list of @ids.
  const languageFields: Record<
    string,
    { options: ReferenceOption[]; placeholder: string; emptyLabel: string }
  > = {
    isRef_inLanguage: {
      options: toOptions(languages),
      placeholder: 'Select languages…',
      emptyLabel: 'No languages available',
    },
    'isRef_ldac:subjectLanguage': {
      options: toOptions(languages),
      placeholder: 'Select languages…',
      emptyLabel: 'No languages available',
    },
  }

  // Default a blank membership to the sole/first available collection (the
  // master) so existing collections adopt it when saved.
  const defaultedInitialValues =
    !initialValues['isRef_isPartOf'] && collectionOptions.length > 0
      ? { ...initialValues, isRef_isPartOf: collectionOptions[0].value }
      : initialValues

  // Ensure editable fields render even if the sheet predates them. Dedupe keys
  // since isRef_ fields appear on multiple rows (one per @id).
  const displayKeys = [
    ...new Set(
      sheetData.rows
        .map((row) => row[0] ?? '')
        .filter((key) => key.trim() !== ''),
    ),
    ...EDITABLE_ROWS.filter(
      (key) => !sheetData.rows.some((row) => (row[0] ?? '') === key),
    ),
  ]

  const [values, setValues] = useState<Record<string, string>>(
    defaultedInitialValues,
  )
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function handleSave() {
    const missing = REQUIRED_ROWS.filter((key) => !(values[key] ?? '').trim())
    if (missing.length > 0) {
      const labels = missing.map((key) =>
        getFieldDisplayLabel(key, COLLECTION_TYPE),
      )
      setFeedback(`✗ Required: ${labels.join(', ')}`)
      return
    }
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
          const languageField = languageFields[key]
          return (
            <label key={key} className="edit-field">
              <span className="edit-field-key">
                {getFieldDisplayLabel(key, COLLECTION_TYPE)}
                {REQUIRED_ROWS.includes(key) && (
                  <span className="edit-field-required" title="Required">
                    {' '}
                    *
                  </span>
                )}
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
              ) : languageField ? (
                <MultiReferenceSelect
                  options={languageField.options}
                  value={values[key] ?? ''}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, [key]: value }))
                  }
                  placeholder={languageField.placeholder}
                  emptyLabel={languageField.emptyLabel}
                />
              ) : key === 'datePublished' ? (
                <DatePicker
                  value={values[key] ?? ''}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, [key]: value }))
                  }
                />
              ) : key === 'ldac:metadataIsPublic' ? (
                <input
                  type="checkbox"
                  checked={values[key] === 'TRUE'}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [key]: e.target.checked ? 'TRUE' : 'FALSE',
                    }))
                  }
                />
              ) : key === 'description' ? (
                <textarea
                  value={values[key] ?? ''}
                  rows={4}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              ) : key === 'identifier' ? (
                <GeneratableTextField
                  value={values[key] ?? ''}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, [key]: value }))
                  }
                  onGenerate={newArcpIdentifier}
                  lockWhenSet
                  placeholder="Paste a DOI/URL, or generate an arcp id"
                  buttonTitle="Generate an arcp identifier"
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
