export default function ViewToggle({ view, onChange }) {
  return (
    <div className="view-toggle" role="group" aria-label="Layout view">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`view-toggle-btn ${view === 'grid' ? 'view-toggle-btn-active' : ''}`}
        aria-pressed={view === 'grid'}
        aria-label="Grid view"
      >
        <GridIcon />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`view-toggle-btn ${view === 'list' ? 'view-toggle-btn-active' : ''}`}
        aria-pressed={view === 'list'}
        aria-label="List view"
      >
        <ListIcon />
      </button>
    </div>
  )
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
