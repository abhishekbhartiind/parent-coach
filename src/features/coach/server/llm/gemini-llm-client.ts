/**
 * Google Gemini adapter for `LlmClient`.
 *
 * Forces a single function call (mode ANY, one allowed name) whose parameters
 * are the shared coach JSON schema, so the output contract matches the other
 * adapters exactly. Gemini roles are "user" / "model".
 *
 * Note: "thinking" Gemini models count reasoning tokens against the output
 * limit; if replies come back empty, raise LLM_MAX_OUTPUT_TOKENS.
 */
import { ApiError, FunctionCallingConfigMode, GoogleGenAI } from "@google/genai";
import { ConfigError, LlmResponseError, LlmUnavailableError } from "@/lib/errors";
import type { LlmClient, LlmClientSettings, LlmReplyRequest, LlmReplyResult } from "./llm-client";
import { buildCoachToolJsonSchema, COACH_TOOL_DESCRIPTION, COACH_TOOL_NAME } from "./tool-schema";

export class GeminiLlmClient implements LlmClient {
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly maxOutputTokens: number;
  private readonly parameters = buildCoachToolJsonSchema();

  constructor(settings: LlmClientSettings) {
    this.client = new GoogleGenAI({ apiKey: settings.apiKey, httpOptions: { timeout: settings.timeoutMs } });
    this.model = settings.model;
    this.maxOutputTokens = settings.maxOutputTokens;
  }

  async generateCoachReply({ system, messages, signal }: LlmReplyRequest): Promise<LlmReplyResult> {
    let response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>;
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        config: {
          systemInstruction: system,
          maxOutputTokens: this.maxOutputTokens,
          abortSignal: signal,
          tools: [
            {
              functionDeclarations: [
                { name: COACH_TOOL_NAME, description: COACH_TOOL_DESCRIPTION, parametersJsonSchema: this.parameters },
              ],
            },
          ],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingConfigMode.ANY,
              allowedFunctionNames: [COACH_TOOL_NAME],
            },
          },
        },
      });
    } catch (error) {
      throw this.translateError(error);
    }

    const call = response.functionCalls?.find((c) => c.name === COACH_TOOL_NAME);
    if (!call?.args) {
      throw new LlmResponseError("Model returned no function call", {
        meta: { finishReason: response.candidates?.[0]?.finishReason, model: this.model },
      });
    }

    return {
      output: call.args,
      model: response.modelVersion ?? this.model,
      usage: response.usageMetadata
        ? {
            inputTokens: response.usageMetadata.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    };
  }

  private translateError(error: unknown): Error {
    if (error instanceof ApiError) {
      // Gemini reports a bad key as 400 "API key not valid", not 401.
      const badKey =
        error.status === 401 || error.status === 403 || (error.status === 400 && /api key/i.test(error.message));
      if (badKey) return new ConfigError("Gemini credentials were rejected", { cause: error });
      return new LlmUnavailableError("Gemini request failed", {
        cause: error,
        meta: { status: error.status, model: this.model },
      });
    }
    // Network failures, timeouts and aborts surface as plain errors from fetch.
    return new LlmUnavailableError("Gemini request failed or was aborted", {
      cause: error,
      meta: { model: this.model },
    });
  }
}
