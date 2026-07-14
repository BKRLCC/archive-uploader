import React, { useState } from 'react'
import Select from 'react-select'
import { getFieldDisplayLabel } from '../config/field-labels'
import { useAppSelector } from '../ducks/hooks'
import { selectLicenses } from '../ducks/licenses'

const COLLECTION_TYPE = 'RepositoryCollection'

interface LicenseOption {
  value: string
  label: string
}

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
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  const licenses = useAppSelector(selectLicenses)
  const licenseOptions: LicenseOption[] = licenses.map((entry) => ({
    value: entry['@id'],
    label: entry.name || entry['@id'],
  }))
  const selectedLicense =
    licenseOptions.find((option) => option.value === license) ?? null

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
            <Select<LicenseOption>
              isClearable
              options={licenseOptions}
              value={selectedLicense}
              onChange={(option) => setLicense(option?.value ?? '')}
              placeholder={
                licenseOptions.length === 0
                  ? 'No licenses available'
                  : 'Select a license…'
              }
              noOptionsMessage={() => 'No licenses available'}
              isDisabled={licenseOptions.length === 0}
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
