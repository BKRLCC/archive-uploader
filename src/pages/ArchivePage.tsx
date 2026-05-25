import React, { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { SheetData } from '../api'
import BulkEditDrawer from '../components/BulkEditDrawer'
import BulkAddPopup from '../components/BulkAddPopup'
import EditDrawer from '../components/EditDrawer'
import EditRootDatasetForm from '../components/EditRootDatasetForm'
import Drawer from '../components/Drawer'
import { getFieldDisplayLabel } from '../config/field-labels'

type SheetState = SheetData | null | 'empty' | 'missing'

interface EditingRow {
  rowIndex: number
  row: string[]
  sheetName: string
}

interface BulkEditingRows {
  rowIndices: number[]
  rows: string[][]
  sheetName: string
}

function sheetStateFromData(data: SheetData | null): SheetState {
  if (data === null) return 'missing'
  if (data.headers.length === 0) return 'empty'
  return data
}

export default function ArchivePage() {
  const location = useLocation()
  const folder: string | undefined = (location.state as { folder?: string })
    ?.folder

  const [rootFolder, setRootFolder] = useState<string | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('RootDataset')
  const [sheets, setSheets] = useState<Record<string, SheetState>>({})

  const [editingRow, setEditingRow] = useState<EditingRow | null>(null)
  const [addingItem, setAddingItem] = useState<string | false>(false) // sheetName or false
  const [bulkAddingItem, setBulkAddingItem] = useState<string | false>(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [bulkEditingRows, setBulkEditingRows] =
    useState<BulkEditingRows | null>(null)
  const [editingRootDataset, setEditingRootDataset] = useState(false)

  const [populateFeedback, setPopulateFeedback] = useState('')
  const [populateBusy, setPopulateBusy] = useState(false)
  const [bulkFeedback, setBulkFeedback] = useState('')
  const [bulkActionFeedback, setBulkActionFeedback] = useState('')

  const xlsxPath = folder ? folder + '/metadata.xlsx' : null

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set())
    setBulkEditingRows(null)
    setBulkActionFeedback('')
  }, [])

  const closeDrawer = useCallback(() => {
    setEditingRow(null)
    setAddingItem(false)
    setBulkAddingItem(false)
    clearSelection()
    setEditingRootDataset(false)
  }, [clearSelection])

  const reloadSheet = useCallback(
    async (name: string) => {
      if (!xlsxPath) return
      const data = await window.api.readSheet(xlsxPath, name)
      setSheets((prev) => ({ ...prev, [name]: sheetStateFromData(data) }))
      clearSelection()
    },
    [clearSelection, xlsxPath],
  )

  const loadAll = useCallback(async () => {
    if (!xlsxPath) return
    const names = await window.api.getSheetNames(xlsxPath)
    setSheetNames(names)
    if (names.length > 0) setActiveTab(names[0])
    const results = await Promise.all(
      names.map(async (name) => {
        const data = await window.api.readSheet(xlsxPath, name)
        return [name, sheetStateFromData(data)] as const
      }),
    )
    setSheets(Object.fromEntries(results))
  }, [xlsxPath])

  useEffect(() => {
    window.api.getRootFolder().then(setRootFolder)
    loadAll()
  }, [loadAll])

  useEffect(() => {
    clearSelection()
  }, [activeTab, clearSelection])

  // ── Breadcrumb ──────────────────────────────────────────────────────────────

  function renderBreadcrumb() {
    if (!rootFolder || !folder) return null
    const rel = folder.slice(rootFolder.length).replace(/^[/\\]/, '')
    const parts = rel ? rel.split(/[/\\]/) : []
    return ['🏠 Home', ...parts].join(' › ')
  }

  // ── Populate Files tab ──────────────────────────────────────────────────────

  async function handlePopulate() {
    if (!folder || !rootFolder) return
    setPopulateBusy(true)
    setPopulateFeedback('Working…')
    try {
      const { count } = await window.api.populateFilesTab(folder, rootFolder)
      setPopulateFeedback(`✓ Updated (${count} file${count !== 1 ? 's' : ''})`)
      await reloadSheet('Files')
    } catch (err) {
      setPopulateFeedback(`✗ ${(err as Error).message}`)
    } finally {
      setPopulateBusy(false)
    }
  }

  // ── Row handlers ────────────────────────────────────────────────────────────

  function handleSaveRow(
    rowIndex: number,
    updated: string[],
    sheetName: string,
  ) {
    setSheets((prev) => {
      const sheet = prev[sheetName]
      if (!sheet || typeof sheet === 'string') return prev
      return {
        ...prev,
        [sheetName]: {
          ...sheet,
          rows: sheet.rows.map((r, i) => (i === rowIndex ? updated : r)),
        },
      }
    })
  }

  function handleAddRow(
    _rowIndex: number,
    newRow: string[],
    sheetName: string,
  ) {
    setSheets((prev) => {
      const sheet = prev[sheetName]
      if (!sheet || typeof sheet === 'string') return prev
      return {
        ...prev,
        [sheetName]: { ...sheet, rows: [...sheet.rows, newRow] },
      }
    })
  }

  function handleAddRows(newRows: string[][], sheetName: string) {
    if (newRows.length === 0) return
    setSheets((prev) => {
      const sheet = prev[sheetName]
      if (!sheet || typeof sheet === 'string') return prev
      return {
        ...prev,
        [sheetName]: { ...sheet, rows: [...sheet.rows, ...newRows] },
      }
    })
  }

  function toggleRowSelection(rowIndex: number, checked: boolean) {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(rowIndex)
      } else {
        next.delete(rowIndex)
      }
      return next
    })
  }

  function toggleAllRows(rowIndices: number[], checked: boolean) {
    setSelectedRows(() => {
      if (!checked) return new Set()
      return new Set(rowIndices)
    })
  }

  async function handleBulkDelete(
    sheetName: string,
    rowIndices: number[],
  ): Promise<void> {
    const count = rowIndices.length
    if (
      count === 0 ||
      !window.confirm(`Delete ${count} selected row${count === 1 ? '' : 's'}?`)
    ) {
      return
    }

    setBulkActionFeedback('Deleting…')
    try {
      const result = await window.api.deleteSheetRows(
        xlsxPath!,
        sheetName,
        rowIndices,
      )
      setBulkActionFeedback(
        `✓ Deleted ${result.deletedCount} row${result.deletedCount === 1 ? '' : 's'}`,
      )
      await reloadSheet(sheetName)
    } catch (err) {
      setBulkActionFeedback(`✗ ${(err as Error).message}`)
    }
  }

  // ── Generic read-only table ─────────────────────────────────────────────────

  function renderGenericTable(sheet: SheetState, emptyLabel: string) {
    if (sheet === 'missing') return <p className="items-state">Not found.</p>
    if (sheet === 'empty') return <p className="items-state">{emptyLabel}</p>
    if (!sheet) return <p className="items-state">Loading…</p>
    return (
      <div className="table-scroll">
        <table className="sheet-table">
          <thead>
            <tr>
              {sheet.headers.map((h) => (
                <th key={h}>{getFieldDisplayLabel(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Editable Items-style table ──────────────────────────────────────────────

  function renderEditableTable(sheet: SheetState, sheetName: string) {
    if (sheet === 'missing')
      return <p className="items-state">Sheet not found in metadata.xlsx.</p>
    if (sheet === 'empty')
      return <p className="items-state">This tab is empty.</p>
    if (!sheet) return <p className="items-state">Loading…</p>

    const visibleRows = sheet.rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => row.some((cell) => String(cell ?? '').trim() !== ''))
    const visibleRowIndices = visibleRows.map(({ rowIndex }) => rowIndex)
    const visibleRowIndexSet = new Set(visibleRowIndices)
    const selectedVisibleRowIndices = Array.from(selectedRows)
      .filter((rowIndex) => visibleRowIndexSet.has(rowIndex))
      .sort((a, b) => a - b)
    const selectedCount = selectedVisibleRowIndices.length
    const allRowsSelected =
      visibleRows.length > 0 && selectedCount === visibleRows.length

    const visibleIndices = sheet.headers
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => h === '@type' || !h.startsWith('@'))
      .map(({ i }) => i)

    return (
      <div className="table-scroll">
        <table className="sheet-table">
          <thead>
            <tr>
              <th className="select-row-cell">
                <input
                  type="checkbox"
                  checked={allRowsSelected}
                  onChange={(e) => {
                    toggleAllRows(visibleRowIndices, e.target.checked)
                  }}
                  aria-label="Select all rows"
                />
              </th>
              <th></th>
              {visibleIndices.map((i) => (
                <th key={i}>{getFieldDisplayLabel(sheet.headers[i])}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(({ row, rowIndex }) => (
              <tr
                key={rowIndex}
                className={selectedRows.has(rowIndex) ? 'selected-row' : ''}
              >
                <td className="select-row-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleRowSelection(rowIndex, e.target.checked)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select row ${rowIndex + 1}`}
                  />
                </td>
                <td
                  className="edit-btn-cell"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingRootDataset(false)
                    setAddingItem(false)
                    setEditingRow({ rowIndex, row, sheetName })
                  }}
                >
                  ✏️
                </td>
                {visibleIndices.map((i) => (
                  <td key={i}>{row[i] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (!folder) {
    return (
      <div>
        <p>No folder specified.</p>
      </div>
    )
  }

  const rootDatasetSheet = sheets['RootDataset'] ?? null
  const drawerOpen =
    editingRootDataset || editingRow !== null || addingItem !== false

  return (
    <div className="archive-page" onClick={closeDrawer}>
      <div className="archive-main">
        <h1>⭐ Archive</h1>
        <p className="folder-path">{renderBreadcrumb()}</p>

        <div className="tab-bar">
          {sheetNames.map((tab) => (
            <button
              key={tab}
              className={`tab${activeTab === tab ? ' active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab(tab)
                closeDrawer()
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'RootDataset' && (
          <section>
            <div className="section-toolbar">
              <h2>Root Dataset</h2>
              <button
                className="refresh-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  closeDrawer()
                  setEditingRootDataset(true)
                }}
              >
                ✏️ Edit
              </button>
            </div>
            {renderGenericTable(rootDatasetSheet, 'RootDataset tab is empty.')}
          </section>
        )}

        {activeTab === 'Files' && (
          <section>
            <div className="section-toolbar">
              <h2>Files</h2>
              <div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePopulate()
                  }}
                  disabled={populateBusy}
                  className="refresh-btn"
                >
                  ↻ Update Files tab
                </button>{' '}
                <span className="populate-feedback">{populateFeedback}</span>
              </div>
            </div>
            {renderGenericTable(sheets['Files'] ?? null, 'Files tab is empty.')}
          </section>
        )}

        {activeTab !== 'RootDataset' &&
          activeTab !== 'Files' &&
          (() => {
            const sheet = sheets[activeTab] ?? null
            const visibleRowIndices =
              sheet && typeof sheet !== 'string'
                ? sheet.rows
                    .map((row, rowIndex) => ({ row, rowIndex }))
                    .filter(({ row }) =>
                      row.some((cell) => String(cell ?? '').trim() !== ''),
                    )
                    .map(({ rowIndex }) => rowIndex)
                : []
            const visibleRowIndexSet = new Set(visibleRowIndices)
            const selectedRowIndices = Array.from(selectedRows)
              .filter((rowIndex) => visibleRowIndexSet.has(rowIndex))
              .sort((a, b) => a - b)
            const selectedCount = selectedRowIndices.length
            return (
              <section>
                <div className="section-toolbar">
                  <h2>{activeTab}</h2>
                  <div>
                    <button
                      className="refresh-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        reloadSheet(activeTab)
                      }}
                    >
                      ↻ Refresh
                    </button>{' '}
                    {sheet && typeof sheet !== 'string' && (
                      <button
                        className="refresh-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeDrawer()
                          setAddingItem(activeTab)
                        }}
                      >
                        + Add item
                      </button>
                    )}
                    {sheet && typeof sheet !== 'string' && (
                      <button
                        className="refresh-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeDrawer()
                          setBulkAddingItem(activeTab)
                          setBulkFeedback('')
                        }}
                      >
                        + Bulk add
                      </button>
                    )}
                    <span className="populate-feedback">{bulkFeedback}</span>
                  </div>
                </div>
                {sheet && typeof sheet !== 'string' && selectedCount > 0 && (
                  <div className="bulk-actions-bar">
                    <span>
                      {selectedCount} row{selectedCount === 1 ? '' : 's'}{' '}
                      selected
                    </span>
                    <button
                      className="refresh-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        const rows = selectedRowIndices.map(
                          (rowIndex) => sheet.rows[rowIndex] ?? [],
                        )
                        setBulkEditingRows({
                          rowIndices: selectedRowIndices,
                          rows,
                          sheetName: activeTab,
                        })
                      }}
                    >
                      Edit selected
                    </button>
                    <button
                      className="refresh-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleBulkDelete(activeTab, selectedRowIndices)
                      }}
                    >
                      Delete selected
                    </button>
                    <button
                      className="refresh-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearSelection()
                      }}
                    >
                      Clear selection
                    </button>
                    <span className="populate-feedback">
                      {bulkActionFeedback}
                    </span>
                  </div>
                )}
                {renderEditableTable(sheet, activeTab)}
              </section>
            )
          })()}
      </div>

      <Drawer open={drawerOpen} width={320}>
        {editingRootDataset &&
          rootDatasetSheet &&
          typeof rootDatasetSheet !== 'string' && (
            <EditRootDatasetForm
              sheetData={rootDatasetSheet}
              xlsxPath={xlsxPath!}
              onSave={(updated) =>
                setSheets((prev) => ({ ...prev, RootDataset: updated }))
              }
              onClose={closeDrawer}
            />
          )}
        {editingRow &&
          (() => {
            const sheet = sheets[editingRow.sheetName]
            return sheet && typeof sheet !== 'string' ? (
              <EditDrawer
                headers={sheet.headers}
                row={editingRow.row}
                rowIndex={editingRow.rowIndex}
                xlsxPath={xlsxPath!}
                sheetName={editingRow.sheetName}
                onSave={(rowIndex, updated) =>
                  handleSaveRow(rowIndex, updated, editingRow.sheetName)
                }
                onClose={closeDrawer}
              />
            ) : null
          })()}
        {addingItem &&
          (() => {
            const sheet = sheets[addingItem]
            return sheet && typeof sheet !== 'string' ? (
              <EditDrawer
                headers={sheet.headers}
                row={sheet.headers.map(() => '')}
                rowIndex={-1}
                xlsxPath={xlsxPath!}
                sheetName={addingItem}
                onSave={(rowIndex, newRow) =>
                  handleAddRow(rowIndex, newRow, addingItem)
                }
                onClose={closeDrawer}
                isNew
              />
            ) : null
          })()}
      </Drawer>

      {bulkEditingRows && (
        <BulkEditDrawer
          open
          headers={sheets[bulkEditingRows.sheetName]?.headers ?? []}
          rows={bulkEditingRows.rows}
          rowIndices={bulkEditingRows.rowIndices}
          xlsxPath={xlsxPath!}
          sheetName={bulkEditingRows.sheetName}
          onComplete={async () => {
            const sheetName = bulkEditingRows.sheetName
            clearSelection()
            setBulkEditingRows(null)
            await reloadSheet(sheetName)
          }}
          onClose={() => {
            setBulkEditingRows(null)
          }}
        />
      )}

      {bulkAddingItem &&
        (() => {
          const sheet = sheets[bulkAddingItem]
          if (!sheet || typeof sheet === 'string') return null

          const idIndex = sheet.headers.findIndex((header) => header === '@id')
          const existingIds = new Set(
            idIndex >= 0
              ? sheet.rows
                  .map((row) => String(row[idIndex] ?? '').trim())
                  .filter(Boolean)
              : [],
          )

          return (
            <BulkAddPopup
              isOpen
              xlsxPath={xlsxPath!}
              sheetName={bulkAddingItem}
              headers={sheet.headers}
              existingIds={existingIds}
              onComplete={(addedRows, skippedFiles, depictionWarningFiles) => {
                handleAddRows(addedRows, bulkAddingItem)
                const addedCount = addedRows.length
                const skippedCount = skippedFiles.length
                const warningCount = depictionWarningFiles.length
                setBulkFeedback(
                  `✓ Added ${addedCount} item${addedCount === 1 ? '' : 's'}${
                    skippedCount > 0
                      ? ` (${skippedCount} skipped because IDs already exist)`
                      : ''
                  }${
                    warningCount > 0
                      ? ` (${warningCount} video depiction${warningCount === 1 ? '' : 's'} failed)`
                      : ''
                  }`,
                )
                void reloadSheet(bulkAddingItem)
                setBulkAddingItem(false)
              }}
              onClose={() => {
                setBulkAddingItem(false)
              }}
            />
          )
        })()}
    </div>
  )
}
