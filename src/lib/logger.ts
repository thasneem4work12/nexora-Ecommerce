import crypto from "crypto";

export type LogLevel = "debug" | "info" | "warn" | "error" | "audit";

const SENSITIVE_KEYS = new Set([
  "password",
  "confirmPassword",
  "token",
  "sessionToken",
  "secret",
  "merchantSecret",
  "authorization",
  "cookie",
  "creditCard",
  "cvv",
  "cardLast4",
  "apiKey",
  "idToken",
  "accessToken",
  "refreshToken",
]);

/**
 * Recursively redacts sensitive keys from objects or arrays to prevent
 * accidental data leakage in application logs.
 */
export function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Redact bearer tokens or cookie strings if passed directly
    if (/bearer\s+[a-zA-Z0-9_\-\.]+/i.test(obj)) {
      return "[REDACTED_BEARER_TOKEN]";
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item));
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase()) || SENSITIVE_KEYS.has(key)) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = redactSensitiveData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return obj;
}

export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId?: string;
  message: string;
  category?: string;
  businessId?: string;
  userId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerOptions {
  correlationId?: string;
  category?: string;
  businessId?: string;
  userId?: string;
  context?: Record<string, unknown>;
  error?: unknown;
  [key: string]: unknown;
}

class StructuredLogger {
  private formatLog(
    level: LogLevel,
    message: string,
    options?: LoggerOptions
  ): LogEntry {
    const { correlationId, category, businessId, userId, context, error, ...extra } = options || {};

    const mergedContext = {
      ...(context || {}),
      ...extra,
    };

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId,
      message,
      category,
      businessId,
      userId,
      context: Object.keys(mergedContext).length > 0
        ? (redactSensitiveData(mergedContext) as Record<string, unknown>)
        : undefined,
    };

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          // Only show stack trace in non-production environments to prevent leak
          stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
        };
      } else {
        entry.error = {
          name: "UnknownError",
          message: String(error),
        };
      }
    }

    return entry;
  }

  debug(message: string, options?: LoggerOptions) {
    if (process.env.NODE_ENV !== "production") {
      const entry = this.formatLog("debug", message, options);
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, options?: LoggerOptions) {
    const entry = this.formatLog("info", message, options);
    console.log(JSON.stringify(entry));
  }

  warn(message: string, options?: LoggerOptions) {
    const entry = this.formatLog("warn", message, options);
    console.warn(JSON.stringify(entry));
  }

  error(message: string, options?: LoggerOptions) {
    const entry = this.formatLog("error", message, options);
    console.error(JSON.stringify(entry));
  }

  audit(message: string, options?: LoggerOptions) {
    const entry = this.formatLog("audit", message, options);
    console.log(JSON.stringify(entry));
  }
}

export const logger = new StructuredLogger();
