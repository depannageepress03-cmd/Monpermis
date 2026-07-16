const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }
const CURRENT = LOG_LEVELS[process.env.LOG_LEVEL] ?? 1

function serializeMeta(meta) {
  if (meta instanceof Error) return JSON.stringify({ message: meta.message, stack: meta.stack?.split('\n')[0] })
  if (meta !== undefined) return JSON.stringify(meta)
  return null
}

function fmt(level, msg, meta) {
  const ts = new Date().toISOString()
  const base = `[${ts}] [${level.toUpperCase()}] ${msg}`
  const serialized = serializeMeta(meta)
  return serialized ? `${base} ${serialized}` : base
}

export const logger = {
  debug(msg, meta) { if (CURRENT <= 0) console.debug(fmt('debug', msg, meta)) },
  info(msg, meta) { if (CURRENT <= 1) console.log(fmt('info', msg, meta)) },
  warn(msg, meta) { if (CURRENT <= 2) console.warn(fmt('warn', msg, meta)) },
  error(msg, meta) { if (CURRENT <= 3) console.error(fmt('error', msg, meta)) },
}
