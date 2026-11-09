import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { SheetData } from '../api'
import BulkAddPopup from './BulkAddPopup'
import BulkAddListPopup from './BulkAddListPopup'
import BulkEditDrawer from './BulkEditDrawer'
import EditDrawer from './EditDrawer'
import EditRootDatasetForm from './EditRootDatasetForm'
import Drawer from './Drawer'
import OverflowMenu from './OverflowMenu'
import InfoButtonWithTooltip from './InfoButtonWithTooltip'
import VirtualizedSheetTable from './VirtualizedSheetTable'
import { useAppDispatch } from '../ducks/hooks'
import { removePeopleByIds, upsertPerson } from '../ducks/people'
import {
  removeOrganizationsByIds,
  upsertOrganization,
} from '../ducks/organizations'
import { loadTagVocabulariesFromFolder } from '../ducks/tags-loader'
import { setTagVocabularies } from '../ducks/tags'
import { getFieldDisplayLabel } from '../config/field-labels'
import { parseHasPartPaths } from '../helpers/file-linkage'
import { UiIcons } from '../config/icons'
import type { Person, Organization } from '../types/types'
import { DRAWER_WIDTH } from '../config/ui-config'

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
  return String(name ?? '')
    .trim()
    .toLowerCase()
}

function isPeopleSheetName(name: string): boolean {
  return normalizeSheetName(name) === 'people'
}

function isOrganisationsSheetName(name: string): boolean {
  return normalizeSheetName(name) === 'organisations'
}

function getHeaderIndex(headers: string[], key: string): number {
  const normalizedKey = String(key ?? '')
    .trim()
    .toLowerCase()
  return headers.findIndex(
    (header) =>
      String(header ?? '')
        .trim()
        .toLowerCase() === normalizedKey,
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

function mapRowToOrganization(
  headers: string[],
  row: string[],
): Organization | null {
  const idIndex = getHeaderIndex(headers, '@id')
  const typeIndex = getHeaderIndex(headers, '@type')
  const nameIndex = getHeaderIndex(headers, 'name')
  if (idIndex < 0 || typeIndex < 0 || nameIndex < 0) return null

  const id = String(row[idIndex] ?? '').trim()
  const rawType = String(row[typeIndex] ?? '').trim()
  const name = String(row[nameIndex] ?? '').trim()
  if (!id || !name) return null
  if (
    !rawType ||
    (rawType !== 'Organization' && !rawType.includes('Organization'))
  ) {
    return null
  }

  const organization: Organization = {
    '@id': id,
    '@type': 'Organization',
    name,
  }

  const descriptionIndex = getHeaderIndex(headers, 'description')
  const depictionIndex = getHeaderIndex(headers, 'isRef_image')
  const urlIndex = getHeaderIndex(headers, 'url')
  const sameAsIndex = getHeaderIndex(headers, 'sameAs')

  const description =
    descriptionIndex >= 0 ? String(row[descriptionIndex] ?? '').trim() : ''
  const depiction =
    depictionIndex >= 0 ? String(row[depictionIndex] ?? '').trim() : ''
  const url = urlIndex >= 0 ? String(row[urlIndex] ?? '').trim() : ''
  const sameAs = sameAsIndex >= 0 ? String(row[sameAsIndex] ?? '').trim() : ''

  if (description) organization.description = description
  if (depiction) organization.isRef_image = depiction
  if (url) organization.url = url
  if (sameAs) organization.sameAs = sameAs

  return organization
}

function getRowOrganizationId(headers: string[], row: string[]): string | null {
  const idIndex = getHeaderIndex(headers, '@id')
  if (idIndex < 0) return null
  const id = String(row[idIndex] ?? '').trim()
  return id || null
}

interface Props {
  xlsxPath: string
}

export default function CollectionView({ xlsxPath }: Props) {
  const dispatch = useAppDispatch()
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('RootDataset')
  const [sheets, setSheets] = useState<Record<string, SheetState>>({})

  const [editingRow, setEditingRow] = useState<EditingRow | null>(null)
  const [addingItem, setAddingItem] = useState<string | false>(false)
  const [bulkAddingItem, setBulkAddingItem] = useState<string | false>(false)
  const [bulkAddingList, setBulkAddingList] = useState<string | false>(false)
  const [searchNewItems, setSearchNewItems] = useState<
    { sheetName: string; files: string[] } | false
  >(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [bulkEditingRows, setBulkEditingRows] =
    useState<BulkEditingRows | null>(null)
  const [editingRootDataset, setEditingRootDataset] = useState(false)
  const [drawerDirty, setDrawerDirty] = useState(false)

  const [populateFeedback, setPopulateFeedback] = useState('')
  const [populateBusy, setPopulateBusy] = useState(false)
  const [bulkFeedback, setBulkFeedback] = useState('')
  const [bulkActionFeedback, setBulkActionFeedback] = useState('')

  const loadRequestRef = useRef(0)
  // Tracks whether a pointer interaction began inside the drawer, so a text
  // selection that drags past the drawer edge doesn't count as a backdrop click.
  const pointerDownInsideDrawerRef = useRef(false)

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
    setSearchNewItems(false)
    clearSelection()
    setEditingRootDataset(false)
    setDrawerDirty(false)
  }, [clearSelection])

  // Returns true if it's safe to discard the open item-edit drawer. Prompts the
  // user when the drawer has unsaved changes; clears the dirty flag on confirm.
  const confirmDiscard = useCallback((): boolean => {
    if (!drawerDirty) return true
    const ok = window.confirm('Discard unsaved changes to the current item?')
    if (ok) setDrawerDirty(false)
    return ok
  }, [drawerDirty])

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

  // Scans a chosen folder inside the archive for files that aren't yet linked
  // via isRef_hasPart on the current sheet, then opens the bulk-add popup
  // preloaded with only those undescribed files.
  const handleSearchNewItems = useCallback(
    async (sheetName: string, sheet: SheetData) => {
      setBulkFeedback('')
      let scanned: string[] | null
      try {
        scanned = await window.api.scanFolderForNewFiles(folder)
      } catch (err) {
        setBulkFeedback(`✗ ${(err as Error).message}`)
        return
      }
      if (!scanned || scanned.length === 0) {
        setBulkFeedback('No files found in the selected folder.')
        return
      }

      const hasPartIndex = sheet.headers.findIndex(
        (header) => header === 'isRef_hasPart',
      )
      const describedSet = new Set<string>()
      if (hasPartIndex >= 0) {
        sheet.rows.forEach((row) => {
          parseHasPartPaths(String(row[hasPartIndex] ?? '')).forEach((p) =>
            describedSet.add(p.toLowerCase()),
          )
        })
      }

      const undescribed = scanned.filter(
        (file) => !describedSet.has(file.toLowerCase()),
      )
      if (undescribed.length === 0) {
        setBulkFeedback('✓ No new files — everything is already described.')
        return
      }

      setSearchNewItems({ sheetName, files: undescribed })
    },
    [folder],
  )

  const loadAll = useCallback(async () => {
    const requestId = ++loadRequestRef.current
    // Content collections carry a Files sheet; ensure its header row exists so
    // the tab is viewable. Rows are populated on demand via "Update Files tab".
    await window.api.ensureFilesTab(folder)
    const names = await window.api.getSheetNames(xlsxPath)
    if (requestId !== loadRequestRef.current) return
    setSheetNames(names)
    const firstVisible = names.find(
      (n) =>
        n !== 'RootDataset' &&
        n.toLowerCase() !== '@context' &&
        n.toLowerCase() !== 'files',
    )
    if (firstVisible) setActiveTab(firstVisible)
    const results = await Promise.all(
      names.map(async (name) => {
        const data = await window.api.readSheet(xlsxPath, name)
        return [name, sheetStateFromData(data)] as const
      }),
    )
    if (requestId !== loadRequestRef.current) return
    setSheets(Object.fromEntries(results))
  }, [folder, xlsxPath])

  useEffect(() => {
    loadRequestRef.current += 1
    setSheetNames([])
    setSheets({})
    setActiveTab('RootDataset')
    closeDrawer()
    setPopulateFeedback('')
    setBulkFeedback('')
    setBulkActionFeedback('')
    loadAll()
  }, [closeDrawer, loadAll])

  useEffect(() => {
    clearSelection()
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

  const isTagsVocabFile =
    xlsxPath.includes('/Tags/') || xlsxPath.includes('\\Tags\\')

  const reloadTagsIfVocabFile = useCallback(async () => {
    if (!isTagsVocabFile) return
    try {
      const vocabularies = await loadTagVocabulariesFromFolder()
      dispatch(setTagVocabularies(vocabularies))
    } catch {
      // silent — vocab reload is best-effort
    }
  }, [dispatch, isTagsVocabFile])

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
      if (!isPeopleSheetName(sheetName) && !isOrganisationsSheetName(sheetName))
        return [] as string[]
      const sheet = sheets[sheetName]
      if (!sheet || typeof sheet === 'string') return [] as string[]
      const getId = isOrganisationsSheetName(sheetName)
        ? getRowOrganizationId
        : getRowPersonId
      return rowIndices
        .map((rowIndex) => sheet.rows[rowIndex] ?? [])
        .map((row) => getId(sheet.headers, row))
        .filter((id): id is string => Boolean(id))
    })()

    try {
      const result = await window.api.deleteSheetRows(
        xlsxPath,
        sheetName,
        rowIndices,
      )
      if (idsToRemove.length > 0) {
        const ids = Array.from(new Set(idsToRemove))
        if (isOrganisationsSheetName(sheetName)) {
          dispatch(removeOrganizationsByIds(ids))
        } else {
          dispatch(removePeopleByIds(ids))
        }
      }
      setBulkActionFeedback(
        `✓ Deleted ${result.deletedCount} row${result.deletedCount === 1 ? '' : 's'}`,
      )
      await reloadSheet(sheetName)
      void reloadTagsIfVocabFile()
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

    return (
      <VirtualizedSheetTable
        key={sheetName}
        sheet={sheet}
        sheetName={sheetName}
        folder={folder}
        selectedRows={selectedRows}
        onToggleRow={toggleRowSelection}
        onToggleAllRows={toggleAllRows}
        onEditRow={(rowIndex, row) => {
          if (!confirmDiscard()) return
          setEditingRootDataset(false)
          setAddingItem(false)
          setEditingRow({ rowIndex, row, sheetName })
        }}
      />
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
    <div
      className="archive-page"
      onMouseDown={(e) => {
        const target = e.target
        pointerDownInsideDrawerRef.current =
          target instanceof Element && !!target.closest('.drawer')
      }}
      onClick={() => {
        if (pointerDownInsideDrawerRef.current) {
          pointerDownInsideDrawerRef.current = false
          return
        }
        if (confirmDiscard()) closeDrawer()
      }}
    >
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
                if (!confirmDiscard()) return
                closeDrawer()
                setEditingRootDataset(true)
              }}
              title="Edit metadata"
            >
              ✏️
            </button>
            <button
              className="refresh-btn"
              onClick={(e) => {
                e.stopPropagation()
                void window.api.showInFinder(xlsxPath)
              }}
              title="Show in Finder"
            >
              ↗️
            </button>
            <OverflowMenu
              items={[
                {
                  label: 'View Files tab',
                  onSelect: () => {
                    if (!confirmDiscard()) return
                    closeDrawer()
                    setActiveTab('Files')
                  },
                },
              ]}
            />
          </div>
        </div>

        <div className="tab-bar">
          {sheetNames
            .filter(
              (tab) =>
                tab !== 'RootDataset' &&
                tab.toLowerCase() !== '@context' &&
                tab.toLowerCase() !== 'files',
            )
            .map((tab) => (
              <button
                key={tab}
                className={`tab${activeTab === tab ? ' active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!confirmDiscard()) return
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
            {renderGenericTable(
              sheetNames.includes('Files')
                ? (sheets['Files'] ?? null)
                : sheetNames.length > 0
                  ? 'empty'
                  : null,
              'Files tab is empty.',
            )}
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
                    {sheet && typeof sheet !== 'string' && (
                      <button
                        className="refresh-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!confirmDiscard()) return
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
                          if (!confirmDiscard()) return
                          closeDrawer()
                          setBulkAddingItem(activeTab)
                          setBulkFeedback('')
                        }}
                      >
                        + Bulk add files
                      </button>
                    )}
                    {sheet && typeof sheet !== 'string' && (
                      <button
                        className="refresh-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!confirmDiscard()) return
                          closeDrawer()
                          setBulkAddingList(activeTab)
                          setBulkFeedback('')
                        }}
                      >
                        + Bulk add list
                      </button>
                    )}
                    {sheet && typeof sheet !== 'string' && (
                      <>
                        <button
                          className="refresh-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!confirmDiscard()) return
                            closeDrawer()
                            void handleSearchNewItems(activeTab, sheet)
                          }}
                        >
                          {UiIcons.search} Search for new items
                        </button>
                        <InfoButtonWithTooltip
                          position="left"
                          text="Scan a folder inside the archive for files that aren't yet linked to any item on this sheet, then add the undescribed ones in bulk."
                        />
                      </>
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

      <Drawer open={drawerOpen} width={DRAWER_WIDTH}>
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
                key={`edit:${editingRow.sheetName}:${editingRow.rowIndex}`}
                headers={sheet.headers}
                row={editingRow.row}
                rowIndex={editingRow.rowIndex}
                xlsxPath={xlsxPath}
                sheetName={editingRow.sheetName}
                defaultType={isTagsVocabFile ? 'DefinedTerm' : undefined}
                onSave={(_rowIndex: number, updated: string[]) => {
                  if (isPeopleSheetName(editingRow.sheetName)) {
                    const previousPerson = mapRowToPerson(
                      sheet.headers,
                      editingRow.row,
                    )
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
                  } else if (isOrganisationsSheetName(editingRow.sheetName)) {
                    const previousOrganization = mapRowToOrganization(
                      sheet.headers,
                      editingRow.row,
                    )
                    const nextOrganization = mapRowToOrganization(
                      sheet.headers,
                      updated,
                    )

                    if (
                      previousOrganization &&
                      (!nextOrganization ||
                        nextOrganization['@id'] !== previousOrganization['@id'])
                    ) {
                      dispatch(
                        removeOrganizationsByIds([previousOrganization['@id']]),
                      )
                    }

                    if (nextOrganization) {
                      dispatch(upsertOrganization(nextOrganization))
                    }
                  }
                  void reloadSheet(editingRow.sheetName)
                  void reloadTagsIfVocabFile()
                }}
                onClose={closeDrawer}
                onDirtyChange={setDrawerDirty}
              />
            ) : null
          })()}
        {addingItem &&
          (() => {
            const sheet = sheets[addingItem]
            if (!sheet || typeof sheet === 'string') return null
            const typeIndex = sheet.headers.indexOf('@type')
            const inferredType =
              typeIndex >= 0
                ? sheet.rows
                    .map((r) => String(r[typeIndex] ?? '').trim())
                    .find((v) => v !== '')
                : undefined
            return (
              <EditDrawer
                key={`add:${addingItem}`}
                headers={sheet.headers}
                row={sheet.headers.map(() => '')}
                rowIndex={-1}
                xlsxPath={xlsxPath}
                sheetName={addingItem}
                defaultType={isTagsVocabFile ? 'DefinedTerm' : inferredType}
                onSave={(_rowIndex: number, newRow: string[]) => {
                  if (isPeopleSheetName(addingItem)) {
                    const person = mapRowToPerson(sheet.headers, newRow)
                    if (person) dispatch(upsertPerson(person))
                  } else if (isOrganisationsSheetName(addingItem)) {
                    const organization = mapRowToOrganization(
                      sheet.headers,
                      newRow,
                    )
                    if (organization) dispatch(upsertOrganization(organization))
                  }
                  void reloadSheet(addingItem)
                  void reloadTagsIfVocabFile()
                }}
                onClose={closeDrawer}
                onDirtyChange={setDrawerDirty}
                isNew
              />
            )
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
              defaultType={isTagsVocabFile ? 'DefinedTerm' : undefined}
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
                } else if (isOrganisationsSheetName(sheetName)) {
                  const idsToRemove = new Set<string>()

                  bulkEditingRows.rows.forEach((oldRow, index) => {
                    const previousOrganization = mapRowToOrganization(
                      bulkEditingSheet.headers,
                      oldRow,
                    )
                    const nextOrganization = mapRowToOrganization(
                      bulkEditingSheet.headers,
                      updatedRows[index] ?? [],
                    )

                    if (
                      previousOrganization &&
                      (!nextOrganization ||
                        nextOrganization['@id'] !== previousOrganization['@id'])
                    ) {
                      idsToRemove.add(previousOrganization['@id'])
                    }

                    if (nextOrganization) {
                      dispatch(upsertOrganization(nextOrganization))
                    }
                  })

                  if (idsToRemove.size > 0) {
                    dispatch(removeOrganizationsByIds(Array.from(idsToRemove)))
                  }
                }

                clearSelection()
                setBulkEditingRows(null)
                await reloadSheet(sheetName)
                void reloadTagsIfVocabFile()
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
                void reloadTagsIfVocabFile()
                setBulkAddingItem(false)
              }}
              onClose={() => {
                setBulkAddingItem(false)
              }}
            />
          )
        })()}

      {searchNewItems &&
        (() => {
          const sheet = sheets[searchNewItems.sheetName]
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
              sheetName={searchNewItems.sheetName}
              headers={sheet.headers}
              existingIds={existingIds}
              presetFiles={searchNewItems.files}
              onComplete={(addedRows, skippedFiles, depictionWarningFiles) => {
                if (isPeopleSheetName(searchNewItems.sheetName)) {
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
                void reloadSheet(searchNewItems.sheetName)
                void reloadTagsIfVocabFile()
                setSearchNewItems(false)
              }}
              onClose={() => {
                setSearchNewItems(false)
              }}
            />
          )
        })()}

      {bulkAddingList &&
        (() => {
          const sheet = sheets[bulkAddingList]
          if (!sheet || typeof sheet === 'string') return null
          const typeIndex = sheet.headers.indexOf('@type')
          const inferredType =
            typeIndex >= 0
              ? sheet.rows
                  .map((r) => String(r[typeIndex] ?? '').trim())
                  .find((v) => v !== '')
              : undefined
          return (
            <BulkAddListPopup
              isOpen
              xlsxPath={xlsxPath}
              sheetName={bulkAddingList}
              headers={sheet.headers}
              defaultType={isTagsVocabFile ? 'DefinedTerm' : inferredType}
              onComplete={(addedRows) => {
                const addedCount = addedRows.length
                setBulkFeedback(
                  `✓ Added ${addedCount} item${addedCount === 1 ? '' : 's'}`,
                )
                void reloadSheet(bulkAddingList)
                void reloadTagsIfVocabFile()
                setBulkAddingList(false)
              }}
              onClose={() => {
                setBulkAddingList(false)
              }}
            />
          )
        })()}
    </div>
  )
}
