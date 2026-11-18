/**
 * Browser-side API client. Validates every response against the shared
 * schemas so UI code only ever sees well-formed data, and converts all
 * failure modes into a single `CoachApiError` the UI can render.
 */
import { apiErrorSchema, coachResponseSchema, type ChatTurn, type CoachReply } from "../domain/schemas";

export class CoachApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly status = 0,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "CoachApiError";
  }
}

export async function requestCoachReply(messages: ChatTurn[], signal?: AbortSignal): Promise<CoachReply> {
  let response: Response;
  try {
    response = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new CoachApiError("NETWORK_ERROR", "Network request failed", true);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(payload);
    if (parsed.success) {
      const { code, message, retryable, requestId } = parsed.data.error;
      throw new CoachApiError(code, message, retryable ?? false, response.status, requestId);
    }
    throw new CoachApiError("INTERNAL_ERROR", `Unexpected status ${response.status}`, true, response.status);
  }

  const parsed = coachResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new CoachApiError("BAD_RESPONSE", "Response did not match the expected shape", true, response.status);
  }
  return parsed.data.reply;
}
