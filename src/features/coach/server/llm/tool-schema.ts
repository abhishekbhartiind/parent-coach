/**
 * Provider-neutral definition of the structured-reply "tool". Both adapters
 * force the model to call this one function, so output shape is identical
 * regardless of provider. The JSON schema is derived from the Zod schema (DRY).
 */
import { z } from "zod";
import { coachReplySchema } from "../../domain/schemas";

export const COACH_TOOL_NAME = "submit_coaching_reply";
export const COACH_TOOL_DESCRIPTION = "Deliver the structured coaching reply to the parent.";

export function buildCoachToolJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(coachReplySchema) as Record<string, unknown>;
  delete schema.$schema; // providers do not accept the meta-schema key
  return schema;
}
