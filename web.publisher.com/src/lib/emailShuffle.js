/**
 * Per-recipient email variation (deterministic from email address).
 * Keep in sync with api.publisher.com/src/lib/emailShuffle.js
 */

const SPINTAX_RE = /\{([^{}]*\|[^{}]*)\}/g

export function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

export function expandSpintax(text, seed) {
  if (!text) return text
  const rng = seededRandom(seed)
  let out = text
  let guard = 0
  while (guard++ < 24) {
    SPINTAX_RE.lastIndex = 0
    if (!SPINTAX_RE.test(out)) break
    SPINTAX_RE.lastIndex = 0
    out = out.replace(SPINTAX_RE, (_, inner) => {
      const options = inner.split('|').map((s) => s.trim()).filter(Boolean)
      if (!options.length) return ''
      return options[Math.floor(rng() * options.length)]
    })
  }
  return out
}

export function shuffleParagraphs(text, seed, { keepFirst = true } = {}) {
  if (!text) return text
  const parts = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return text

  const rng = seededRandom(seed + 7919)
  const pool = keepFirst ? parts.slice(1) : [...parts]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const merged = keepFirst ? [parts[0], ...pool] : pool
  return merged.join('\n\n')
}

export function applyEmailContentShuffle(text, seed, options = {}) {
  if (!text) return text
  const { shuffleParagraphs: doShuffle = true, keepFirstParagraph = true } = options
  let out = expandSpintax(text, seed)
  if (doShuffle) {
    out = shuffleParagraphs(out, seed + 17, { keepFirst: keepFirstParagraph })
  }
  return out
}
