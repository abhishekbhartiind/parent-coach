import type { ChatTurn } from "../../domain/schemas";

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmReplyRequest {
  system: string;
  messages: ChatTurn[];
  signal?: AbortSignal;
}

export interface LlmReplyResult {
  /** Raw structured output; the service validates it against the domain schema. */
  output: unknown;
  model: string;
  usage?: LlmUsage;
}

/**
 * Port for the language model (Dependency Inversion). `CoachService` depends
 * on this interface only, so providers can be swapped and tests can inject a
 * fake without network access.
 *
 * Contract: throw `LlmUnavailableError` for transport/availability problems
 * and `LlmResponseError` when the model returns no usable structured output.
 */
export interface LlmClient {
  generateCoachReply(request: LlmReplyRequest): Promise<LlmReplyResult>;
}

/** Provider-neutral settings handed to every adapter. */
export interface LlmClientSettings {
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxOutputTokens: number;
}
