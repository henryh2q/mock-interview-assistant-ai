type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

const isDev = process.env.NODE_ENV === 'development'

function formatEntry(entry: LogEntry): string {
  if (isDev) {
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
    const err = entry.error ? ` [ERROR: ${entry.error.message}]` : ''
    return `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.message}${ctx}${err}`
  }
  return JSON.stringify(entry)
}

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error & { code?: string },
) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
    ...(error && {
      error: {
        message: error.message,
        stack: isDev ? error.stack : undefined,
        code: error.code,
      },
    }),
  }

  const formatted = formatEntry(entry)

  switch (level) {
    case 'debug':
      if (isDev) console.debug(formatted)
      break
    case 'info':
      console.info(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log('debug', message, context),

  info: (message: string, context?: Record<string, unknown>) =>
    log('info', message, context),

  warn: (message: string, context?: Record<string, unknown>) =>
    log('warn', message, context),

  error: (
    message: string,
    error?: Error & { code?: string },
    context?: Record<string, unknown>,
  ) => log('error', message, context, error),
}
