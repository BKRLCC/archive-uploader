import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'

const DEFAULT_MIN_WIDTH_PX = 60
const MAX_WIDTH_PX = 1200
const KEYBOARD_STEP_PX = 10

export interface ResizableColumn {
  id: string
  /** Whether the column shows a drag handle. */
  resizable?: boolean
  minWidth?: number
}

type Widths = Record<string, number>

interface DragState {
  id: string
  startX: number
  startWidth: number
  minWidth: number
  base: Widths
}

// Session-only column resizing for a fixed-layout table. Until the first drag,
// no widths are set and the CSS defaults apply. The first drag freezes every
// column at its measured width so the explicit table width (their sum) matches
// what was on screen; otherwise a fixed-layout table would stretch the other
// columns whenever one is narrowed.
export function useColumnResize(columns: ResizableColumn[]) {
  const [widths, setWidths] = useState<Widths | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)
  const headerRefs = useRef(new Map<string, HTMLTableCellElement>())
  const dragRef = useRef<DragState | null>(null)

  // A changed column set would leave a partially specified colgroup.
  const columnKey = columns.map((c) => c.id).join('\u0000')
  useEffect(() => {
    setWidths(null)
  }, [columnKey])

  const registerHeader = useCallback(
    (id: string) => (el: HTMLTableCellElement | null) => {
      if (el) headerRefs.current.set(id, el)
      else headerRefs.current.delete(id)
    },
    [],
  )

  const measure = useCallback((): Widths => {
    const measured: Widths = {}
    for (const column of columns) {
      const el = headerRefs.current.get(column.id)
      measured[column.id] = Math.round(el?.getBoundingClientRect().width ?? 0)
    }
    return measured
  }, [columns])

  const clampWidth = (width: number, minWidth: number) =>
    Math.min(MAX_WIDTH_PX, Math.max(minWidth, Math.round(width)))

  const getHandleProps = (column: ResizableColumn) => {
    const minWidth = column.minWidth ?? DEFAULT_MIN_WIDTH_PX
    return {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        const base = widths ?? measure()
        setWidths(base)
        dragRef.current = {
          id: column.id,
          startX: event.clientX,
          startWidth: base[column.id] ?? minWidth,
          minWidth,
          base,
        }
        setActiveColumnId(column.id)
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const drag = dragRef.current
        if (!drag) return
        const next = clampWidth(
          drag.startWidth + event.clientX - drag.startX,
          drag.minWidth,
        )
        setWidths((prev) => ({ ...(prev ?? drag.base), [drag.id]: next }))
      },
      onPointerUp: () => {
        dragRef.current = null
        setActiveColumnId(null)
      },
      onPointerCancel: () => {
        dragRef.current = null
        setActiveColumnId(null)
      },
      // The click that ends a drag would otherwise reach the page root, which
      // treats outside clicks as "close the drawer".
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation()
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        const direction =
          event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
        if (!direction) return
        event.preventDefault()
        const base = widths ?? measure()
        const next = clampWidth(
          (base[column.id] ?? minWidth) + direction * KEYBOARD_STEP_PX,
          minWidth,
        )
        setWidths({ ...base, [column.id]: next })
      },
    }
  }

  const tableWidth = widths
    ? columns.reduce((sum, c) => sum + (widths[c.id] ?? 0), 0)
    : undefined

  return { widths, tableWidth, activeColumnId, registerHeader, getHandleProps }
}
