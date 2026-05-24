/** Terminal logger with timestamps, colors, and compact metadata */

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
}

const useColor = process.stdout.isTTY && process.env.NO_COLOR !== '1'

function paint(code, text) {
  return useColor ? `${code}${text}${C.reset}` : text
}

function ts() {
  return paint(C.dim, new Date().toISOString().replace('T', ' ').slice(0, 19))
}

function formatMeta(meta) {
  if (meta == null) return ''
  if (typeof meta === 'string') return ` ${paint(C.dim, meta)}`
  const parts = Object.entries(meta)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${paint(C.dim, k)}=${paint(C.cyan, String(v))}`)
  return parts.length ? ` ${parts.join(' ')}` : ''
}

function write(level, color, icon, message, meta) {
  const tag = paint(color, `${icon} ${level}`)
  const line = `${ts()} ${tag} ${message}${formatMeta(meta)}`
  if (level === 'ERROR') console.error(line)
  else console.log(line)
}

export const logger = {
  info(message, meta) {
    write('INFO', C.blue, '●', message, meta)
  },
  success(message, meta) {
    write('OK', C.green, '✓', message, meta)
  },
  warn(message, meta) {
    write('WARN', C.yellow, '⚠', message, meta)
  },
  error(message, meta) {
    write('ERROR', C.red, '✕', message, meta)
  },
  debug(message, meta) {
    if (process.env.LOG_LEVEL === 'debug') write('DEBUG', C.magenta, '…', message, meta)
  },
  http(method, path, status, ms) {
    const code = Number(status)
    const color = code >= 500 ? C.red : code >= 400 ? C.yellow : code >= 300 ? C.cyan : C.green
    const icon = code >= 500 ? '✕' : code >= 400 ? '⚠' : '→'
    write('HTTP', color, icon, `${method} ${path}`, { status: code, ms: `${ms}ms` })
  },
  banner(title, lines = []) {
    const width = Math.max(title.length + 4, ...lines.map((l) => l.length), 42)
    const bar = '─'.repeat(width)
    console.log('')
    console.log(paint(C.cyan, `┌─ ${bar} ┐`))
    console.log(paint(C.cyan, `│  ${paint(C.bold + C.white, title.padEnd(width - 2))}  │`))
    for (const line of lines) {
      console.log(paint(C.cyan, `│  ${paint(C.dim, line.padEnd(width - 2))}  │`))
    }
    console.log(paint(C.cyan, `└─ ${bar} ┘`))
    console.log('')
  },
}

export function requestLogger() {
  return (req, res, next) => {
    if (req.path.endsWith('.gif') || req.path === '/') return next()
    const start = Date.now()
    res.on('finish', () => {
      logger.http(req.method, req.originalUrl || req.path, res.statusCode, Date.now() - start)
    })
    next()
  }
}
