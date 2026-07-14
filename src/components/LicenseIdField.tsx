import React, { useState } from 'react'

// The @id of a license works differently from every other @id in the system:
// it is EITHER a URL that identifies a standard license (e.g. a Creative
// Commons deed) OR the path to a license file stored inside the archive. The
// two modes also drive the coupled @type value.
export const LICENSE_URL_TYPE = 'ldac:DataReuseLicense'
export const LICENSE_FILE_TYPE = '[ldac:DataReuseLicense, File]'

type LicenseIdMode = 'url' | 'file'

interface LicenseIdFieldProps {
  value: string
  archiveFolderPath: string
  onChange: (nextId: string, nextType: string) => void
  onFeedback?: (message: string) => void
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(String(value ?? '').trim())
}

function inferMode(value: string): LicenseIdMode {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return 'url'
  return looksLikeUrl(trimmed) ? 'url' : 'file'
}

export default function LicenseIdField({
  value,
  archiveFolderPath,
  onChange,
  onFeedback,
}: LicenseIdFieldProps) {
  const [mode, setMode] = useState<LicenseIdMode>(() => inferMode(value))
  const [isPicking, setIsPicking] = useState(false)

  const handleModeChange = (nextMode: LicenseIdMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    // Switching mode re-couples @type. Keep the existing @id only when it still
    // matches the new mode, otherwise clear it so the user re-enters/re-picks.
    if (nextMode === 'url') {
      const keep = looksLikeUrl(value) ? value : ''
      onChange(keep, LICENSE_URL_TYPE)
    } else {
      const keep = value && !looksLikeUrl(value) ? value : ''
      onChange(keep, LICENSE_FILE_TYPE)
    }
  }

  const handlePickLicenseFile = async () => {
    setIsPicking(true)
    try {
      const picked = await window.api.pickLicenseFile(archiveFolderPath)
      if (!picked) return
      onChange(picked, LICENSE_FILE_TYPE)
      onFeedback?.('')
    } catch (err) {
      onFeedback?.(`✗ ${(err as Error).message}`)
    } finally {
      setIsPicking(false)
    }
  }

  return (
    <div className="license-id-field">
      <div className="license-id-mode" role="radiogroup">
        <label className="license-id-mode-option">
          <input
            type="radio"
            name="license-id-mode"
            checked={mode === 'url'}
            onChange={() => {
              handleModeChange('url')
            }}
          />
          URL
        </label>
        {/* https://api.elsewhere-staging.k8s.elsewhere.to/api/dreams/019f5eeb-ecc7-740f-9a45-ed2c317f81dd/interpretations */}
        {/* https://api.elsewhere-staging.k8s.elsewhere.to/api/dreams/019f5eeb-ecc7-740f-9a45-ed2c317f81dd/interpretations */}
        <label className="license-id-mode-option">
          <input
            type="radio"
            name="license-id-mode"
            checked={mode === 'file'}
            onChange={() => {
              handleModeChange('file')
            }}
          />
          File
        </label>
      </div>

      {mode === 'url' ? (
        <input
          type="text"
          value={value}
          placeholder="https://creativecommons.org/licenses/by/4.0/"
          onChange={(e) => {
            onChange(e.target.value, LICENSE_URL_TYPE)
          }}
        />
      ) : (
        <div className="license-id-file">
          <span className="edit-field-readonly">{value || '—'}</span>
          <button
            type="button"
            disabled={isPicking}
            onClick={() => {
              void handlePickLicenseFile()
            }}
          >
            {isPicking ? 'Copying…' : 'Choose file…'}
          </button>
        </div>
      )}
    </div>
  )
}
