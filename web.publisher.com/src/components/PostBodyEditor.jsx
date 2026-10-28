import { useRef } from 'react'
import { splitTextForDashHighlight, containsForbiddenDash } from '../lib/contentSanitize'

export default function PostBodyEditor({
  id,
  value,
  onChange,
  rows = 5,
  placeholder,
  className = '',
}) {
  const backdropRef = useRef(null)

  const syncScroll = (e) => {
    if (backdropRef.current) backdropRef.current.scrollTop = e.target.scrollTop
  }

  const parts = splitTextForDashHighlight(value)
  const hasDash = containsForbiddenDash(value)

  return (
    <div
      className={`post-body-editor ${hasDash ? 'post-body-editor--invalid' : ''} ${className}`}
    >
      <div
        ref={backdropRef}
        className="post-body-editor__backdrop"
        aria-hidden
      >
        {parts.map((part, i) =>
          part.dash ? (
            <mark key={i} className="forbidden-dash-mark" title="Replace with a comma or period">
              {part.text}
            </mark>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
        {value.endsWith('\n') ? '\n' : null}
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        rows={rows}
        placeholder={placeholder}
        spellCheck
        className="post-body-editor__input"
      />
    </div>
  )
}
