/** Parse a bulk poll paste: "Poll N (Day N)" blocks, a question, and option lines. */

const HEADER_PATTERNS = [
  /^Poll\s+(\d+)\s*\(\s*Day\s+(\d+)\s*\)\s*$/i,
  /^Poll\s+(\d+)\s*[-–:]\s*Day\s+(\d+)\s*$/i,
  /^Poll\s+(\d+)\s*$/i,
  /^Day\s+(\d+)\s*$/i,
  /^#+\s*Poll\s+(\d+)\s*\(\s*Day\s+(\d+)\s*\)\s*$/i,
]

// A line is an "option" when it starts with a bullet (-, *, •) or a number (1. / 1)).
const OPTION_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/

function matchPollHeader(line) {
  // NFKC folds "fancy" Unicode (math bold/italic/sans, e.g. 𝗣𝗼𝗹𝗹 𝟭) back to plain
  // ASCII so headers pasted from styled text still match.
  const trimmed = line.normalize('NFKC').trim()
  for (const re of HEADER_PATTERNS) {
    const m = trimmed.match(re)
    if (m) {
      const pollNum = Number(m[1])
      const dayNum = m[2] != null ? Number(m[2]) : pollNum
      return { pollNum, dayNum, title: trimmed }
    }
  }
  return null
}

function stripOptionMarker(line) {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim()
}

function stripQuestionPrefix(line) {
  return line.replace(/^(?:Q|Question)\s*[:.]\s*/i, '').trim()
}

/**
 * Returns an array of { id, pollNum, dayNum, title, question, options }.
 * Blocks are separated by blank lines. The first non-empty line of a block is the
 * header (if it matches) or the question; remaining lines are options. Option
 * markers are optional — if none are found, every line after the question counts.
 */
export function parseBulkPolls(raw) {
  const blocks = raw.replace(/\r\n/g, '\n').split(/\n\s*\n/)
  const polls = []

  blocks.forEach((block, blockIdx) => {
    const lines = block
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.trim())
    if (!lines.length) return

    const header = matchPollHeader(lines[0])
    const content = header ? lines.slice(1) : lines
    if (!content.length) return

    const [first, ...rest] = content
    const question = stripQuestionPrefix(first)

    const marked = rest.filter((l) => OPTION_RE.test(l)).map(stripOptionMarker)
    const options = (marked.length ? marked : rest.map(stripOptionMarker)).filter(Boolean)

    const pollNum = header?.pollNum ?? polls.length + 1
    const dayNum = header?.dayNum ?? polls.length + 1

    polls.push({
      id: `poll-${pollNum}-${blockIdx}`,
      pollNum,
      dayNum,
      title: header?.title || `Poll ${pollNum}`,
      question,
      options,
    })
  })

  return polls
}
