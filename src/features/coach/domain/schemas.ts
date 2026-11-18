/**
 * Single source of truth for the coach contract. Shared by:
 *  - the API route (request validation),
 *  - the LLM adapter (tool JSON-schema is derived from `coachReplySchema`),
 *  - the browser client (response validation).
 */
import { z } from "zod";

export const LIMITS = {
  /** Max characters a parent can send in one message. */
  parentMessageChars: 1_500,
  /** Max characters of a flattened coach turn sent back as history. */
  coachTurnChars: 2_500,
  /** Max turns the API accepts; the service keeps the most recent ones. */
  historyTurns: 12,
} as const;

export const languageSchema = z.enum(["en", "ur"]);
export type Language = z.infer<typeof languageSchema>;

export const escalationTypeSchema = z.enum(["none", "emergency", "abuse", "self_harm"]);
export type EscalationType = z.infer<typeof escalationTypeSchema>;
export type ActiveEscalation = Exclude<EscalationType, "none">;

/** A single turn as exchanged with the API (plain text, role per LLM convention). */
export const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(LIMITS.coachTurnChars),
});
export type ChatTurn = z.infer<typeof chatTurnSchema>;

export const coachRequestSchema = z
  .object({
    messages: z.array(chatTurnSchema).min(1).max(LIMITS.historyTurns),
  })
  .superRefine(({ messages }, ctx) => {
    const last = messages[messages.length - 1];
    if (!last) return; // length violations are reported by the array schema itself
    if (last.role !== "user") {
      ctx.addIssue({ code: "custom", path: ["messages"], message: "Last message must be from the parent" });
    } else if (last.content.length > LIMITS.parentMessageChars) {
      ctx.addIssue({ code: "custom", path: ["messages"], message: "Message is too long" });
    }
  });
export type CoachRequest = z.infer<typeof coachRequestSchema>;

/**
 * Structured coach reply. Length caps are deliberately generous guard-rails:
 * the *prompt* enforces brevity, the schema only rejects runaway output.
 */
export const coachReplySchema = z.object({
  language: languageSchema.describe('"ur" for any Urdu (script or Roman Urdu), otherwise "en".'),
  escalation: escalationTypeSchema.describe(
    'Use "none" for ordinary parenting concerns. Otherwise the escalation category.',
  ),
  acknowledgement: z
    .string()
    .trim()
    .min(1)
    .max(400)
    .describe("One or two warm, specific sentences acknowledging the concern. Plain text."),
  steps: z
    .array(z.string().trim().min(1).max(280))
    .min(1)
    .max(4)
    .describe("2-4 short, concrete actions (max ~25 words each). For escalations: immediate safety actions."),
  followUp: z.object({
    kind: z.enum(["question", "check_in"]),
    text: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .describe(
        'Either one clarifying question, or a time to come back (e.g. "Try this for 3 days, then tell me how bedtime went").',
      ),
  }),
  safetyNote: z
    .string()
    .trim()
    .max(300)
    .nullable()
    .optional()
    .describe("Optional one-line note on when to involve a doctor, counsellor or other professional."),
});
export type CoachReply = z.infer<typeof coachReplySchema>;

export const coachResponseSchema = z.object({ reply: coachReplySchema });
export type CoachResponse = z.infer<typeof coachResponseSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean().optional(),
    requestId: z.string().optional(),
  }),
});
