import React from 'react'
import Tooltip from './Tooltip'
import { UiIcons } from '../config/icons'

interface InfoButtonWithTooltipProps {
  text?: string
  ariaLabel?: string
}

// Small info icon that reveals `text` in a tooltip on hover/focus.
// Renders nothing when no text is provided. Standalone and reusable — drop it
// next to any label or heading. The button suppresses default/propagated clicks
// so it never submits a form or toggles a surrounding accordion/drawer.
export default function InfoButtonWithTooltip({
  text,
  ariaLabel,
}: InfoButtonWithTooltipProps): React.ReactElement | null {
  if (!text) return null
  return (
    <Tooltip content={text}>
      <button
        type="button"
        className="info-button"
        aria-label={ariaLabel ?? text}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
      >
        <span aria-hidden="true">{UiIcons.info}</span>
      </button>
    </Tooltip>
  )
}
