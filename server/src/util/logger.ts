export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEY_RE = /password|token|secret|authorization|hash|cookie/i;

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(key)) {
        out[key] = '***';
      } else {
        out[key] = sanitize(item);
      }
    }
    return out;
  }
  return value;
}

function write(level: LogLevel, scope: string, message: string, data?: unknown) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...(data === undefined ? {} : { data: sanitize(data) }),
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(scope: string, message: string, data?: unknown) {
    write('debug', scope, message, data);
  },
  info(scope: string, message: string, data?: unknown) {
    write('info', scope, message, data);
  },
  warn(scope: string, message: string, data?: unknown) {
    write('warn', scope, message, data);
  },
  error(scope: string, message: string, data?: unknown) {
    write('error', scope, message, data);
  },
};