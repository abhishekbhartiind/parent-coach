import type { CoachReply } from "./schemas";

/**
 * Flatten a structured reply to plain text so it can be replayed to the LLM
 * as an `assistant` turn on later requests. Kept in `domain` because both the
 * browser (building history) and tests rely on the exact same format.
 */
export function replyToTranscript(reply: CoachReply): string {
  const lines = [reply.acknowledgement, ...reply.steps.map((step, i) => `${i + 1}. ${step}`), reply.followUp.text];
  if (reply.safetyNote) lines.push(reply.safetyNote);
  return lines.join("\n");
}
