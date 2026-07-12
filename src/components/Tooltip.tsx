import React from 'react'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  className?: string
}

// Generic, dependency-free tooltip. Wraps any trigger element and reveals
// `content` on hover or keyboard focus (via CSS :hover / :focus-within).
// Reusable anywhere — not tied to the edit form.
export default function Tooltip({
  content,
  children,
  className,
}: TooltipProps): React.ReactElement {
  const wrapperClassName = className
    ? `tooltip-wrapper ${className}`
    : 'tooltip-wrapper'
  return (
    <span className={wrapperClassName}>
      {children}
      <span className="tooltip-bubble" role="tooltip">
        {content}
      </span>
    </span>
  )
}
