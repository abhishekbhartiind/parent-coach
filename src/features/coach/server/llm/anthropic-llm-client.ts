/**
 * Anthropic adapter for `LlmClient`.
 *
 * Structured output is obtained by forcing a single tool call whose
 * `input_schema` is generated from the shared zod schema (no duplicated
 * JSON-schema to drift). SDK-level retries handle transient 429/5xx; this
 * layer only translates provider failures into domain errors.
 */
import Anthropic from "@anthropic-ai/sdk";
import { ConfigError, LlmResponseError, LlmUnavailableError } from "@/lib/errors";
import type { LlmClient, LlmClientSettings, LlmReplyRequest, LlmReplyResult } from "./llm-client";
import { buildCoachToolJsonSchema, COACH_TOOL_DESCRIPTION, COACH_TOOL_NAME } from "./tool-schema";

type ToolInputSchema = Anthropic.Messages.Tool["input_schema"];

export class AnthropicLlmClient implements LlmClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxOutputTokens: number;
  private readonly toolInputSchema = buildCoachToolJsonSchema() as ToolInputSchema;

  constructor(settings: LlmClientSettings) {
    this.client = new Anthropic({ apiKey: settings.apiKey, timeout: settings.timeoutMs, maxRetries: 2 });
    this.model = settings.model;
    this.maxOutputTokens = settings.maxOutputTokens;
  }

  async generateCoachReply({ system, messages, signal }: LlmReplyRequest): Promise<LlmReplyResult> {
    let response: Anthropic.Messages.Message;
    try {
      response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: this.maxOutputTokens,
          system,
          messages,
          tools: [
            {
              name: COACH_TOOL_NAME,
              description: COACH_TOOL_DESCRIPTION,
              input_schema: this.toolInputSchema,
            },
          ],
          tool_choice: { type: "tool", name: COACH_TOOL_NAME },
        },
        { signal },
      );
    } catch (error) {
      throw this.translateError(error);
    }

    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use" && block.name === COACH_TOOL_NAME,
    );
    if (!toolUse) {
      throw new LlmResponseError("Model returned no tool_use block", {
        meta: { stopReason: response.stop_reason, model: this.model },
      });
    }

    return {
      output: toolUse.input,
      model: response.model,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }

  private translateError(error: unknown): Error {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return new ConfigError("Anthropic credentials were rejected", { cause: error });
    }
    if (error instanceof Anthropic.APIUserAbortError) {
      return new LlmUnavailableError("LLM request aborted", { cause: error });
    }
    if (error instanceof Anthropic.APIError || error instanceof Anthropic.APIConnectionError) {
      return new LlmUnavailableError("Anthropic request failed", {
        cause: error,
        meta: { status: (error as { status?: number }).status, model: this.model },
      });
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
