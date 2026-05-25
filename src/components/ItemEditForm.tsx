import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import Select from 'react-select'
import {
  getControlledVocabularyForField,
  getTagVocabularyKeyFromField,
  isMultiSelectField,
} from '../config/field-vocabularies'
import {
  DEPICTION_FIELD_NAME,
  DEPICTION_FOLDER_HINT,
  hasAllowedDepictionExtension,
} from '../config/depiction-config'
import { useAppSelector } from '../ducks/hooks'
import { selectLanguages } from '../ducks/languages'
import { selectPeople } from '../ducks/people'
import { selectTagVocabularies } from '../ducks/tags'
import { getEntityFieldModel, resolveEditableEntityType } from '../types/types'
import { getFieldDisplayLabel } from '../config/field-labels'
import ClickableImagePreview from './ClickableImagePreview'
import FileLinksField, { FILE_LINKS_FIELD_NAME } from './FileLinksField'

interface VocabOption {
  value: string
  label: string
  searchText: string
}

export interface ItemEditFormHandle {
  validate: () => Promise<string | null>
  getValues: () => {
    values: string[]
    virtualValues: Record<string, string>
  }
}

interface ItemEditFormProps {
  headers: string[]
  initialValues?: string[]
  xlsxPath: string
  sheetName: string
  hiddenFields?: string[]
  showField?: (fieldName: string) => boolean
  lockedFieldValues?: Record<string, string>
  onFeedback?: (message: string) => void
}

const TYPE_OPTIONS = [
  { label: 'Resource', value: 'RepositoryObject', icon: '📜' },
  { label: 'Person', value: 'Person', icon: '👤' },
  { label: 'Language', value: 'Language', icon: '🗣️' },
  { label: 'Defined term', value: 'DefinedTerm', icon: '🏷️' },
]

function normalizeFieldName(fieldName: string): string {
  return String(fieldName ?? '')
    .trim()
    .toLowerCase()
}

function normalizeFieldSet(fields: string[]): Set<string> {
  return new Set(fields.map((field) => normalizeFieldName(field)))
}

const ItemEditForm = forwardRef<ItemEditFormHandle, ItemEditFormProps>(
  function ItemEditForm(
    {
      headers,
      initialValues,
      xlsxPath,
      sheetName,
      hiddenFields = [],
      showField,
      lockedFieldValues = {},
      onFeedback,
    },
    ref,
  ) {
    const [values, setValues] = useState<string[]>(() => {
      const next = [...(initialValues ?? headers.map(() => ''))]
      headers.forEach((header, index) => {
        if (Object.prototype.hasOwnProperty.call(lockedFieldValues, header)) {
          next[index] = String(lockedFieldValues[header] ?? '')
        }
      })
      return next
    })
    const [virtualValues, setVirtualValues] = useState<Record<string, string>>(
      () => {
        const next: Record<string, string> = {}
        Object.entries(lockedFieldValues).forEach(([field, value]) => {
          const hasHeader = headers.some(
            (header) =>
              normalizeFieldName(header) === normalizeFieldName(field),
          )
          if (!hasHeader) {
            next[field] = String(value ?? '')
          }
        })
        return next
      },
    )
    const [vocabSearch, setVocabSearch] = useState<Record<string, string>>({})
    const [depictionPickingField, setDepictionPickingField] = useState<
      string | null
    >(null)

    const archiveFolderPath = xlsxPath.replace(/[/\\][^/\\]+$/, '')
    const hiddenFieldSet = useMemo(
      () => normalizeFieldSet(hiddenFields),
      [hiddenFields],
    )

    const people = useAppSelector(selectPeople)
    const languages = useAppSelector(selectLanguages)
    const tagVocabularies = useAppSelector(selectTagVocabularies)

    const languageOptions: VocabOption[] = languages.map((language) => {
      const id = language['@id']
      const name = language.name
      const label = `${name} (${id})`
      return {
        value: id,
        label,
        searchText: `${name} ${id}`.toLowerCase(),
      }
    })
    const languageOptionIds = new Set(
      languageOptions.map((option) => option.value),
    )

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

    const isHiddenField = (fieldName: string): boolean => {
      if (hiddenFieldSet.has(normalizeFieldName(fieldName))) {
        return true
      }
      if (showField) {
        return !showField(fieldName)
      }
      return false
    }

    const getTagVocabularyForField = (fieldName: string) => {
      const key = getTagVocabularyKeyFromField(fieldName)
      if (!key) return null
      return (
        tagVocabularies.find((vocabulary) => vocabulary.key === key) ?? null
      )
    }

    const getHeaderIndex = (fieldName: string): number => {
      return headers.findIndex(
        (header) =>
          normalizeFieldName(header) === normalizeFieldName(fieldName),
      )
    }

    const getFieldValue = (fieldName: string): string => {
      if (Object.prototype.hasOwnProperty.call(lockedFieldValues, fieldName)) {
        return String(lockedFieldValues[fieldName] ?? '')
      }
      const index = getHeaderIndex(fieldName)
      if (index >= 0) return values[index] ?? ''
      return virtualValues[fieldName] ?? ''
    }

    const setFieldValue = (fieldName: string, nextValue: string) => {
      if (Object.prototype.hasOwnProperty.call(lockedFieldValues, fieldName)) {
        return
      }
      const index = getHeaderIndex(fieldName)
      if (index >= 0) {
        const next = [...values]
        next[index] = nextValue
        setValues(next)
        return
      }
      setVirtualValues((prev) => ({ ...prev, [fieldName]: nextValue }))
    }

    const typeHeaderIndex = headers.findIndex(
      (header) => normalizeFieldName(header) === '@type',
    )
    const resolvedEntityType = resolveEditableEntityType(
      typeHeaderIndex >= 0 ? (values[typeHeaderIndex] ?? '') : '',
    )
    const modelFieldNames = resolvedEntityType
      ? getEntityFieldModel(resolvedEntityType)
      : []

    const missingModelFieldNames = modelFieldNames.filter(
      (fieldName) =>
        !headers.some(
          (header) =>
            normalizeFieldName(header) === normalizeFieldName(fieldName),
        ),
    )

    const isRepositoryObjectSheet =
      resolvedEntityType === 'RepositoryObject' ||
      headers.some(
        (header) => normalizeFieldName(header) === 'isref_inlanguage',
      ) ||
      headers.some(
        (header) => normalizeFieldName(header) === 'isref_creator',
      ) ||
      headers.some(
        (header) => normalizeFieldName(header) === 'isref_contributor',
      )

    const missingTagFieldNames = isRepositoryObjectSheet
      ? tagVocabularies
          .map((vocabulary) => vocabulary.fieldName)
          .filter(
            (fieldName) =>
              ![...headers, ...missingModelFieldNames].some(
                (header) =>
                  normalizeFieldName(header) === normalizeFieldName(fieldName),
              ),
          )
      : []

    const renderedFields = [
      ...headers.filter((header) => String(header ?? '').trim() !== ''),
      ...missingModelFieldNames,
      ...missingTagFieldNames,
    ].filter((fieldName) => !isHiddenField(fieldName))

    const validateFields = async (): Promise<string | null> => {
      for (const field of renderedFields) {
        const selectedValue = getFieldValue(field).trim()

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
          setFieldValue(field, result.normalizedPath ?? selectedValue)
          continue
        }

        const source = getControlledVocabularyForField(field)
        if (
          source !== 'People' &&
          source !== 'Languages' &&
          source !== 'Tags'
        ) {
          continue
        }
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

        if (source === 'Languages') {
          const ids = isMultiSelectField(field)
            ? selectedValue.split(/,\s*/).filter(Boolean)
            : [selectedValue]

          for (const id of ids) {
            if (!languageOptionIds.has(id)) {
              return `✗ ${field} must be selected from Languages`
            }
          }
          continue
        }

        if (isMultiSelectField(field)) {
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

    const getValuesSnapshot = () => {
      const valuesWithLocked = [...values]
      headers.forEach((header, index) => {
        if (Object.prototype.hasOwnProperty.call(lockedFieldValues, header)) {
          valuesWithLocked[index] = String(lockedFieldValues[header] ?? '')
        }
      })

      const virtualValuesWithLocked = { ...virtualValues }
      Object.entries(lockedFieldValues).forEach(([field, value]) => {
        const hasHeader = headers.some(
          (header) => normalizeFieldName(header) === normalizeFieldName(field),
        )
        if (!hasHeader) {
          virtualValuesWithLocked[field] = String(value ?? '')
        }
      })

      return {
        values: valuesWithLocked,
        virtualValues: virtualValuesWithLocked,
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        validate: validateFields,
        getValues: getValuesSnapshot,
      }),
      [renderedFields, values, virtualValues, lockedFieldValues],
    )

    const handlePickDepiction = async (fieldName: string) => {
      setDepictionPickingField(fieldName)
      try {
        const picked = await window.api.pickDepictionFile(archiveFolderPath)
        if (!picked) return
        setFieldValue(fieldName, picked)
        onFeedback?.('')
      } catch (err) {
        onFeedback?.(`✗ ${(err as Error).message}`)
      } finally {
        setDepictionPickingField(null)
      }
    }

    return (
      <div className="edit-fields">
        {renderedFields.map((fieldName) => {
          const isReadOnly = fieldName === '@id'
          const isTypeField = fieldName === '@type'
          const isDescriptionField = fieldName === 'description'
          const isDepictionField = fieldName === DEPICTION_FIELD_NAME
          const isFileLinksField =
            normalizeFieldName(fieldName) ===
            normalizeFieldName(FILE_LINKS_FIELD_NAME)
          const vocabularySource = getControlledVocabularyForField(fieldName)
          const isPeopleControlled = vocabularySource === 'People'
          const isLanguagesControlled = vocabularySource === 'Languages'
          const isTagsControlled = vocabularySource === 'Tags'
          const tagVocabulary = getTagVocabularyForField(fieldName)
          const tagOptions = tagVocabulary?.options ?? []
          const peopleSearch = vocabSearch[fieldName] ?? ''
          const filteredPeopleOptions = peopleOptions.filter((option) =>
            option.searchText.includes(peopleSearch.toLowerCase()),
          )
          const currentValue = getFieldValue(fieldName)
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
            <label key={fieldName} className="edit-field">
              <span className="edit-field-key">
                {getFieldDisplayLabel(fieldName)}
              </span>
              {isReadOnly ? (
                <span className="edit-field-readonly">
                  {currentValue || '—'}
                </span>
              ) : isTypeField ? (
                <select
                  value={currentValue}
                  onChange={(e) => {
                    setFieldValue(fieldName, e.target.value)
                  }}
                  disabled={Object.prototype.hasOwnProperty.call(
                    lockedFieldValues,
                    fieldName,
                  )}
                >
                  {!TYPE_OPTIONS.some(
                    (option) => option.value === currentValue,
                  ) && (
                    <option value={currentValue}>{currentValue || '—'}</option>
                  )}
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label}
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
                      setFieldValue(fieldName, e.target.value)
                    }}
                  />
                  <div className="depiction-actions">
                    <button
                      type="button"
                      onClick={() => {
                        void handlePickDepiction(fieldName)
                      }}
                      disabled={depictionPickingField === fieldName}
                    >
                      {depictionPickingField === fieldName
                        ? 'Choosing…'
                        : 'Choose image…'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFieldValue(fieldName, '')
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
              ) : isDescriptionField ? (
                <textarea
                  rows={5}
                  value={currentValue}
                  onChange={(e) => {
                    setFieldValue(fieldName, e.target.value)
                  }}
                />
              ) : isFileLinksField ? (
                <FileLinksField
                  value={currentValue}
                  archiveFolderPath={archiveFolderPath}
                  onChange={(nextValue) => {
                    setFieldValue(fieldName, nextValue)
                  }}
                  onFeedback={onFeedback}
                />
              ) : isTagsControlled ? (
                <>
                  <Select
                    isMulti
                    isDisabled={tagOptions.length === 0}
                    options={tagOptions}
                    value={currentValue
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
                      const ids = (selected as VocabOption[]).map(
                        (option) => option.value,
                      )
                      setFieldValue(fieldName, ids.join(', '))
                    }}
                    placeholder={
                      tagOptions.length === 0
                        ? `Vocabulary unavailable (${tagVocabulary?.workbookName ?? fieldName})`
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
                      Tag vocabulary is unavailable. Use the refresh action in
                      the subheader.
                    </span>
                  )}
                </>
              ) : isLanguagesControlled && isMultiSelectField(fieldName) ? (
                <Select
                  isMulti
                  isDisabled={languageOptions.length === 0}
                  options={languageOptions}
                  value={currentValue
                    .split(/,\s*/)
                    .filter(Boolean)
                    .map(
                      (id) =>
                        languageOptions.find(
                          (option) => option.value === id,
                        ) || {
                          value: id,
                          label: id,
                          searchText: id,
                        },
                    )}
                  onChange={(selected) => {
                    const ids = (selected as VocabOption[]).map(
                      (option) => option.value,
                    )
                    setFieldValue(fieldName, ids.join(', '))
                  }}
                  placeholder={
                    languageOptions.length === 0
                      ? 'Languages vocabulary unavailable'
                      : 'Select languages…'
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
              ) : isLanguagesControlled ? (
                <select
                  value={currentValue}
                  onChange={(e) => {
                    setFieldValue(fieldName, e.target.value)
                  }}
                  disabled={languageOptions.length === 0}
                >
                  <option value="">Select language…</option>
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : isPeopleControlled && isMultiSelectField(fieldName) ? (
                <Select
                  isMulti
                  isDisabled={peopleOptions.length === 0}
                  options={peopleOptions}
                  value={currentValue
                    .split(/,\s*/)
                    .filter(Boolean)
                    .map(
                      (id) =>
                        peopleOptions.find((option) => option.value === id) || {
                          value: id,
                          label: id,
                          searchText: id,
                        },
                    )}
                  onChange={(selected) => {
                    const ids = (selected as VocabOption[]).map(
                      (option) => option.value,
                    )
                    setFieldValue(fieldName, ids.join(', '))
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
                        [fieldName]: e.target.value,
                      }))
                    }}
                    disabled={peopleOptions.length === 0}
                  />
                  <select
                    value={currentValue}
                    onChange={(e) => {
                      setFieldValue(fieldName, e.target.value)
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
                  value={currentValue}
                  onChange={(e) => {
                    setFieldValue(fieldName, e.target.value)
                  }}
                />
              )}
            </label>
          )
        })}
      </div>
    )
  },
)

export default ItemEditForm
