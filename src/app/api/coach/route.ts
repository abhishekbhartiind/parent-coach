import { getClientKey, jsonResponse, parseJsonBody, withApiHandler } from "@/lib/api/handler";
import { RateLimitError } from "@/lib/errors";
import { coachRequestSchema, type CoachResponse } from "@/features/coach/domain/schemas";
import { getCoachService, getRateLimiter } from "@/features/coach/server/container";

/**
 * POST /api/coach
 * Body:    { messages: [{ role: "user" | "assistant", content: string }] }
 * Success: { reply: CoachReply }
 * Failure: { error: { code, message, retryable, requestId } }
 */
export const POST = withApiHandler(async ({ req, log }) => {
  const limit = getRateLimiter().check(getClientKey(req));
  if (!limit.allowed) throw new RateLimitError(limit.retryAfterSeconds);

  const { messages } = await parseJsonBody(req, coachRequestSchema);
  const reply = await getCoachService().respond(messages, { log, signal: req.signal });

  const body: CoachResponse = { reply };
  return jsonResponse(body);
});
