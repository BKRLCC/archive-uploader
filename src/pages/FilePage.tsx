import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ArchiveView from '../components/ArchiveView'
import type { FileInfo } from '../api'
import {
  isArchiveEditableWorkbookPath,
  isArchiveWorkbookPath,
} from '../helpers/archive-workbooks'

export default function FilePage() {
  const [searchParams] = useSearchParams()
  const filePath = searchParams.get('path') ?? ''

  const [info, setInfo] = useState<FileInfo | null>(null)
  const [rootFolder, setRootFolder] = useState<string | null>(null)
  const [rootFolderResolved, setRootFolderResolved] = useState(false)

  useEffect(() => {
    window.api
      .getRootFolder()
      .then(setRootFolder)
      .finally(() => setRootFolderResolved(true))
  }, [])

  const isProtectedArchive = isArchiveWorkbookPath(filePath)
  const isArchiveEditable = isArchiveEditableWorkbookPath(filePath, rootFolder)

  useEffect(() => {
    if (!filePath || !rootFolderResolved || isArchiveEditable) return
    window.api.getFileInfo(filePath).then(setInfo)
  }, [filePath, rootFolderResolved, isArchiveEditable])

  if (!filePath) return <p>No file specified.</p>

  if (!rootFolderResolved && !isProtectedArchive) {
    return <p className="items-state">Loading…</p>
  }

  if (isArchiveEditable) {
    return <ArchiveView key={filePath} xlsxPath={filePath} />
  }

  const name = filePath.split(/[/\\]/).pop() ?? filePath

  return (
    <div className="file-page">
      <h1>{name}</h1>
      {info ? (
        <table className="file-info-table">
          <tbody>
            <tr>
              <th>Size</th>
              <td>{(info.size / 1024).toFixed(1)} KB</td>
            </tr>
            <tr>
              <th>Created</th>
              <td>{new Date(info.birthtime).toLocaleString()}</td>
            </tr>
            <tr>
              <th>Modified</th>
              <td>{new Date(info.mtime).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="items-state">Loading…</p>
      )}
    </div>
  )
}
