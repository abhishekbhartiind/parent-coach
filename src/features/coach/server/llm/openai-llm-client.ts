/**
 * OpenAI (ChatGPT models) adapter for `LlmClient`.
 *
 * Uses Chat Completions with a single forced function call whose parameters
 * are the shared coach JSON schema, so the output contract matches the
 * Anthropic adapter exactly. SDK retries handle transient 429/5xx.
 */
import OpenAI from "openai";
import { ConfigError, LlmResponseError, LlmUnavailableError } from "@/lib/errors";
import type { LlmClient, LlmClientSettings, LlmReplyRequest, LlmReplyResult } from "./llm-client";
import { buildCoachToolJsonSchema, COACH_TOOL_DESCRIPTION, COACH_TOOL_NAME } from "./tool-schema";

export class OpenAiLlmClient implements LlmClient {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxOutputTokens: number;
  private readonly parameters = buildCoachToolJsonSchema();

  constructor(settings: LlmClientSettings) {
    this.client = new OpenAI({ apiKey: settings.apiKey, timeout: settings.timeoutMs, maxRetries: 2 });
    this.model = settings.model;
    this.maxOutputTokens = settings.maxOutputTokens;
  }

  async generateCoachReply({ system, messages, signal }: LlmReplyRequest): Promise<LlmReplyResult> {
    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await this.client.chat.completions.create(
        {
          model: this.model,
          max_completion_tokens: this.maxOutputTokens,
          messages: [{ role: "system", content: system }, ...messages],
          tools: [
            {
              type: "function",
              function: { name: COACH_TOOL_NAME, description: COACH_TOOL_DESCRIPTION, parameters: this.parameters },
            },
          ],
          tool_choice: { type: "function", function: { name: COACH_TOOL_NAME } },
          parallel_tool_calls: false,
        },
        { signal },
      );
    } catch (error) {
      throw this.translateError(error);
    }

    const choice = completion.choices[0];
    const call = choice?.message.tool_calls?.find(
      (c): c is OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall =>
        c.type === "function" && c.function.name === COACH_TOOL_NAME,
    );
    if (!call) {
      throw new LlmResponseError("Model returned no function call", {
        meta: { finishReason: choice?.finish_reason, model: this.model },
      });
    }

    let output: unknown;
    try {
      output = JSON.parse(call.function.arguments);
    } catch (cause) {
      throw new LlmResponseError("Function arguments were not valid JSON", { cause, meta: { model: this.model } });
    }

    return {
      output,
      model: completion.model,
      usage: completion.usage
        ? { inputTokens: completion.usage.prompt_tokens, outputTokens: completion.usage.completion_tokens }
        : undefined,
    };
  }

  private translateError(error: unknown): Error {
    if (error instanceof OpenAI.AuthenticationError || error instanceof OpenAI.PermissionDeniedError) {
      return new ConfigError("OpenAI credentials were rejected", { cause: error });
    }
    if (error instanceof OpenAI.APIUserAbortError) {
      return new LlmUnavailableError("LLM request aborted", { cause: error });
    }
    if (error instanceof OpenAI.APIError || error instanceof OpenAI.APIConnectionError) {
      return new LlmUnavailableError("OpenAI request failed", {
        cause: error,
        meta: { status: (error as { status?: number }).status, model: this.model },
      });
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
