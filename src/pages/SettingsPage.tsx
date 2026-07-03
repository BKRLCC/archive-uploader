import React, { useEffect, useState } from 'react'
import type { SavedFolder, UpdateStatus } from '../api'
import { version } from '../../package.json'

function getUpdateMessage(status: UpdateStatus): string {
  switch (status.state) {
    case 'checking':
      return 'Checking for updates…'
    case 'available':
      return 'Update available — downloading…'
    case 'not-available':
      return "You're up to date."
    case 'downloaded':
      return 'Update ready to install.'
    case 'error':
      return status.message ?? 'Could not check for updates.'
    case 'unsupported':
      return status.message ?? 'Updates are only available in the installed app.'
    default:
      return ''
  }
}

export default function SettingsPage() {
  const [rootFolder, setRootFolder] = useState<string | null>(null)
  const [savedFolders, setSavedFolders] = useState<SavedFolder[]>([])
  const [editingPath, setEditingPath] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const unsubscribe = window.api.onUpdateStatus((status) => {
      setUpdateStatus(status)
      if (status.state !== 'checking' && status.state !== 'available') {
        setIsChecking(false)
      }
    })
    return unsubscribe
  }, [])

  async function handleCheckForUpdates() {
    setIsChecking(true)
    const result = await window.api.checkForUpdates()
    setUpdateStatus(result)
    if (result.state !== 'checking' && result.state !== 'available') {
      setIsChecking(false)
    }
  }

  async function handleRestartToUpdate() {
    await window.api.quitAndInstallUpdate()
  }

  useEffect(() => {
    Promise.all([
      window.api.getRootFolder(),
      window.api.getSavedFolders(),
    ]).then(async ([folder, saved]) => {
      setRootFolder(folder)
      if (folder && !saved.some((f) => f.path === folder)) {
        const updated = await window.api.saveFolder('', folder)
        setSavedFolders(updated)
      } else {
        setSavedFolders(saved)
      }
    })
  }, [])

  async function handleAdd() {
    const chosen = await window.api.chooseRootFolder()
    if (chosen) {
      await window.api.saveFolder('', chosen)
      window.api.reloadApp()
    }
  }

  async function handleUse(path: string) {
    await window.api.setRootFolder(path)
    window.api.reloadApp()
  }

  function handleEditStart(f: SavedFolder) {
    setEditingPath(f.path)
    setEditName(f.name)
  }

  async function handleEditConfirm() {
    if (!editingPath) return
    const updated = await window.api.saveFolder(editName, editingPath)
    setSavedFolders(updated)
    setEditingPath(null)
  }

  async function handleDelete(path: string) {
    const updated = await window.api.removeSavedFolder(path)
    setSavedFolders(updated)
    setEditingPath(null)
  }

  return (
    <div className="settings-page">
      <div className="settings-section-header">
        <h2>Root folders</h2>
        <button onClick={handleAdd}>Add it</button>
      </div>
      <p>
        If you have more than one archive that you're working with, you can
        manage them here. Add new root folders, edit their display names, or
        switch between them.
      </p>
      <table className="folders-table">
        <tbody>
          {savedFolders.map((f) => {
            const isActive = f.path === rootFolder
            const isEditing = editingPath === f.path
            return (
              <tr key={f.path}>
                <td className="col-status">
                  {isActive ? (
                    <span className="folder-active-mark">✓</span>
                  ) : (
                    <button
                      className="btn-use"
                      onClick={() => handleUse(f.path)}
                    >
                      Use
                    </button>
                  )}
                </td>
                <td className="col-name">
                  {isEditing ? (
                    <input
                      className="folder-name-input"
                      type="text"
                      value={editName}
                      placeholder="Name…"
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditConfirm()
                        if (e.key === 'Escape') setEditingPath(null)
                      }}
                    />
                  ) : (
                    <span className={f.name ? undefined : 'folder-name-empty'}>
                      {f.name || 'Unnamed'}
                    </span>
                  )}
                </td>
                <td className="col-path">{f.path}</td>
                <td className="col-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="btn-icon"
                        title="Confirm"
                        onClick={handleEditConfirm}
                      >
                        ✓
                      </button>
                      <button
                        className="btn-icon"
                        title="Remove"
                        onClick={() => handleDelete(f.path)}
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-icon"
                      title="Edit name"
                      onClick={() => handleEditStart(f)}
                    >
                      ✏️
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="settings-updates">
        <button onClick={handleCheckForUpdates} disabled={isChecking}>
          {isChecking ? 'Checking…' : 'Check for updates'}
        </button>
        {updateStatus && (
          <span className="settings-update-status">
            {getUpdateMessage(updateStatus)}
          </span>
        )}
        {updateStatus?.state === 'downloaded' && (
          <button onClick={handleRestartToUpdate}>Restart now</button>
        )}
      </div>
      <p className="settings-version">v{version}</p>
    </div>
  )
}
