import React from 'react'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

// Generic, dependency-free tooltip. Wraps any trigger element and reveals
// `content` on hover or keyboard focus (via CSS :hover / :focus-within).
// Reusable anywhere — not tied to the edit form. `position` controls which side
// the bubble opens toward (default 'top').
export default function Tooltip({
  content,
  children,
  className,
  position = 'top',
}: TooltipProps): React.ReactElement {
  const wrapperClassName = className
    ? `tooltip-wrapper ${className}`
    : 'tooltip-wrapper'
  return (
    <span className={wrapperClassName}>
      {children}
      <span
        className={`tooltip-bubble tooltip-bubble--${position}`}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  )
}
