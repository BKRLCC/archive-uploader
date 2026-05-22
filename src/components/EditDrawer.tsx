import React, { useState } from 'react'
import {
  getTagVocabularyKeyFromField,
  getControlledVocabularyForField,
  isMultiSelectField,
} from '../config/field-vocabularies'
import Select from 'react-select'
import { useAppSelector } from '../ducks/hooks'
import { selectPeople } from '../ducks/people'
import { selectTagVocabularies } from '../ducks/tags'
import { toCamelCase } from '../helpers/string-formatters'
import {
  DEPICTION_FIELD_NAME,
  DEPICTION_FOLDER_HINT,
  hasAllowedDepictionExtension,
} from '../config/depiction-config'
import ClickableImagePreview from './ClickableImagePreview'

function generateId(type: string, name: string): string {
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `#${type}_${toCamelCase(name)}_${rand}`
}

const TYPE_OPTIONS = [
  { label: 'Resource', value: 'RepositoryObject', icon: '📜' },
  { label: 'Person', value: 'Person', icon: '👤' },
  { label: 'Language', value: 'Language', icon: '🔤' },
]

interface Props {
  headers: string[]
  row: string[]
  rowIndex: number
  xlsxPath: string
  sheetName: string
  onSave: (rowIndex: number, updated: string[]) => void
  onClose: () => void
  isNew?: boolean
}

interface VocabOption {
  value: string
  label: string
  searchText: string
}

export default function EditDrawer({
  headers,
  row,
  rowIndex,
  xlsxPath,
  sheetName,
  onSave,
  onClose,
  isNew = false,
}: Props) {
  const [values, setValues] = useState<string[]>(() => [...row])
  const [vocabSearch, setVocabSearch] = useState<Record<string, string>>({})
  const [depictionPickingField, setDepictionPickingField] = useState<
    string | null
  >(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const archiveFolderPath = xlsxPath.replace(/[/\\][^/\\]+$/, '')

  const people = useAppSelector(selectPeople)
  const peopleOptions: VocabOption[] = people.map((person) => {
    const id = person['@id']
    const name = person.name
    const label = `${name} (${id})`
    return {
      value: id,
      label,
      searchText: `${name} ${id}`.toLowerCase(),
    }
  })
  const peopleOptionIds = new Set(peopleOptions.map((option) => option.value))
  const tagVocabularies = useAppSelector(selectTagVocabularies)

  const getTagVocabularyForField = (fieldName: string) => {
    const key = getTagVocabularyKeyFromField(fieldName)
    if (!key) return null
    return tagVocabularies.find((vocabulary) => vocabulary.key === key) ?? null
  }

  const validateFields = async (): Promise<string | null> => {
    for (let i = 0; i < headers.length; i += 1) {
      const field = headers[i]
      const selectedValue = (values[i] ?? '').trim()

      if (field === DEPICTION_FIELD_NAME) {
        if (!selectedValue) continue
        if (!hasAllowedDepictionExtension(selectedValue)) {
          return '✗ depiction must be an image path (jpg, jpeg, png, gif, webp)'
        }
        const result = await window.api.validateDepictionPath(
          archiveFolderPath,
          selectedValue,
        )
        if (!result.ok) {
          return `✗ ${result.error ?? 'Invalid depiction path'}`
        }
        // Persist normalized relative path to keep separators consistent.
        const next = [...values]
        next[i] = result.normalizedPath ?? selectedValue
        setValues(next)
        continue
      }

      const source = getControlledVocabularyForField(field)
      if (source !== 'People' && source !== 'Tags') continue
      if (!selectedValue) continue

      if (source === 'Tags') {
        const tagVocabulary = getTagVocabularyForField(field)
        if (!tagVocabulary) {
          return `✗ ${field} vocabulary is unavailable. Refresh tags vocab and try again.`
        }

        const optionIds = new Set(
          tagVocabulary.options.map((option) => option.value),
        )
        const ids = selectedValue.split(/,\s*/).filter(Boolean)

        for (const id of ids) {
          if (!optionIds.has(id)) {
            return `✗ ${field} must be selected from ${tagVocabulary.workbookName}`
          }
        }
        continue
      }

      if (isMultiSelectField(field)) {
        // Multi-select: validate all IDs
        const ids = selectedValue.split(/,\s*/).filter(Boolean)
        for (const id of ids) {
          if (!peopleOptionIds.has(id)) {
            return `✗ ${field} must be selected from People`
          }
        }
      } else {
        if (!peopleOptionIds.has(selectedValue)) {
          return `✗ ${field} must be selected from People`
        }
      }
    }
    return null
  }

  const handlePickDepiction = async (index: number) => {
    setDepictionPickingField(headers[index])
    try {
      const picked = await window.api.pickDepictionFile(archiveFolderPath)
      if (!picked) return
      const next = [...values]
      next[index] = picked
      setValues(next)
      setFeedback('')
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`)
    } finally {
      setDepictionPickingField(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    setFeedback('Saving…')

    const validationError = await validateFields()
    if (validationError) {
      setFeedback(validationError)
      setSaving(false)
      return
    }

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
      const id = generateId(typeVal, nameVal)
      const updatedValues: Record<string, string> = { '@id': id }
      headers.forEach((h, i) => {
        updatedValues[h] = values[i] ?? ''
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
    headers.forEach((h, i) => {
      if (h !== '@id') updatedValues[h] = values[i] ?? ''
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
      <h3>Edit item</h3>
      <div className="edit-fields">
        {headers.map((key, i) => {
          if (isNew && key === '@id') return null
          const isReadOnly = key === '@id'
          const isTypeField = key === '@type'
          const isDepictionField = key === DEPICTION_FIELD_NAME
          const vocabularySource = getControlledVocabularyForField(key)
          const isPeopleControlled = vocabularySource === 'People'
          const isTagsControlled = vocabularySource === 'Tags'
          const tagVocabulary = getTagVocabularyForField(key)
          const tagOptions = tagVocabulary?.options ?? []
          const peopleSearch = vocabSearch[key] ?? ''
          const filteredPeopleOptions = peopleOptions.filter((option) =>
            option.searchText.includes(peopleSearch.toLowerCase()),
          )
          const currentValue = values[i] ?? ''
          const currentOption = peopleOptions.find(
            (option) => option.value === currentValue,
          )
          const renderedPeopleOptions = currentOption
            ? [
                currentOption,
                ...filteredPeopleOptions.filter(
                  (option) => option.value !== currentOption.value,
                ),
              ]
            : filteredPeopleOptions
          const previewPath =
            isDepictionField && currentValue.trim()
              ? `${archiveFolderPath.replace(/\\/g, '/')}/${currentValue
                  .trim()
                  .replace(/^[/\\]+/, '')
                  .replace(/\\/g, '/')}`
              : ''
          return (
            <label key={key} className="edit-field">
              <span className="edit-field-key">{key}</span>
              {isReadOnly ? (
                <span className="edit-field-readonly">{values[i] || '—'}</span>
              ) : isTypeField ? (
                <select
                  value={values[i] ?? ''}
                  onChange={(e) => {
                    const next = [...values]
                    next[i] = e.target.value
                    setValues(next)
                  }}
                >
                  {!TYPE_OPTIONS.some((o) => o.value === values[i]) && (
                    <option value={values[i] ?? ''}>{values[i] || '—'}</option>
                  )}
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.icon} {o.label}
                    </option>
                  ))}
                </select>
              ) : isDepictionField ? (
                <>
                  <input
                    type="text"
                    value={currentValue}
                    placeholder={`Relative image path (e.g., ${DEPICTION_FOLDER_HINT}photo.jpg)`}
                    onChange={(e) => {
                      const next = [...values]
                      next[i] = e.target.value
                      setValues(next)
                    }}
                  />
                  <div className="depiction-actions">
                    <button
                      type="button"
                      onClick={() => void handlePickDepiction(i)}
                      disabled={depictionPickingField === key}
                    >
                      {depictionPickingField === key
                        ? 'Choosing…'
                        : 'Choose image…'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...values]
                        next[i] = ''
                        setValues(next)
                      }}
                      disabled={!currentValue}
                    >
                      Clear
                    </button>
                  </div>
                  {previewPath && (
                    <ClickableImagePreview
                      imageUrl={`localfile://${previewPath}`}
                      altText="Depiction Preview"
                    />
                  )}
                </>
              ) : isTagsControlled ? (
                <>
                  <Select
                    isMulti
                    isDisabled={tagOptions.length === 0}
                    options={tagOptions}
                    value={(values[i] ?? '')
                      .split(/,\s*/)
                      .filter(Boolean)
                      .map(
                        (id) =>
                          tagOptions.find((option) => option.value === id) || {
                            value: id,
                            label: id,
                            searchText: id,
                          },
                      )}
                    onChange={(selected) => {
                      const ids = (selected as VocabOption[]).map((o) => o.value)
                      const next = [...values]
                      next[i] = ids.join(', ')
                      setValues(next)
                    }}
                    placeholder={
                      tagOptions.length === 0
                        ? `Vocabulary unavailable (${tagVocabulary?.workbookName ?? key})`
                        : `Select ${tagVocabulary?.workbookName ?? 'tags'}…`
                    }
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
                  {tagOptions.length === 0 && (
                    <span className="edit-field-readonly">
                      Tag vocabulary is unavailable. Use the refresh action in the
                      subheader.
                    </span>
                  )}
                </>
              ) : isPeopleControlled && isMultiSelectField(key) ? (
                <Select
                  isMulti
                  isDisabled={peopleOptions.length === 0}
                  options={peopleOptions}
                  value={(values[i] ?? '')
                    .split(/,\s*/)
                    .filter(Boolean)
                    .map(
                      (id) =>
                        peopleOptions.find((o) => o.value === id) || {
                          value: id,
                          label: id,
                          searchText: id,
                        },
                    )}
                  onChange={(selected) => {
                    const ids = (selected as VocabOption[]).map((o) => o.value)
                    const next = [...values]
                    next[i] = ids.join(', ')
                    setValues(next)
                  }}
                  placeholder={
                    peopleOptions.length === 0
                      ? 'People vocabulary unavailable'
                      : 'Select people…'
                  }
                  styles={{
                    multiValue: (base) => ({
                      ...base,
                      background: 'rgba(166,43,43,0.15)',
                    }),
                    multiValueLabel: (base) => ({ ...base, color: '#a62b2b' }),
                    control: (base) => ({
                      ...base,
                      borderColor: '#a62b2b',
                      minHeight: 34,
                    }),
                  }}
                />
              ) : isPeopleControlled ? (
                <>
                  <input
                    type="text"
                    placeholder="Search people by name"
                    value={peopleSearch}
                    onChange={(e) => {
                      setVocabSearch((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }}
                    disabled={peopleOptions.length === 0}
                  />
                  <select
                    value={currentValue}
                    onChange={(e) => {
                      const next = [...values]
                      next[i] = e.target.value
                      setValues(next)
                    }}
                    disabled={peopleOptions.length === 0}
                  >
                    <option value="">Select person…</option>
                    {renderedPeopleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {peopleOptions.length === 0 && (
                    <span className="edit-field-readonly">
                      People vocabulary is unavailable.
                    </span>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={values[i] ?? ''}
                  onChange={(e) => {
                    const next = [...values]
                    next[i] = e.target.value
                    setValues(next)
                  }}
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
