/**
 * Application error hierarchy.
 *
 * Every error that crosses the HTTP boundary is an `AppError`. The `message`
 * is internal (logged); `publicMessage` is the only text a client ever sees.
 * Anything that is not an `AppError` is treated as a bug and collapsed into
 * `InternalError` so implementation details never leak.
 */
import { ZodError } from "zod";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "LLM_UNAVAILABLE"
  | "LLM_BAD_RESPONSE"
  | "CONFIG_ERROR"
  | "INTERNAL_ERROR";

export interface AppErrorOptions {
  cause?: unknown;
  /** Safe-to-display text. Defaults to a generic message per error class. */
  publicMessage?: string;
  /** Hint for clients/UI: is it reasonable to try the same request again? */
  retryable?: boolean;
  /** Extra, non-sensitive context for logs (never user message content). */
  meta?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly publicMessage: string;
  readonly retryable: boolean;
  readonly meta?: Record<string, unknown>;

  constructor(code: ErrorCode, status: number, message: string, options: AppErrorOptions & { publicMessage: string }) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.publicMessage = options.publicMessage;
    this.retryable = options.retryable ?? false;
    this.meta = options.meta;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("VALIDATION_ERROR", 400, message, {
      publicMessage: "Your message could not be processed. Please check it and try again.",
      ...options,
    });
  }
}

export class InvalidJsonError extends AppError {
  constructor(options: AppErrorOptions = {}) {
    super("INVALID_JSON", 400, "Request body is not valid JSON", {
      publicMessage: "The request was malformed.",
      ...options,
    });
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(limitBytes: number) {
    super("PAYLOAD_TOO_LARGE", 413, `Request body exceeds ${limitBytes} bytes`, {
      publicMessage: "Your message is too long. Please shorten it.",
      meta: { limitBytes },
    });
  }
}

export class RateLimitError extends AppError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("RATE_LIMITED", 429, "Rate limit exceeded", {
      publicMessage: "You're sending messages quickly. Please wait a moment and try again.",
      retryable: true,
      meta: { retryAfterSeconds },
    });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class LlmUnavailableError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("LLM_UNAVAILABLE", 503, message, {
      publicMessage: "The coach is temporarily unavailable. Please try again in a moment.",
      retryable: true,
      ...options,
    });
  }
}

export class LlmResponseError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("LLM_BAD_RESPONSE", 502, message, {
      publicMessage: "The coach could not prepare a reply. Please try again.",
      retryable: true,
      ...options,
    });
  }
}

export class ConfigError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super("CONFIG_ERROR", 500, message, {
      publicMessage: "The service is not configured correctly.",
      ...options,
    });
  }
}

export class InternalError extends AppError {
  constructor(cause?: unknown) {
    super("INTERNAL_ERROR", 500, "Unexpected internal error", {
      publicMessage: "Something went wrong on our side. Please try again.",
      retryable: true,
      cause,
    });
  }
}

/** Normalise anything thrown into an `AppError`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) {
    return new ValidationError("Schema validation failed", {
      cause: error,
      meta: { issues: error.issues.map((i) => ({ path: i.path.join("."), code: i.code })) },
    });
  }
  return new InternalError(error);
}
