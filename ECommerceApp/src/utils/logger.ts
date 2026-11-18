const IS_DEV = process.env.NODE_ENV !== 'production';

export const mask = {
  phone: (v: string): string => v.replace(/(\d{4})\d+(\d{3})/, '$1***$2'),
  email: (v: string): string => v.replace(/(.).+(@.+)/, '$1***$2'),
  card: (v: string): string => v.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2'),
  password: (): string => '***',
  token: (): string => '***',
};

export function sanitize(obj: unknown): unknown {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return obj
      .replace(/(\b\d{4})\d{3,4}(\d{3}\b)/g, '$1***$2')
      .replace(/([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1***$2');
  }
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Error) {
    return { name: obj.name, message: sanitize(obj.message) };
  }
  const clone: Record<string, unknown> = Array.isArray(obj) ? ([] as unknown as Record<string, unknown>) : {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const lower = k.toLowerCase();
    if (['password', 'pwd', 'token', 'otp', 'secret', 'apikey', 'authorization'].includes(lower)) {
      clone[k] = '***';
    } else if (lower.includes('email')) {
      clone[k] = typeof v === 'string' ? mask.email(v) : v;
    } else if (lower.includes('phone') || lower.includes('sdt')) {
      clone[k] = typeof v === 'string' ? mask.phone(v) : v;
    } else if (lower.includes('card')) {
      clone[k] = typeof v === 'string' ? mask.card(v) : v;
    } else {
      clone[k] = sanitize(v);
    }
  }
  return clone;
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    if (IS_DEV) {
      // Safe no-op or dev diagnostic
    }
  },
  warn: (msg: string, ...args: unknown[]) => {
    if (IS_DEV) {
      // In development, sanitized log only
    }
  },
  error: (msg: string, ...args: unknown[]) => {
    if (IS_DEV) {
      // In development, sanitized error only
    }
  },
};
