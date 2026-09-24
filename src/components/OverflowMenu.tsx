import React, { useEffect, useRef, useState } from 'react'

interface OverflowMenuItem {
  label: string
  onSelect: () => void
}

interface Props {
  items: OverflowMenuItem[]
  title?: string
}

// Lightweight dropdown for low-prominence actions. Closes on outside click or
// Escape; each item runs its handler and dismisses the menu.
export default function OverflowMenu({ items, title = 'More actions' }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="overflow-menu" ref={containerRef}>
      <button
        type="button"
        className="overflow-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        ⋯
      </button>
      {open && (
        <div className="overflow-menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="overflow-menu-item"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
