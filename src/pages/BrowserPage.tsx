import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { DirEntry, FileInfo } from '../api'
import FilePreview, { type Selected } from '../components/FilePreview'
import FilePreviewPopup from '../components/FilePreviewPopup'
import Drawer from '../components/Drawer'
import CreateArchiveForm from '../components/CreateArchiveForm'
import FilePage from './FilePage'
import { UiIcons } from '../config/icons'
import {
  getPreviewKindByExtension,
  isPreviewableExtension,
  PREVIEWABLE_AUDIO_EXTENSIONS,
  PREVIEWABLE_IMAGE_EXTENSIONS,
  PREVIEWABLE_VIDEO_EXTENSIONS,
  type PreviewKind,
} from '../config/previewable-file-types'
import {
  getArchiveWorkbookLabel,
  isArchiveEditableWorkbookPath,
} from '../helpers/archive-workbooks'
import { dataTypeLabels, labelToDataTypeMap } from '../config/datatype-labels'
import { DRAWER_WIDTH } from '../config/ui-config'

// ── Constants ────────────────────────────────────────────────────────────────

const EMOJI = {
  folder: UiIcons.folder,
  image: UiIcons.image,
  audio: UiIcons.audio,
  video: UiIcons.video,
  doc: UiIcons.doc,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function emojiFor(entry: DirEntry, isArchiveEditable: boolean) {
  // If it's a recognised type folder, show a specific emoji for that
  const labelDataType = labelToDataTypeMap[entry.name]
  if (labelDataType) {
    return dataTypeLabels[labelDataType].icon
  }

  if (entry.isDirectory) return EMOJI.folder
  if (isArchiveEditable) return '⭐'
  if (PREVIEWABLE_IMAGE_EXTENSIONS.has(entry.ext)) return EMOJI.image
  if (PREVIEWABLE_AUDIO_EXTENSIONS.has(entry.ext)) return EMOJI.audio
  if (PREVIEWABLE_VIDEO_EXTENSIONS.has(entry.ext)) return EMOJI.video
  return EMOJI.doc
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BrowserPage() {
  const navigate = useNavigate()

  const [rootFolder, setRootFolder] = useState<string | null>(null)
  const [entries, setEntries] = useState<DirEntry[]>([])

  const [searchParams, setSearchParams] = useSearchParams()
  const pathParam = searchParams.get('path')
  const currentPath = pathParam ?? rootFolder
  const isFile = searchParams.get('type') === 'file'
  const showCreate = searchParams.get('showCreate') === '1'
  const refreshKey = searchParams.get('r')
  const [selected, setSelected] = useState<Selected | null>(null)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    filePath: string
    entry: DirEntry
  } | null>(null)
  const [previewTarget, setPreviewTarget] = useState<{
    filePath: string
    fileName: string
    previewKind: PreviewKind
  } | null>(null)

  const navigateTo = useCallback(
    (folderPath: string) => {
      navigate(`/browser?path=${encodeURIComponent(folderPath)}`)
    },
    [navigate],
  )

  const navigateToFile = useCallback(
    (filePath: string) => {
      navigate(`/browser?path=${encodeURIComponent(filePath)}&type=file`)
    },
    [navigate],
  )

  const refreshCurrentFolder = useCallback(async () => {
    if (!currentPath) return
    const result = await window.api.listFolder(currentPath)
    setEntries(result)
  }, [currentPath])

  // Load rootFolder once on mount
  useEffect(() => {
    window.api.getRootFolder().then(setRootFolder)
  }, [])

  // When rootFolder loads and no ?path= is set, navigate there (replace so it's not a history entry)
  useEffect(() => {
    if (rootFolder && !pathParam) {
      navigate(`/browser?path=${encodeURIComponent(rootFolder)}`, {
        replace: true,
      })
    }
  }, [rootFolder, pathParam, navigate])

  // Load entries and clear selection whenever the displayed folder changes
  useEffect(() => {
    if (!currentPath || isFile) return
    setSelected(null)
    setFileInfo(null)
    setContextMenu(null)
    window.api.listFolder(currentPath).then(setEntries)
  }, [currentPath, isFile, refreshKey])

  const handleSelect = useCallback(
    async (entry: DirEntry, filePath: string) => {
      setSelected({ entry, filePath })
      setFileInfo(null)
      const info = await window.api.getFileInfo(filePath)
      setFileInfo(info)
    },
    [],
  )

  const handleEntryClick = useCallback(
    (e: React.MouseEvent, entry: DirEntry, filePath: string) => {
      e.stopPropagation()
      handleSelect(entry, filePath)
    },
    [handleSelect],
  )

  const handleEntryDblClick = useCallback(
    (e: React.MouseEvent, entry: DirEntry, filePath: string) => {
      e.stopPropagation()
      if (entry.isDirectory) {
        navigateTo(filePath)
      } else {
        navigateToFile(filePath)
      }
    },
    [navigateTo, navigateToFile],
  )

  const closePanel = useCallback(() => {
    setSelected(null)
    setFileInfo(null)
    setContextMenu(null)
    if (searchParams.has('showCreate')) {
      const next = new URLSearchParams(searchParams)
      next.delete('showCreate')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!currentPath) {
    return (
      <div className="browser-page">
        <p className="empty-state">
          No root folder set.{' '}
          <Link to="/settings">Choose one in Settings →</Link>
        </p>
      </div>
    )
  }

  if (isFile) {
    return <FilePage />
  }

  return (
    <div className="browser-page" onClick={closePanel}>
      <div className="browser-inner">
        <div className="browser-left">
          <div className="file-list-wrapper">
            <ul className="file-list">
              {entries.length === 0 ? (
                <li className="empty">This folder is empty.</li>
              ) : (
                entries.map((entry) => {
                  const filePath = currentPath + '/' + entry.name
                  const isSelected = selected?.filePath === filePath
                  const isArchiveEditable =
                    !entry.isDirectory &&
                    isArchiveEditableWorkbookPath(filePath, rootFolder)
                  return (
                    <li
                      key={entry.name}
                      className={[
                        entry.isDirectory || isArchiveEditable ? 'folder' : '',
                        isSelected ? 'selected' : '',
                      ]
                        .join(' ')
                        .trim()}
                      onClick={(e) => handleEntryClick(e, entry, filePath)}
                      onDoubleClick={(e) =>
                        handleEntryDblClick(e, entry, filePath)
                      }
                      onContextMenu={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          filePath,
                          entry,
                        })
                      }}
                    >
                      {emojiFor(entry, isArchiveEditable)}&nbsp;&nbsp;
                      {getArchiveWorkbookLabel(entry.name)}
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </div>
        <Drawer open={selected !== null || showCreate} width={DRAWER_WIDTH}>
          {showCreate && currentPath ? (
            <CreateArchiveForm
              folderPath={currentPath}
              onCreated={async () => {
                closePanel()
                await refreshCurrentFolder()
              }}
              onClose={closePanel}
            />
          ) : (
            <FilePreview selected={selected} fileInfo={fileInfo} />
          )}
        </Drawer>
      </div>
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (contextMenu.entry.isDirectory) {
                navigateTo(contextMenu.filePath)
              } else {
                navigateToFile(contextMenu.filePath)
              }
              setContextMenu(null)
            }}
          >
            Open
          </button>
          <button
            onClick={() => {
              window.api.showInFinder(contextMenu.filePath)
              setContextMenu(null)
            }}
          >
            Show in Finder
          </button>
          {!contextMenu.entry.isDirectory &&
            isPreviewableExtension(contextMenu.entry.ext) && (
              <button
                onClick={() => {
                  const previewKind = getPreviewKindByExtension(
                    contextMenu.entry.ext,
                  )
                  if (!previewKind) {
                    setContextMenu(null)
                    return
                  }

                  setPreviewTarget({
                    filePath: contextMenu.filePath,
                    fileName: contextMenu.entry.name,
                    previewKind,
                  })
                  setContextMenu(null)
                }}
              >
                Preview
              </button>
            )}
          {!contextMenu.entry.isDirectory && (
            <button
              className="context-menu-danger"
              onClick={async () => {
                const name = contextMenu.entry.name
                const fp = contextMenu.filePath
                setContextMenu(null)
                if (!window.confirm(`Delete "${name}"? This cannot be undone.`))
                  return
                await window.api.deleteFile(fp)
                closePanel()
                await refreshCurrentFolder()
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
      {previewTarget && (
        <FilePreviewPopup
          isOpen={true}
          onClose={() => setPreviewTarget(null)}
          filePath={previewTarget.filePath}
          fileName={previewTarget.fileName}
          previewKind={previewTarget.previewKind}
        />
      )}
    </div>
  )
}
