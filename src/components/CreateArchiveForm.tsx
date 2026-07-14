import React, { useState } from 'react'
import { getFieldDisplayLabel } from '../config/field-labels'
import { useAppSelector } from '../ducks/hooks'
import { selectLicenses } from '../ducks/licenses'
import { selectPeople } from '../ducks/people'
import { selectOrganizations } from '../ducks/organizations'
import { selectLanguages } from '../ducks/languages'
import ReferenceSelect, { type ReferenceOption } from './ReferenceSelect'
import MultiReferenceSelect from './MultiReferenceSelect'
import DatePicker from './DatePicker'

const COLLECTION_TYPE = 'RepositoryCollection'

interface Props {
  folderPath: string
  onCreated: () => void
  onClose: () => void
}

export default function CreateArchiveForm({
  folderPath,
  onCreated,
  onClose,
}: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [license, setLicense] = useState('')
  const [author, setAuthor] = useState('')
  const [publisher, setPublisher] = useState('')
  const [datePublished, setDatePublished] = useState('')
  const [inLanguage, setInLanguage] = useState('')
  const [subjectLanguage, setSubjectLanguage] = useState('')
  const [metadataIsPublic, setMetadataIsPublic] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const licenses = useAppSelector(selectLicenses)
  const people = useAppSelector(selectPeople)
  const organizations = useAppSelector(selectOrganizations)
  const languages = useAppSelector(selectLanguages)

  const toOptions = (
    entries: { '@id': string; name: string }[],
  ): ReferenceOption[] =>
    entries.map((entry) => ({
      value: entry['@id'],
      label: entry.name || entry['@id'],
    }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setFeedback('✗ Name is required')
      return
    }
    setBusy(true)
    setFeedback('Creating…')
    try {
      await window.api.createArchive(folderPath, {
        name: name.trim(),
        description: description.trim(),
        identifier: identifier.trim(),
        isRef_license: license,
        isRef_author: author,
        isRef_publisher: publisher,
        datePublished: datePublished,
        isRef_inLanguage: inLanguage,
        'isRef_ldac:subjectLanguage': subjectLanguage,
        'ldac:metadataIsPublic': metadataIsPublic ? 'TRUE' : 'FALSE',
      })
      onCreated()
    } catch (err) {
      setFeedback(`✗ ${(err as Error).message}`)
      setBusy(false)
    }
  }

  return (
    <div className="drawer-inner">
      <h3>New metadata file</h3>
      <form onSubmit={handleSubmit}>
        <div className="edit-fields">
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel('name', COLLECTION_TYPE)}
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel('description', COLLECTION_TYPE)}
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel('identifier', COLLECTION_TYPE)}
            </span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel('isRef_license', COLLECTION_TYPE)}
            </span>
            <ReferenceSelect
              options={toOptions(licenses)}
              value={license}
              onChange={setLicense}
              placeholder="Select a license…"
              emptyLabel="No licenses available"
            />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel('isRef_author', COLLECTION_TYPE)}
            </span>
            <ReferenceSelect
              options={toOptions(people)}
              value={author}
              onChange={setAuthor}
              placeholder="Select a person…"
              emptyLabel="No people available"
            />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel('isRef_publisher', COLLECTION_TYPE)}
            </span>
            <ReferenceSelect
              options={toOptions(organizations)}
              value={publisher}
              onChange={setPublisher}
              placeholder="Select an organization…"
              emptyLabel="No organizations available"
            />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel('datePublished', COLLECTION_TYPE)}
            </span>
            <DatePicker value={datePublished} onChange={setDatePublished} />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel('isRef_inLanguage', COLLECTION_TYPE)}
            </span>
            <MultiReferenceSelect
              options={toOptions(languages)}
              value={inLanguage}
              onChange={setInLanguage}
              placeholder="Select languages…"
              emptyLabel="No languages available"
            />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel(
                'isRef_ldac:subjectLanguage',
                COLLECTION_TYPE,
              )}
            </span>
            <MultiReferenceSelect
              options={toOptions(languages)}
              value={subjectLanguage}
              onChange={setSubjectLanguage}
              placeholder="Select languages…"
              emptyLabel="No languages available"
            />
          </label>
          <label className="edit-field">
            <span className="edit-field-key">
              {getFieldDisplayLabel('ldac:metadataIsPublic', COLLECTION_TYPE)}
            </span>
            <input
              type="checkbox"
              checked={metadataIsPublic}
              onChange={(e) => setMetadataIsPublic(e.target.checked)}
            />
          </label>
        </div>
        <div className="edit-actions">
          <button type="submit" disabled={busy}>
            Create
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
        {feedback && <p className="edit-feedback">{feedback}</p>}
      </form>
    </div>
  )
}
