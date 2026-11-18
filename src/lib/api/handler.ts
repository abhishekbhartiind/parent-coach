/**
 * Route-handler wrapper: the single place where requests get an id, timing,
 * structured logging and consistent error responses. Handlers just throw
 * `AppError`s; they never build error JSON themselves (DRY).
 */
import type { ZodType } from "zod";
import {
  type AppError,
  InvalidJsonError,
  PayloadTooLargeError,
  RateLimitError,
  ValidationError,
  toAppError,
} from "@/lib/errors";
import { getLogger, type Logger } from "@/lib/logger";

export interface ApiContext {
  req: Request;
  requestId: string;
  log: Logger;
}

type ApiHandler = (ctx: ApiContext) => Promise<Response>;

export interface ErrorBody {
  error: { code: string; message: string; retryable: boolean; requestId: string };
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(data, { ...init, headers });
}

function errorResponse(error: AppError, requestId: string): Response {
  const body: ErrorBody = {
    error: {
      code: error.code,
      message: error.publicMessage,
      retryable: error.retryable,
      requestId,
    },
  };
  const headers = new Headers({ "X-Request-Id": requestId });
  if (error instanceof RateLimitError) headers.set("Retry-After", String(error.retryAfterSeconds));
  return jsonResponse(body, { status: error.status, headers });
}

export function withApiHandler(handler: ApiHandler): (req: Request) => Promise<Response> {
  return async (req) => {
    const requestId = req.headers.get("x-request-id")?.slice(0, 64) || crypto.randomUUID();
    const log = getLogger().child({ requestId, method: req.method, path: new URL(req.url).pathname });
    const startedAt = performance.now();

    try {
      const response = await handler({ req, requestId, log });
      response.headers.set("X-Request-Id", requestId);
      log.info("request.completed", {
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
      });
      return response;
    } catch (thrown) {
      const error = toAppError(thrown);
      const durationMs = Math.round(performance.now() - startedAt);
      // 4xx are expected client conditions (warn); 5xx are our problem (error).
      const level = error.status >= 500 ? "error" : "warn";
      log[level]("request.failed", {
        code: error.code,
        status: error.status,
        durationMs,
        meta: error.meta,
        err: error.status >= 500 ? thrown : undefined,
      });
      return errorResponse(error, requestId);
    }
  };
}

/** Best-effort client identifier for rate limiting (first hop of x-forwarded-for). */
export function getClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "anonymous";
}

/**
 * Read + validate a JSON body with a hard size cap. Streams the body so a
 * missing/lying Content-Length cannot bypass the limit.
 */
export async function parseJsonBody<T>(req: Request, schema: ZodType<T>, maxBytes = 64 * 1024): Promise<T> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadTooLargeError(maxBytes);

  const reader = req.body?.getReader();
  if (!reader) throw new InvalidJsonError();

  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError(maxBytes);
    }
    chunks.push(value);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
  } catch (cause) {
    throw new InvalidJsonError({ cause });
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError("Request body failed validation", {
      cause: result.error,
      meta: { issues: result.error.issues.map((i) => ({ path: i.path.join("."), code: i.code })) },
    });
  }
  return result.data;
}
