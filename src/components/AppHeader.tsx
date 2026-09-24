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
        'Upload this archive? This refreshes the Files tab in every collection.',
      )
    ) {
      return
    }
    try {
      const { collections, files } =
        await window.api.reconcileFilesTabs(rootFolder)
      window.alert(
        `Files tabs updated in ${collections} collection${
          collections === 1 ? '' : 's'
        } (${files} file${files === 1 ? '' : 's'}).`,
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
