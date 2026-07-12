import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import Select, {
  components as ReactSelectComponents,
  type MultiValueGenericProps,
  type OptionProps,
  type SingleValueProps,
} from 'react-select'
import {
  getControlledVocabularyForField,
  getTagVocabularyKeyFromField,
  isMultiSelectField,
} from '../config/field-vocabularies'
import {
  DEPICTION_FIELD_NAME,
  normalizeDepictionRelativePath,
  hasAllowedDepictionExtension,
} from '../config/depiction-config'
import { useAppSelector } from '../ducks/hooks'
import { selectLanguages } from '../ducks/languages'
import { selectLocalities } from '../ducks/localities'
import { selectPeople } from '../ducks/people'
import { selectPlaces } from '../ducks/places'
import { selectOrganizations } from '../ducks/organizations'
import { selectTagVocabularies } from '../ducks/tags'
import { getEntityFieldModel, resolveEditableEntityType } from '../types/types'
import {
  getFieldDisplayLabel,
  getFieldDescription,
} from '../config/field-labels'
import { groupRenderedFields } from '../config/field-groups'
import { ReferenceChip, type ReferenceEntity } from './ReferenceCell'
import FileLinksField, { FILE_LINKS_FIELD_NAME } from './FileLinksField'
import MapPickerModal from './MapPickerModal'
import InfoButtonWithTooltip from './InfoButtonWithTooltip'
import ImageSelectBox from './ImageSelectBox'

interface VocabOption {
  value: string
  label: string
  searchText: string
  name?: string
  depiction?: string
  folder?: string | null
}

// Render a referenced entity as name + circular thumbnail inside react-select.
// Falls back to the plain text label when no folder is known (e.g. before the
// root folder loads, or for placeholder/unknown-id options).
function renderVocabChip(data: VocabOption): React.ReactNode {
  if (!data.folder) return data.label
  const entity: ReferenceEntity = {
    id: data.value,
    name: data.name ?? data.label,
    depiction: data.depiction,
  }
  return <ReferenceChip entity={entity} folder={data.folder} />
}

function RefOption(props: OptionProps<VocabOption, boolean>) {
  return (
    <ReactSelectComponents.Option {...props}>
      {renderVocabChip(props.data)}
    </ReactSelectComponents.Option>
  )
}

function RefSingleValue(props: SingleValueProps<VocabOption, boolean>) {
  return (
    <ReactSelectComponents.SingleValue {...props}>
      {renderVocabChip(props.data)}
    </ReactSelectComponents.SingleValue>
  )
}

function RefMultiValueLabel(
  props: MultiValueGenericProps<VocabOption, boolean>,
) {
  return (
    <ReactSelectComponents.MultiValueLabel {...props}>
      {renderVocabChip(props.data)}
    </ReactSelectComponents.MultiValueLabel>
  )
}

const referenceSelectComponents = {
  Option: RefOption,
  SingleValue: RefSingleValue,
  MultiValueLabel: RefMultiValueLabel,
}

export interface ItemEditFormHandle {
  validate: () => Promise<string | null>
  getValues: () => {
    values: string[]
    virtualValues: Record<string, string>
  }
  isDirty: () => boolean
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
  onDirtyChange?: (dirty: boolean) => void
}

function normalizeFieldName(fieldName: string): string {
  return String(fieldName ?? '')
    .trim()
    .toLowerCase()
}

function normalizeFieldSet(fields: string[]): Set<string> {
  return new Set(fields.map((field) => normalizeFieldName(field)))
}

function isIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === value
}

function isNumericCoordinate(value: string): boolean {
  if (!String(value ?? '').trim()) return false
  const parsed = Number(value)
  return Number.isFinite(parsed)
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
      onDirtyChange,
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
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)

    // Pristine baseline captured once at mount, used to detect unsaved changes.
    const initialSnapshotRef = useRef<string | null>(null)
    if (initialSnapshotRef.current === null) {
      initialSnapshotRef.current = JSON.stringify({ values, virtualValues })
    }
    const dirty =
      JSON.stringify({ values, virtualValues }) !== initialSnapshotRef.current

    useEffect(() => {
      onDirtyChange?.(dirty)
    }, [dirty, onDirtyChange])

    const archiveFolderPath = xlsxPath.replace(/[/\\][^/\\]+$/, '')
    const hiddenFieldSet = useMemo(
      () => normalizeFieldSet(hiddenFields),
      [hiddenFields],
    )

    const people = useAppSelector(selectPeople)
    const places = useAppSelector(selectPlaces)
    const localities = useAppSelector(selectLocalities)
    const languages = useAppSelector(selectLanguages)
    const organizations = useAppSelector(selectOrganizations)
    const tagVocabularies = useAppSelector(selectTagVocabularies)

    const [rootFolder, setRootFolder] = useState<string | null>(null)
    useEffect(() => {
      let cancelled = false
      window.api.getRootFolder().then((value) => {
        if (!cancelled) setRootFolder(value)
      })
      return () => {
        cancelled = true
      }
    }, [])
    // Referenced entities are global metadata under fixed root subfolders;
    // their depiction/thumbnail paths are relative to those folders.
    const referenceFolders = useMemo(() => {
      const base = rootFolder ? rootFolder.replace(/[/\\]+$/, '') : null
      return {
        People: base ? `${base}/People` : null,
        Places: base ? `${base}/Places` : null,
        Languages: base ? `${base}/Languages` : null,
        Organisations: base ? `${base}/Organisations` : null,
      }
    }, [rootFolder])

    const languageOptions: VocabOption[] = languages.map((language) => {
      const id = language['@id']
      const name = language.name
      const label = `${name} (${id})`
      return {
        value: id,
        label,
        searchText: `${name} ${id}`.toLowerCase(),
        name,
        depiction: language.depiction,
        folder: referenceFolders.Languages,
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
        name,
        depiction: person.depiction,
        folder: referenceFolders.People,
      }
    })
    const peopleOptionIds = new Set(peopleOptions.map((option) => option.value))

    const placesOptions: VocabOption[] = places.map((place) => {
      const id = place['@id']
      const name = place.name
      const label = `${name} (${id})`
      return {
        value: id,
        label,
        searchText: `${name} ${id}`.toLowerCase(),
        name,
        depiction: place.depiction,
        folder: referenceFolders.Places,
      }
    })
    const placesOptionIds = new Set(placesOptions.map((option) => option.value))

    const organizationsOptions: VocabOption[] = organizations.map(
      (organization) => {
        const id = organization['@id']
        const name = organization.name
        const label = `${name} (${id})`
        return {
          value: id,
          label,
          searchText: `${name} ${id}`.toLowerCase(),
          name,
          depiction: organization.depiction,
          folder: referenceFolders.Organisations,
        }
      },
    )

    const localitiesOptions: VocabOption[] = localities.map((locality) => {
      const id = locality['@id']
      const name = String(locality.name ?? '').trim()
      const latitude = locality['.latitude']
      const longitude = locality['.longitude']
      const coordinateLabel =
        latitude && longitude ? ` (${latitude}, ${longitude})` : ''
      const label = name ? `${name} (${id})` : `${id}${coordinateLabel}`
      return {
        value: id,
        label,
        searchText:
          `${name} ${id} ${latitude} ${longitude} ${locality.asWKT}`.toLowerCase(),
      }
    })
    const localitiesOptionIds = new Set(
      localitiesOptions.map((option) => option.value),
    )

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
        setValues((prev) => {
          const next = [...prev]
          next[index] = nextValue
          return next
        })
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
    ]
      .filter((fieldName) => normalizeFieldName(fieldName) !== 'aswkt')
      .filter((fieldName) => !isHiddenField(fieldName))

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

        if (field === 'dateCreated' || field === 'dateAdded') {
          if (!selectedValue) continue
          if (!isIsoDateString(selectedValue)) {
            return `✗ ${field} must be a full date in YYYY-MM-DD format`
          }
          continue
        }

        if (field === '.latitude' || field === 'latitude') {
          if (!selectedValue) continue
          if (!isNumericCoordinate(selectedValue)) {
            return `✗ ${field} must be a valid decimal number`
          }
          const latitude = Number(selectedValue)
          if (latitude < -90 || latitude > 90) {
            return `✗ ${field} must be between -90 and 90`
          }
          continue
        }

        if (field === '.longitude' || field === 'longitude') {
          if (!selectedValue) continue
          if (!isNumericCoordinate(selectedValue)) {
            return `✗ ${field} must be a valid decimal number`
          }
          const longitude = Number(selectedValue)
          if (longitude < -180 || longitude > 180) {
            return `✗ ${field} must be between -180 and 180`
          }
          continue
        }

        const source = getControlledVocabularyForField(field)
        if (
          source !== 'People' &&
          source !== 'Languages' &&
          source !== 'Places' &&
          source !== 'Localities' &&
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

        if (source === 'Places') {
          const ids = isMultiSelectField(field)
            ? selectedValue.split(/,\s*/).filter(Boolean)
            : [selectedValue]

          for (const id of ids) {
            if (!placesOptionIds.has(id)) {
              return `✗ ${field} must be selected from Places`
            }
          }
          continue
        }

        if (source === 'Localities') {
          const ids = isMultiSelectField(field)
            ? selectedValue.split(/,\s*/).filter(Boolean)
            : [selectedValue]

          for (const id of ids) {
            if (!localitiesOptionIds.has(id)) {
              return `✗ ${field} must be selected from Localities`
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
        isDirty: () => dirty,
      }),
      [renderedFields, values, virtualValues, lockedFieldValues, dirty],
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

    const hasDepictionField = renderedFields.some(
      (fieldName) =>
        normalizeFieldName(fieldName) ===
        normalizeFieldName(DEPICTION_FIELD_NAME),
    )
    const depictionValue = getFieldValue(DEPICTION_FIELD_NAME)
    const depictionPreviewPath = depictionValue.trim()
      ? (() => {
          const originalRelativePath =
            normalizeDepictionRelativePath(depictionValue)
          if (!originalRelativePath) return ''
          return `${archiveFolderPath.replace(/\\/g, '/')}/${originalRelativePath}`
        })()
      : ''
    const groupedFields = renderedFields.filter(
      (fieldName) =>
        normalizeFieldName(fieldName) !==
        normalizeFieldName(DEPICTION_FIELD_NAME),
    )

    return (
      <div className="edit-fields">
        {hasDepictionField && (
          <ImageSelectBox
            imageUrl={
              depictionPreviewPath
                ? `localfile://${depictionPreviewPath}`
                : undefined
            }
            onPick={() => {
              void handlePickDepiction(DEPICTION_FIELD_NAME)
            }}
            onClear={() => {
              setFieldValue(DEPICTION_FIELD_NAME, '')
            }}
            picking={depictionPickingField === DEPICTION_FIELD_NAME}
          />
        )}
        {groupRenderedFields(groupedFields).map(({ def, fields }) => (
          <details
            key={def.id}
            className="edit-group"
            open={def.defaultOpen ?? false}
          >
            <summary className="edit-group-summary">{def.label}</summary>
            {fields.map((fieldName) => {
              const isReadOnly = fieldName === '@id'
              const isTypeField = fieldName === '@type'
              const isDateCreatedField = fieldName === 'dateCreated'
              const isDateAddedField = fieldName === 'dateAdded'
              const isBooleanField = fieldName === 'isPublishable'
              const isDescriptionField = fieldName === 'description'
              const isLatitudeField =
                fieldName === '.latitude' || fieldName === 'latitude'
              const isLongitudeField =
                fieldName === '.longitude' || fieldName === 'longitude'
              const isFileLinksField =
                normalizeFieldName(fieldName) ===
                normalizeFieldName(FILE_LINKS_FIELD_NAME)
              const vocabularySource =
                getControlledVocabularyForField(fieldName)
              const isPeopleControlled = vocabularySource === 'People'
              const isPlacesControlled = vocabularySource === 'Places'
              const isLocalitiesControlled = vocabularySource === 'Localities'
              const isLanguagesControlled = vocabularySource === 'Languages'
              const isTagsControlled = vocabularySource === 'Tags'
              const isOrganizationsControlled =
                vocabularySource === 'Organization'
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

              return (
                <div key={fieldName} className="edit-field">
                  <span className="edit-field-key">
                    {getFieldDisplayLabel(fieldName)}
                    <InfoButtonWithTooltip
                      text={getFieldDescription(fieldName) ?? undefined}
                      position="right"
                    />
                  </span>
                  {isReadOnly ? (
                    <span className="edit-field-readonly">
                      {currentValue || '—'}
                    </span>
                  ) : isTypeField ? (
                    <span className="edit-field-readonly">
                      {currentValue || '—'}
                    </span>
                  ) : isDateAddedField ? (
                    <span className="edit-field-readonly">
                      {currentValue || '—'}
                    </span>
                  ) : isBooleanField ? (
                    <input
                      type="checkbox"
                      checked={currentValue === 'TRUE'}
                      onChange={(e) => {
                        setFieldValue(
                          fieldName,
                          e.target.checked ? 'TRUE' : 'FALSE',
                        )
                      }}
                    />
                  ) : isDateCreatedField ? (
                    <input
                      type="date"
                      value={currentValue}
                      onChange={(e) => {
                        setFieldValue(fieldName, e.target.value)
                      }}
                    />
                  ) : isDescriptionField ? (
                    <textarea
                      rows={5}
                      value={currentValue}
                      onChange={(e) => {
                        setFieldValue(fieldName, e.target.value)
                      }}
                    />
                  ) : isLatitudeField ? (
                    <>
                      <span className="edit-field-readonly">
                        {currentValue || '—'}
                      </span>
                      <div className="coordinate-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMapPickerOpen(true)
                          }}
                        >
                          Edit
                        </button>
                      </div>
                      <MapPickerModal
                        isOpen={isMapPickerOpen}
                        initialLatitude={getFieldValue(fieldName)}
                        initialLongitude={getFieldValue(
                          fieldName === 'latitude' ? 'longitude' : '.longitude',
                        )}
                        onClose={() => {
                          setIsMapPickerOpen(false)
                        }}
                        onConfirm={(latitude, longitude) => {
                          setFieldValue(fieldName, latitude)
                          setFieldValue(
                            fieldName === 'latitude'
                              ? 'longitude'
                              : '.longitude',
                            longitude,
                          )
                          setIsMapPickerOpen(false)
                        }}
                      />
                    </>
                  ) : isLongitudeField ? (
                    <>
                      <span className="edit-field-readonly">
                        {currentValue || '—'}
                      </span>
                      <div className="coordinate-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMapPickerOpen(true)
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </>
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
                              tagOptions.find(
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
                          Tag vocabulary is unavailable. Use the refresh action
                          in the subheader.
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
                      components={referenceSelectComponents}
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
                  ) : isPlacesControlled && isMultiSelectField(fieldName) ? (
                    <Select
                      isMulti
                      isDisabled={placesOptions.length === 0}
                      options={placesOptions}
                      value={currentValue
                        .split(/,\s*/)
                        .filter(Boolean)
                        .map(
                          (id) =>
                            placesOptions.find(
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
                        placesOptions.length === 0
                          ? 'Places vocabulary unavailable'
                          : 'Select places…'
                      }
                      components={referenceSelectComponents}
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
                  ) : isLocalitiesControlled &&
                    isMultiSelectField(fieldName) ? (
                    <Select
                      isMulti
                      isDisabled={localitiesOptions.length === 0}
                      options={localitiesOptions}
                      value={currentValue
                        .split(/,\s*/)
                        .filter(Boolean)
                        .map(
                          (id) =>
                            localitiesOptions.find(
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
                        localitiesOptions.length === 0
                          ? 'Localities vocabulary unavailable'
                          : 'Select localities…'
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
                  ) : isLocalitiesControlled ? (
                    <>
                      <Select
                        isClearable
                        isDisabled={localitiesOptions.length === 0}
                        options={localitiesOptions}
                        value={
                          localitiesOptions.find(
                            (option) => option.value === currentValue,
                          ) ||
                          (currentValue
                            ? {
                                value: currentValue,
                                label: currentValue,
                                searchText: currentValue,
                              }
                            : null)
                        }
                        onChange={(selected) => {
                          const option = selected as VocabOption | null
                          setFieldValue(fieldName, option?.value ?? '')
                        }}
                        placeholder={
                          localitiesOptions.length === 0
                            ? 'Localities vocabulary unavailable'
                            : 'Select locality…'
                        }
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: '#a62b2b',
                            minHeight: 34,
                          }),
                        }}
                      />
                      {localitiesOptions.length === 0 && (
                        <span className="edit-field-readonly">
                          Localities vocabulary is unavailable.
                        </span>
                      )}
                    </>
                  ) : isPlacesControlled ? (
                    <>
                      <Select
                        isClearable
                        isDisabled={placesOptions.length === 0}
                        options={placesOptions}
                        value={
                          placesOptions.find(
                            (option) => option.value === currentValue,
                          ) ||
                          (currentValue
                            ? {
                                value: currentValue,
                                label: currentValue,
                                searchText: currentValue,
                              }
                            : null)
                        }
                        onChange={(selected) => {
                          const option = selected as VocabOption | null
                          setFieldValue(fieldName, option?.value ?? '')
                        }}
                        placeholder={
                          placesOptions.length === 0
                            ? 'Places vocabulary unavailable'
                            : 'Select place…'
                        }
                        components={referenceSelectComponents}
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: '#a62b2b',
                            minHeight: 34,
                          }),
                        }}
                      />
                      {placesOptions.length === 0 && (
                        <span className="edit-field-readonly">
                          Places vocabulary is unavailable.
                        </span>
                      )}
                    </>
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
                            peopleOptions.find(
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
                        peopleOptions.length === 0
                          ? 'People vocabulary unavailable'
                          : 'Select people…'
                      }
                      components={referenceSelectComponents}
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
                  ) : isPeopleControlled ? (
                    <>
                      <Select
                        isClearable
                        isDisabled={peopleOptions.length === 0}
                        options={renderedPeopleOptions}
                        value={
                          renderedPeopleOptions.find(
                            (option) => option.value === currentValue,
                          ) ||
                          (currentValue
                            ? {
                                value: currentValue,
                                label: currentValue,
                                searchText: currentValue,
                              }
                            : null)
                        }
                        onInputChange={(inputValue) => {
                          setVocabSearch((prev) => ({
                            ...prev,
                            [fieldName]: inputValue,
                          }))
                        }}
                        onChange={(selected) => {
                          const option = selected as VocabOption | null
                          setFieldValue(fieldName, option?.value ?? '')
                        }}
                        placeholder={
                          peopleOptions.length === 0
                            ? 'People vocabulary unavailable'
                            : 'Select person…'
                        }
                        components={referenceSelectComponents}
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: '#a62b2b',
                            minHeight: 34,
                          }),
                        }}
                      />
                      {peopleOptions.length === 0 && (
                        <span className="edit-field-readonly">
                          People vocabulary is unavailable.
                        </span>
                      )}
                    </>
                  ) : isOrganizationsControlled ? (
                    <>
                      <Select
                        isClearable
                        isDisabled={organizationsOptions.length === 0}
                        options={organizationsOptions}
                        value={
                          organizationsOptions.find(
                            (option) => option.value === currentValue,
                          ) ||
                          (currentValue
                            ? {
                                value: currentValue,
                                label: currentValue,
                                searchText: currentValue,
                              }
                            : null)
                        }
                        onChange={(selected) => {
                          const option = selected as VocabOption | null
                          setFieldValue(fieldName, option?.value ?? '')
                        }}
                        placeholder={
                          organizationsOptions.length === 0
                            ? 'Organisations vocabulary unavailable'
                            : 'Select organisation…'
                        }
                        components={referenceSelectComponents}
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: '#a62b2b',
                            minHeight: 34,
                          }),
                        }}
                      />
                      {organizationsOptions.length === 0 && (
                        <span className="edit-field-readonly">
                          Organisations vocabulary is unavailable.
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
                </div>
              )
            })}
          </details>
        ))}
      </div>
    )
  },
)

export default ItemEditForm
