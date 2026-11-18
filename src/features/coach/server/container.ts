/**
 * Composition root: the only place concrete implementations are wired.
 *
 * Providers are a registry keyed by `LLM_PROVIDER`; adding one means writing
 * an adapter and one line here (open/closed). The client is created lazily
 * *inside* the call path, so a missing or invalid key surfaces as a normal
 * `ConfigError` from the model call, which `CoachService` already handles —
 * a flagged emergency still gets vetted static guidance on a misconfigured
 * deployment.
 */
import { getLlmEnv, getRateLimitEnv, type LlmEnv, type LlmProvider } from "@/lib/env";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";
import { CoachService } from "./coach-service";
import { AnthropicLlmClient } from "./llm/anthropic-llm-client";
import { GeminiLlmClient } from "./llm/gemini-llm-client";
import type { LlmClient, LlmClientSettings } from "./llm/llm-client";
import { OpenAiLlmClient } from "./llm/openai-llm-client";

const PROVIDERS: Record<LlmProvider, (env: LlmEnv) => LlmClient> = {
  anthropic: (env) => new AnthropicLlmClient(toSettings(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL, env)),
  openai: (env) => new OpenAiLlmClient(toSettings(env.OPENAI_API_KEY, env.OPENAI_MODEL, env)),
  gemini: (env) => new GeminiLlmClient(toSettings(env.GEMINI_API_KEY, env.GEMINI_MODEL, env)),
};

function toSettings(apiKey: string | undefined, model: string | undefined, env: LlmEnv): LlmClientSettings {
  // Presence is guaranteed by env validation; assert for the type system.
  return {
    apiKey: apiKey as string,
    model: model as string,
    timeoutMs: env.LLM_TIMEOUT_MS,
    maxOutputTokens: env.LLM_MAX_OUTPUT_TOKENS,
  };
}

let coachService: CoachService | undefined;
let rateLimiter: SlidingWindowRateLimiter | undefined;

function createLazyLlmClient(): LlmClient {
  let client: LlmClient | undefined;
  return {
    generateCoachReply(request) {
      if (!client) {
        const env = getLlmEnv();
        client = PROVIDERS[env.LLM_PROVIDER](env);
      }
      return client.generateCoachReply(request);
    },
  };
}

export function getCoachService(): CoachService {
  coachService ??= new CoachService(createLazyLlmClient());
  return coachService;
}

export function getRateLimiter(): SlidingWindowRateLimiter {
  if (!rateLimiter) {
    const env = getRateLimitEnv();
    rateLimiter = new SlidingWindowRateLimiter(env.RATE_LIMIT_MAX_REQUESTS, env.RATE_LIMIT_WINDOW_MS);
  }
  return rateLimiter;
}
