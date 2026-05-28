import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { SheetData } from '../api'
import BulkAddPopup from './BulkAddPopup'
import BulkEditDrawer from './BulkEditDrawer'
import EditDrawer from './EditDrawer'
import EditRootDatasetForm from './EditRootDatasetForm'
import Drawer from './Drawer'
import ClickableImagePreview from './ClickableImagePreview'
import { getDepictionThumbnailRelativePath } from '../config/depiction-config'
import { useAppDispatch } from '../ducks/hooks'
import { removePeopleByIds, upsertPerson } from '../ducks/people'
import { loadTagVocabulariesFromFolder } from '../ducks/tags-loader'
import { setTagVocabularies, setTagsError, setTagsLoading } from '../ducks/tags'
import { getFieldDisplayLabel } from '../config/field-labels'
import type { Person } from '../types/types'
import {
  getTableColumnLayout,
  isHiddenTableColumn,
} from '../config/table-column-layout'

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

function normalizeSheetName(name: string): string {
  return String(name ?? '').trim().toLowerCase()
}

function isPeopleSheetName(name: string): boolean {
  return normalizeSheetName(name) === 'people'
}

function getHeaderIndex(headers: string[], key: string): number {
  const normalizedKey = String(key ?? '').trim().toLowerCase()
  return headers.findIndex(
    (header) => String(header ?? '').trim().toLowerCase() === normalizedKey,
  )
}

function mapRowToPerson(headers: string[], row: string[]): Person | null {
  const idIndex = getHeaderIndex(headers, '@id')
  const typeIndex = getHeaderIndex(headers, '@type')
  const nameIndex = getHeaderIndex(headers, 'name')
  if (idIndex < 0 || typeIndex < 0 || nameIndex < 0) return null

  const id = String(row[idIndex] ?? '').trim()
  const rawType = String(row[typeIndex] ?? '').trim()
  const name = String(row[nameIndex] ?? '').trim()
  if (!id || !name) return null
  if (!rawType || (rawType !== 'Person' && !rawType.includes('Person'))) {
    return null
  }

  const person: Person = {
    '@id': id,
    '@type': 'Person',
    name,
  }

  const descriptionIndex = getHeaderIndex(headers, 'description')
  const genderIndex = getHeaderIndex(headers, 'gender')
  const birthDateIndex = getHeaderIndex(headers, 'birthDate')

  const description =
    descriptionIndex >= 0 ? String(row[descriptionIndex] ?? '').trim() : ''
  const gender = genderIndex >= 0 ? String(row[genderIndex] ?? '').trim() : ''
  const birthDate =
    birthDateIndex >= 0 ? String(row[birthDateIndex] ?? '').trim() : ''

  if (description) person.description = description
  if (gender) person.gender = gender
  if (birthDate) person.birthDate = birthDate

  return person
}

function getRowPersonId(headers: string[], row: string[]): string | null {
  const idIndex = getHeaderIndex(headers, '@id')
  if (idIndex < 0) return null
  const id = String(row[idIndex] ?? '').trim()
  return id || null
}

interface Props {
  xlsxPath: string
}

const VIRTUAL_ROW_HEIGHT_PX = 72
const VIRTUAL_OVERSCAN_ROWS = 10

export default function ArchiveView({ xlsxPath }: Props) {
  const dispatch = useAppDispatch()
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('RootDataset')
  const [sheets, setSheets] = useState<Record<string, SheetState>>({})

  const [editingRow, setEditingRow] = useState<EditingRow | null>(null)
  const [addingItem, setAddingItem] = useState<string | false>(false)
  const [bulkAddingItem, setBulkAddingItem] = useState<string | false>(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [bulkEditingRows, setBulkEditingRows] =
    useState<BulkEditingRows | null>(null)
  const [editingRootDataset, setEditingRootDataset] = useState(false)

  const [populateFeedback, setPopulateFeedback] = useState('')
  const [populateBusy, setPopulateBusy] = useState(false)
  const [tagsBusy, setTagsBusy] = useState(false)
  const [tagsFeedback, setTagsFeedback] = useState('')
  const [bulkFeedback, setBulkFeedback] = useState('')
  const [bulkActionFeedback, setBulkActionFeedback] = useState('')
  const [tableScrollTop, setTableScrollTop] = useState(0)
  const [tableViewportHeight, setTableViewportHeight] = useState(420)

  const tableScrollRef = useRef<HTMLDivElement | null>(null)
  const loadRequestRef = useRef(0)

  const folder = xlsxPath.replace(/[/\\][^/\\]+$/, '')

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
      const requestId = ++loadRequestRef.current
      const data = await window.api.readSheet(xlsxPath, name)
      if (requestId !== loadRequestRef.current) return
      setSheets((prev) => ({ ...prev, [name]: sheetStateFromData(data) }))
      clearSelection()
    },
    [clearSelection, xlsxPath],
  )

  const loadAll = useCallback(async () => {
    const requestId = ++loadRequestRef.current
    const names = await window.api.getSheetNames(xlsxPath)
    if (requestId !== loadRequestRef.current) return
    setSheetNames(names)
    const firstVisible = names.find((n) => n !== 'RootDataset')
    if (firstVisible) setActiveTab(firstVisible)
    const results = await Promise.all(
      names.map(async (name) => {
        const data = await window.api.readSheet(xlsxPath, name)
        return [name, sheetStateFromData(data)] as const
      }),
    )
    if (requestId !== loadRequestRef.current) return
    setSheets(Object.fromEntries(results))
  }, [xlsxPath])

  useEffect(() => {
    loadRequestRef.current += 1
    setSheetNames([])
    setSheets({})
    setActiveTab('RootDataset')
    closeDrawer()
    setPopulateFeedback('')
    setTagsFeedback('')
    setBulkFeedback('')
    setBulkActionFeedback('')
    setTableScrollTop(0)
    loadAll()
  }, [closeDrawer, loadAll])

  useEffect(() => {
    clearSelection()
    setTableScrollTop(0)
  }, [activeTab, clearSelection])

  // ── Populate Files tab ──────────────────────────────────────────────────────

  async function handlePopulate() {
    const rootFolder = await window.api.getRootFolder()
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

  async function handleRefreshTags() {
    setTagsBusy(true)
    setTagsFeedback('Refreshing…')
    dispatch(setTagsLoading(true))
    dispatch(setTagsError(null))
    try {
      const vocabularies = await loadTagVocabulariesFromFolder()
      dispatch(setTagVocabularies(vocabularies))
      setTagsFeedback(
        `✓ Loaded ${vocabularies.length} tag vocab${vocabularies.length === 1 ? '' : 's'}`,
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to refresh tags'
      dispatch(setTagsError(message))
      setTagsFeedback(`✗ ${message}`)
    } finally {
      dispatch(setTagsLoading(false))
      setTagsBusy(false)
    }
  }

  // ── Row handlers ────────────────────────────────────────────────────────────

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

    const idsToRemove = (() => {
      if (!isPeopleSheetName(sheetName)) return [] as string[]
      const sheet = sheets[sheetName]
      if (!sheet || typeof sheet === 'string') return [] as string[]
      return rowIndices
        .map((rowIndex) => sheet.rows[rowIndex] ?? [])
        .map((row) => getRowPersonId(sheet.headers, row))
        .filter((id): id is string => Boolean(id))
    })()

    try {
      const result = await window.api.deleteSheetRows(
        xlsxPath,
        sheetName,
        rowIndices,
      )
      if (idsToRemove.length > 0) {
        dispatch(removePeopleByIds(Array.from(new Set(idsToRemove))))
      }
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

    const depictionIndex = sheet.headers.indexOf('depiction')
    const hasDepiction = depictionIndex !== -1
    const idIndex = sheet.headers.findIndex((header) => header === '@id')
    const visibleRows = sheet.rows
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => {
        const hasAnyValue = row.some((cell) => String(cell ?? '').trim() !== '')
        if (!hasAnyValue) return false

        // For entity-style sheets, @id is required. Hide partial rows that have
        // no identifier so stale/invalid rows from prior bugs do not appear.
        if (idIndex >= 0) {
          return String(row[idIndex] ?? '').trim() !== ''
        }

        return true
      })
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
      .filter(({ h }) => !isHiddenTableColumn(h) && h !== 'depiction')
      .map(({ i }) => i)
    const depictionLayout = hasDepiction
      ? getTableColumnLayout('depiction')
      : null

    const visibleCount = Math.ceil(tableViewportHeight / VIRTUAL_ROW_HEIGHT_PX)
    const windowStart = Math.max(
      0,
      Math.floor(tableScrollTop / VIRTUAL_ROW_HEIGHT_PX) -
        VIRTUAL_OVERSCAN_ROWS,
    )
    const windowEnd = Math.min(
      visibleRows.length,
      windowStart + visibleCount + VIRTUAL_OVERSCAN_ROWS * 2,
    )
    const windowedRows = visibleRows.slice(windowStart, windowEnd)
    const topSpacerHeight = windowStart * VIRTUAL_ROW_HEIGHT_PX
    const bottomSpacerHeight =
      (visibleRows.length - windowEnd) * VIRTUAL_ROW_HEIGHT_PX
    const columnCount = 2 + (hasDepiction ? 1 : 0) + visibleIndices.length

    return (
      <div
        className="table-scroll virtualized-table-scroll"
        ref={tableScrollRef}
        onScroll={(event) => {
          setTableScrollTop(event.currentTarget.scrollTop)
          setTableViewportHeight(event.currentTarget.clientHeight)
        }}
      >
        <table className="sheet-table virtualized-table">
          <thead>
            <tr>
              <th className="edit-btn-cell edit-btn-header"></th>
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
              {hasDepiction && (
                <th
                  className={[
                    'depiction-thumb-header',
                    depictionLayout?.widthClassName,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {getFieldDisplayLabel('depiction')}
                </th>
              )}
              {visibleIndices.map((i) => {
                const headerName = sheet.headers[i] ?? ''
                const layout = getTableColumnLayout(headerName)
                const className = layout.widthClassName ?? 'col-width-default'
                return (
                  <th key={i} className={className}>
                    {getFieldDisplayLabel(headerName)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {topSpacerHeight > 0 && (
              <tr className="virtual-spacer-row" aria-hidden="true">
                <td colSpan={columnCount} style={{ height: topSpacerHeight }} />
              </tr>
            )}

            {windowedRows.map(({ row, rowIndex }) => (
              <tr
                key={rowIndex}
                className={[
                  selectedRows.has(rowIndex) ? 'selected-row' : '',
                  rowIndex % 2 === 0 ? 'row-even' : 'row-odd',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <td className="edit-btn-cell">
                  <button
                    type="button"
                    className="row-edit-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingRootDataset(false)
                      setAddingItem(false)
                      setEditingRow({ rowIndex, row, sheetName })
                    }}
                    aria-label={`Edit row ${rowIndex + 1}`}
                    title="Edit row"
                  >
                    ✏️
                  </button>
                </td>
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
                {hasDepiction && (
                  <td
                    className={[
                      'depiction-thumb-cell',
                      depictionLayout?.widthClassName,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {(() => {
                      const depictionPath = String(
                        row[depictionIndex] ?? '',
                      ).trim()
                      const thumbnailPath =
                        getDepictionThumbnailRelativePath(depictionPath)
                      if (!thumbnailPath) return null

                      const folderUrl = folder.replace(/\\/g, '/')
                      const canonicalUrl = `localfile://${folderUrl}/${depictionPath.replace(/^[/\\]+/, '').replace(/\\/g, '/')}`
                      return (
                        <ClickableImagePreview
                          imageUrl={`localfile://${folderUrl}/${thumbnailPath}`}
                          popupImageUrl={canonicalUrl}
                          altText="Depiction Thumbnail"
                        />
                      )
                    })()}
                  </td>
                )}
                {visibleIndices.map((i) => {
                  const headerName = sheet.headers[i] ?? ''
                  const layout = getTableColumnLayout(headerName)
                  const className = [
                    layout.widthClassName ?? 'col-width-default',
                    layout.wrapMode === 'clamp-2'
                      ? 'col-wrap-clamp-2'
                      : 'col-wrap-nowrap',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <td key={i} className={className}>
                      <span className="table-cell-text">{row[i] ?? ''}</span>
                    </td>
                  )
                })}
              </tr>
            ))}

            {bottomSpacerHeight > 0 && (
              <tr className="virtual-spacer-row" aria-hidden="true">
                <td
                  colSpan={columnCount}
                  style={{ height: bottomSpacerHeight }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  const rootDatasetSheet = sheets['RootDataset'] ?? null
  const rdValues = Object.fromEntries(
    (rootDatasetSheet && typeof rootDatasetSheet !== 'string'
      ? rootDatasetSheet.rows
      : []
    ).map((r) => [r[0] ?? '', r[1] ?? '']),
  )
  const drawerOpen =
    editingRootDataset || editingRow !== null || addingItem !== false

  return (
    <div className="archive-page" onClick={closeDrawer}>
      <div className="archive-main">
        <div className="collection-header">
          <div className="collection-header-text">
            <h1>{rdValues['name'] || 'Untitled collection'}</h1>
            {rdValues['description'] && (
              <p className="collection-description">
                {rdValues['description']}
              </p>
            )}
            <p className="collection-meta-ids">
              <span>{rdValues['@id'] || ''}</span>
              {rdValues['@id'] && rdValues['@type'] ? ' · ' : ''}
              <span>{rdValues['@type'] || ''}</span>
            </p>
          </div>
          <div className="collection-header-actions">
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
            <button
              className="refresh-btn"
              onClick={(e) => {
                e.stopPropagation()
                void handleRefreshTags()
              }}
              disabled={tagsBusy}
            >
              🏷️ Refresh tags vocab
            </button>{' '}
            <span className="populate-feedback">{tagsFeedback}</span>
          </div>
        </div>

        <div className="tab-bar">
          {sheetNames
            .filter((tab) => tab !== 'RootDataset')
            .map((tab) => (
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

        {activeTab !== 'Files' &&
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
              xlsxPath={xlsxPath}
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
                xlsxPath={xlsxPath}
                sheetName={editingRow.sheetName}
                onSave={(_rowIndex: number, updated: string[]) => {
                  if (isPeopleSheetName(editingRow.sheetName)) {
                    const previousPerson = mapRowToPerson(sheet.headers, editingRow.row)
                    const nextPerson = mapRowToPerson(sheet.headers, updated)

                    if (
                      previousPerson &&
                      (!nextPerson ||
                        nextPerson['@id'] !== previousPerson['@id'])
                    ) {
                      dispatch(removePeopleByIds([previousPerson['@id']]))
                    }

                    if (nextPerson) {
                      dispatch(upsertPerson(nextPerson))
                    }
                  }
                  void reloadSheet(editingRow.sheetName)
                }}
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
                xlsxPath={xlsxPath}
                sheetName={addingItem}
                onSave={(_rowIndex: number, newRow: string[]) => {
                  if (isPeopleSheetName(addingItem)) {
                    const person = mapRowToPerson(sheet.headers, newRow)
                    if (person) dispatch(upsertPerson(person))
                  }
                  void reloadSheet(addingItem)
                }}
                onClose={closeDrawer}
                isNew
              />
            ) : null
          })()}
      </Drawer>

      {bulkEditingRows &&
        (() => {
          const bulkEditingSheet = sheets[bulkEditingRows.sheetName]
          if (!bulkEditingSheet || typeof bulkEditingSheet === 'string') {
            return null
          }

          return (
            <BulkEditDrawer
              open
              headers={bulkEditingSheet.headers}
              rows={bulkEditingRows.rows}
              rowIndices={bulkEditingRows.rowIndices}
              xlsxPath={xlsxPath}
              sheetName={bulkEditingRows.sheetName}
              onComplete={async (updatedRows) => {
                const sheetName = bulkEditingRows.sheetName

                if (isPeopleSheetName(sheetName)) {
                  const idsToRemove = new Set<string>()

                  bulkEditingRows.rows.forEach((oldRow, index) => {
                    const previousPerson = mapRowToPerson(
                      bulkEditingSheet.headers,
                      oldRow,
                    )
                    const nextPerson = mapRowToPerson(
                      bulkEditingSheet.headers,
                      updatedRows[index] ?? [],
                    )

                    if (
                      previousPerson &&
                      (!nextPerson ||
                        nextPerson['@id'] !== previousPerson['@id'])
                    ) {
                      idsToRemove.add(previousPerson['@id'])
                    }

                    if (nextPerson) {
                      dispatch(upsertPerson(nextPerson))
                    }
                  })

                  if (idsToRemove.size > 0) {
                    dispatch(removePeopleByIds(Array.from(idsToRemove)))
                  }
                }

                clearSelection()
                setBulkEditingRows(null)
                await reloadSheet(sheetName)
              }}
              onClose={() => {
                setBulkEditingRows(null)
              }}
            />
          )
        })()}

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
              xlsxPath={xlsxPath}
              sheetName={bulkAddingItem}
              headers={sheet.headers}
              existingIds={existingIds}
              onComplete={(addedRows, skippedFiles, depictionWarningFiles) => {
                if (isPeopleSheetName(bulkAddingItem)) {
                  addedRows.forEach((row) => {
                    const person = mapRowToPerson(sheet.headers, row)
                    if (person) dispatch(upsertPerson(person))
                  })
                }

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
