export default function PageShell({ children, className = '' }) {
  return (
    <div
      className={`page-shell flex h-full min-h-0 w-full flex-col overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

export function PageBody({ children, className = '' }) {
  return (
    <div className={`page-body min-h-0 flex-1 overflow-hidden ${className}`}>{children}</div>
  )
}

export function PageScroll({ children, className = '' }) {
  return (
    <div className={`scrollbar-none min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${className}`}>
      {children}
    </div>
  )
}
