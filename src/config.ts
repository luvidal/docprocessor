export interface DocProcessorLogger {
  error(error: unknown, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
}

let logger: DocProcessorLogger = {
  error: (err, ctx) => console.error('[docprocessor]', err, ctx),
  warn: (msg, ctx) => console.warn('[docprocessor]', msg, ctx),
}

export function configure(options: { logger?: DocProcessorLogger }) {
  if (options.logger) logger = options.logger
}

export function getLogger(): DocProcessorLogger {
  return logger
}
