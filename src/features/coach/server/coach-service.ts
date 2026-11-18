/**
 * CoachService: orchestrates one coaching turn.
 *
 *   trim history → deterministic safety screen → LLM → schema validation
 *   → safety floor (escalate if screen OR model flagged) → reply
 *
 * Failure policy: if the model is unavailable or returns unusable output
 * AND the screen flagged risk, we still answer with vetted static guidance
 * rather than an error. Safety content must never depend on LLM uptime.
 */
import type { Logger } from "@/lib/logger";
import { AppError, LlmResponseError } from "@/lib/errors";
import { detectLanguage } from "../domain/language";
import {
  coachReplySchema,
  LIMITS,
  type ActiveEscalation,
  type ChatTurn,
  type CoachReply,
  type EscalationType,
} from "../domain/schemas";
import { ESCALATION_CONTENT } from "../content/escalation";
import type { LlmClient } from "./llm/llm-client";
import { buildSystemPrompt, PROMPT_VERSION } from "./prompt";
import { screenForRisk } from "./safety-screen";

const MAX_SCHEMA_ATTEMPTS = 2;

/** Keep the most recent turns and make sure the window starts with a parent turn. */
export function trimHistory(messages: ChatTurn[], maxTurns: number = LIMITS.historyTurns): ChatTurn[] {
  const recent = messages.slice(-maxTurns);
  const firstUser = recent.findIndex((m) => m.role === "user");
  return firstUser <= 0 ? recent : recent.slice(firstUser);
}

/** Build a vetted offline reply from static content. */
export function buildFallbackReply(type: ActiveEscalation, userText: string): CoachReply {
  const language = detectLanguage(userText);
  const content = ESCALATION_CONTENT[type][language];
  return {
    language,
    escalation: type,
    acknowledgement: content.body,
    steps: content.actions.slice(0, 4) as string[],
    followUp: { kind: "check_in", text: content.checkIn },
    safetyNote: null,
  };
}

/** Escalation can only go up: never let the model downgrade a screen hit. */
export function applySafetyFloor(reply: CoachReply, screened: EscalationType): CoachReply {
  if (reply.escalation !== "none" || screened === "none") return reply;
  return { ...reply, escalation: screened };
}

export interface RespondContext {
  log: Logger;
  signal?: AbortSignal;
}

export class CoachService {
  constructor(private readonly llm: LlmClient) {}

  async respond(messages: ChatTurn[], { log, signal }: RespondContext): Promise<CoachReply> {
    const history = trimHistory(messages);
    const latestUserText = history[history.length - 1]?.content ?? "";
    const screened = screenForRisk(latestUserText);
    const system = buildSystemPrompt(screened);

    log.info("coach.turn.started", { turns: history.length, screened, promptVersion: PROMPT_VERSION });

    try {
      const reply = await this.generateValidReply(system, history, log, signal);
      const final = applySafetyFloor(reply, screened);
      log.info("coach.turn.completed", {
        escalation: final.escalation,
        screened,
        modelEscalation: reply.escalation,
        floorApplied: final.escalation !== reply.escalation,
        language: final.language,
      });
      return final;
    } catch (error) {
      if (screened === "none") throw error;
      // Safety path: serve vetted content even though the model failed.
      log.error("coach.turn.fallback", { screened, err: error });
      return buildFallbackReply(screened, latestUserText);
    }
  }

  private async generateValidReply(
    system: string,
    history: ChatTurn[],
    log: Logger,
    signal?: AbortSignal,
  ): Promise<CoachReply> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_SCHEMA_ATTEMPTS; attempt++) {
      let result;
      try {
        result = await this.llm.generateCoachReply({ system, messages: history, signal });
      } catch (error) {
        // A malformed reply (e.g. no tool call) is worth one more try; outages are not.
        if (!(error instanceof LlmResponseError)) throw error;
        lastError = error;
        log.warn("coach.llm.bad_response", { attempt, reason: error.message });
        continue;
      }
      const parsed = coachReplySchema.safeParse(result.output);

      if (parsed.success) {
        log.info("coach.llm.ok", { attempt, model: result.model, usage: result.usage });
        return parsed.data;
      }

      lastError = parsed.error;
      log.warn("coach.llm.schema_invalid", {
        attempt,
        model: result.model,
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.code })),
      });
    }

    if (lastError instanceof AppError) throw lastError;
    throw new LlmResponseError("Model output failed schema validation after retries", { cause: lastError });
  }
}
