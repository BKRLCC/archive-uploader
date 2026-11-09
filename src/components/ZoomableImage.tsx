import React, { useCallback, useEffect, useRef, useState } from 'react'
import './ZoomableImage.css'

interface ZoomableImageProps {
  src: string
  alt?: string
}

interface View {
  scale: number
  x: number
  y: number
}

const MIN_SCALE = 1
const MAX_SCALE = 8
const BUTTON_STEP = 1.5
const DOUBLE_CLICK_SCALE = 3
const INITIAL_VIEW: View = { scale: 1, x: 0, y: 0 }

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

// Keeps the scaled image covering the viewport so it can't be dragged out of view.
function constrain(view: View, width: number, height: number): View {
  const scale = clamp(view.scale, MIN_SCALE, MAX_SCALE)
  return {
    scale,
    x: clamp(view.x, width - width * scale, 0),
    y: clamp(view.y, height - height * scale, 0),
  }
}

// Returns the view after zooming to `nextScale`, keeping the point (px, py)
// of the viewport fixed on screen.
function zoomAt(
  view: View,
  nextScale: number,
  px: number,
  py: number,
  width: number,
  height: number,
): View {
  const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE)
  const ratio = scale / view.scale
  return constrain(
    {
      scale,
      x: px - (px - view.x) * ratio,
      y: py - (py - view.y) * ratio,
    },
    width,
    height,
  )
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ src, alt }) => {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const [view, setView] = useState<View>(INITIAL_VIEW)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    setView(INITIAL_VIEW)
  }, [src])

  const getSize = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect()
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 }
  }, [])

  const zoomBy = useCallback(
    (factor: number, px?: number, py?: number) => {
      const { width, height } = getSize()
      setView((v) =>
        zoomAt(
          v,
          v.scale * factor,
          px ?? width / 2,
          py ?? height / 2,
          width,
          height,
        ),
      )
    },
    [getSize],
  )

  // React's onWheel is passive, so preventDefault needs a native listener.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const sensitivity = event.ctrlKey ? 0.01 : 0.0015
      zoomBy(
        Math.exp(-event.deltaY * sensitivity),
        event.clientX - rect.left,
        event.clientY - rect.top,
      )
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '+' || event.key === '=') zoomBy(BUTTON_STEP)
      else if (event.key === '-') zoomBy(1 / BUTTON_STEP)
      else if (event.key === '0') setView(INITIAL_VIEW)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [zoomBy])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (view.scale <= MIN_SCALE) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY }
    setIsDragging(true)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const last = dragRef.current
    if (!last) return
    const dx = event.clientX - last.x
    const dy = event.clientY - last.y
    dragRef.current = { x: event.clientX, y: event.clientY }
    const { width, height } = getSize()
    setView((v) => constrain({ ...v, x: v.x + dx, y: v.y + dy }, width, height))
  }

  const endDrag = () => {
    dragRef.current = null
    setIsDragging(false)
  }

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (view.scale > MIN_SCALE) {
      setView(INITIAL_VIEW)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    zoomBy(
      DOUBLE_CLICK_SCALE,
      event.clientX - rect.left,
      event.clientY - rect.top,
    )
  }

  const isZoomed = view.scale > MIN_SCALE
  const viewportClass = [
    'zoomable-viewport',
    isZoomed ? (isDragging ? 'is-grabbing' : 'is-zoomed') : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={viewportRef}
      className={viewportClass}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={handleDoubleClick}
    >
      <img
        src={src}
        alt={alt || 'Image preview'}
        className="zoomable-image"
        draggable={false}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      />
      <div
        className="zoom-toolbar"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          title="Zoom out (-)"
          aria-label="Zoom out"
          disabled={view.scale <= MIN_SCALE}
          onClick={() => zoomBy(1 / BUTTON_STEP)}
        >
          &minus;
        </button>
        <span className="zoom-level">{Math.round(view.scale * 100)}%</span>
        <button
          type="button"
          title="Zoom in (+)"
          aria-label="Zoom in"
          disabled={view.scale >= MAX_SCALE}
          onClick={() => zoomBy(BUTTON_STEP)}
        >
          +
        </button>
        <button
          type="button"
          title="Reset zoom (0)"
          disabled={!isZoomed}
          onClick={() => setView(INITIAL_VIEW)}
        >
          Reset
        </button>
        {!isZoomed && (
          <span className="zoom-hint">Scroll to zoom, drag to pan</span>
        )}
      </div>
    </div>
  )
}

export default ZoomableImage
