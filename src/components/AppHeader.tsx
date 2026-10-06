import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { UiIcons } from '../config/icons'
import logo from '../icons/logo.png'

export default function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'

  async function handleUpload() {
    const rootFolder = await window.api.getRootFolder()
    if (!rootFolder) {
      window.alert('Set an archive root folder before uploading.')
      return
    }
    if (
      !window.confirm(
        'Upload this archive? This refreshes the Files tab in every collection, then builds the RO-Crate.',
      )
    ) {
      return
    }
    try {
      await window.api.reconcileFilesTabs(rootFolder)
      const { fileCount, entityCount, warningCount } =
        await window.api.uploadArchive(rootFolder)
      window.alert(
        `Uploaded ${fileCount} workbook${fileCount === 1 ? '' : 's'} → ` +
          `${entityCount} entit${entityCount === 1 ? 'y' : 'ies'}, ` +
          `${warningCount} warning${warningCount === 1 ? '' : 's'}.\n` +
          'Saved ro-crate-metadata.json and ro-crate-warnings.json to the archive root.',
      )
    } catch (err) {
      window.alert(`Upload failed: ${(err as Error).message}`)
    }
  }

  return (
    <header className="app-header">
      {!isHome && (
        <div className="app-header-back">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      )}
      <span
        className="app-header-title"
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <img src={logo} alt="" style={{ height: 28, width: 28 }} />
        Balachi
      </span>
      <div className="app-header-nav no-drag">
        <button
          className="header-nav-btn"
          onClick={() => void handleUpload()}
          title="Upload archive"
        >
          {UiIcons.upload}
        </button>
        <button
          className="header-nav-btn"
          onClick={() => void window.api.reloadApp()}
          title="Refresh"
        >
          {UiIcons.refresh}
        </button>
        <button
          className="header-nav-btn"
          onClick={() => navigate('/')}
          title="Home"
        >
          {UiIcons.home}
        </button>
        <button
          className="header-nav-btn"
          onClick={() => navigate('/browser')}
          title="File Browser"
        >
          {UiIcons.fileBrowser}
        </button>
        <button
          className="header-nav-btn"
          onClick={() => navigate('/settings')}
          title="Settings"
        >
          {UiIcons.settings}
        </button>
      </div>
    </header>
  )
}
