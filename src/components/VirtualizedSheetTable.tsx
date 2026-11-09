import React, { useEffect, useRef, useState } from 'react'
import type { SheetData } from '../api'
import ClickableImagePreview from './ClickableImagePreview'
import ReferenceCell from './ReferenceCell'
import { getDepictionThumbnailRelativePath } from '../config/depiction-config'
import { getFieldDisplayLabel } from '../config/field-labels'
import {
  getControlledVocabularyForField,
  isMultiSelectField,
} from '../config/field-vocabularies'
import {
  getTableColumnLayout,
  isHiddenTableColumn,
} from '../config/table-column-layout'
import { resolveEditableEntityType } from '../types/types'
import { getItemTypeForSheetName } from '../helpers/item-types'
import { useReferenceLookups } from '../helpers/use-reference-lookups'
import './VirtualizedSheetTable.css'

const VIRTUAL_ROW_HEIGHT_PX = 72
const VIRTUAL_OVERSCAN_ROWS = 10

interface VirtualizedSheetTableProps {
  sheet: SheetData
  sheetName: string
  /** Absolute archive folder path, used to resolve localfile:// image URLs. */
  folder: string
  /** Selected rows, as original sheet row indices. */
  selectedRows: ReadonlySet<number>
  onToggleRow: (rowIndex: number, checked: boolean) => void
  onToggleAllRows: (rowIndices: number[], checked: boolean) => void
  onEditRow: (rowIndex: number, row: string[]) => void
}

export default function VirtualizedSheetTable({
  sheet,
  sheetName,
  folder,
  selectedRows,
  onToggleRow,
  onToggleAllRows,
  onEditRow,
}: VirtualizedSheetTableProps) {
  const { lookups: referenceLookups, folders: referenceFolders } =
    useReferenceLookups()
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(420)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setViewportHeight(el.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const resolvedSheetType = resolveEditableEntityType(
    getItemTypeForSheetName(sheetName),
  )

  const depictionIndex = sheet.headers.indexOf('isRef_image')
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
  const selectedCount = Array.from(selectedRows).filter((rowIndex) =>
    visibleRowIndexSet.has(rowIndex),
  ).length
  const allRowsSelected =
    visibleRows.length > 0 && selectedCount === visibleRows.length

  const visibleIndices = sheet.headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !isHiddenTableColumn(h) && h !== 'isRef_image')
    .map(({ i }) => i)
  const depictionLayout = hasDepiction
    ? getTableColumnLayout('isRef_image')
    : null

  const visibleCount = Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT_PX)
  const windowStart = Math.max(
    0,
    Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT_PX) - VIRTUAL_OVERSCAN_ROWS,
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
      ref={scrollRef}
      style={
        {
          '--virtual-row-height': `${VIRTUAL_ROW_HEIGHT_PX}px`,
        } as React.CSSProperties
      }
      onScroll={(event) => {
        setScrollTop(event.currentTarget.scrollTop)
        setViewportHeight(event.currentTarget.clientHeight)
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
                  onToggleAllRows(visibleRowIndices, e.target.checked)
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
                {getFieldDisplayLabel('isRef_image', resolvedSheetType)}
              </th>
            )}
            {visibleIndices.map((i) => {
              const headerName = sheet.headers[i] ?? ''
              const layout = getTableColumnLayout(headerName)
              const className = layout.widthClassName ?? 'col-width-default'
              return (
                <th key={i} className={className}>
                  {getFieldDisplayLabel(headerName, resolvedSheetType)}
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
                    // The page root closes the drawer on any outside click.
                    e.stopPropagation()
                    onEditRow(rowIndex, row)
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
                    onToggleRow(rowIndex, e.target.checked)
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
                const rawValue = row[i] ?? ''
                const vocab = getControlledVocabularyForField(headerName)
                const refMap = vocab ? referenceLookups[vocab] : undefined
                const refFolder = vocab ? referenceFolders[vocab] : undefined
                if (refMap && refFolder && rawValue.trim()) {
                  const ids = isMultiSelectField(headerName)
                    ? rawValue.split(/,\s*/).filter(Boolean)
                    : [rawValue.trim()]
                  return (
                    <td key={i} className={className}>
                      <ReferenceCell
                        ids={ids}
                        entities={refMap}
                        folder={refFolder}
                      />
                    </td>
                  )
                }
                return (
                  <td key={i} className={className}>
                    <span className="table-cell-text">{rawValue}</span>
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
