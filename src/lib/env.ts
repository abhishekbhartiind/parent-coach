/**
 * Typed, validated server environment, split by concern so a missing secret
 * for one subsystem (e.g. the LLM key) never breaks unrelated paths (request
 * validation, rate limiting, the offline safety fallback).
 *
 * Parsed lazily (not at import time) so `next build` works without secrets.
 * Error output lists variable names only, never their values.
 */
import { z } from "zod";
import { ConfigError } from "@/lib/errors";

export const LLM_PROVIDERS = ["anthropic", "openai", "gemini"] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

const llmEnvSchema = z
  .object({
    LLM_PROVIDER: z.enum(LLM_PROVIDERS).default("anthropic"),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_MODEL: z.string().min(1).default("claude-sonnet-5-5"),
    OPENAI_API_KEY: z.string().min(1).optional(),
    // No default on purpose: OpenAI model names change often; you choose.
    OPENAI_MODEL: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    // No default on purpose: Gemini model names change often; you choose.
    GEMINI_MODEL: z.string().min(1).optional(),
    LLM_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(20_000),
    LLM_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(200).max(4_000).default(700),
  })
  .superRefine((env, ctx) => {
    const need = (key: keyof typeof env) => {
      if (!env[key])
        ctx.addIssue({ code: "custom", path: [key], message: `is required when LLM_PROVIDER=${env.LLM_PROVIDER}` });
    };
    if (env.LLM_PROVIDER === "anthropic") need("ANTHROPIC_API_KEY");
    if (env.LLM_PROVIDER === "openai") {
      need("OPENAI_API_KEY");
      need("OPENAI_MODEL");
    }
    if (env.LLM_PROVIDER === "gemini") {
      need("GEMINI_API_KEY");
      need("GEMINI_MODEL");
    }
  });

const rateLimitEnvSchema = z.object({
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
});

export type LlmEnv = z.infer<typeof llmEnvSchema>;
export type RateLimitEnv = z.infer<typeof rateLimitEnvSchema>;

function createEnvLoader<S extends z.ZodType>(schema: S) {
  let cached: z.infer<S> | undefined;

  return (source: NodeJS.ProcessEnv = process.env): z.infer<S> => {
    const useCache = source === process.env;
    if (useCache && cached) return cached;

    const result = schema.safeParse(source);
    if (!result.success) {
      const invalid = result.error.issues.map((i) => `${i.path.join(".")} ${i.message}`);
      throw new ConfigError(`Invalid environment: ${invalid.join("; ")}`, {
        meta: { invalid: result.error.issues.map((i) => i.path.join(".")) },
      });
    }

    if (useCache) cached = result.data;
    return result.data;
  };
}

export const getLlmEnv = createEnvLoader(llmEnvSchema);
export const getRateLimitEnv = createEnvLoader(rateLimitEnvSchema);
