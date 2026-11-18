import { describe, expect, it } from "vitest";
import { ConfigError, toAppError, ValidationError } from "@/lib/errors";
import { getLlmEnv, getRateLimitEnv } from "@/lib/env";
import { createLogger, type LogLevel } from "@/lib/logger";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";
import { ZodError } from "zod";

describe("SlidingWindowRateLimiter", () => {
  it("blocks after the limit and recovers when the window slides", () => {
    const limiter = new SlidingWindowRateLimiter(2, 1_000);
    expect(limiter.check("a", 0).allowed).toBe(true);
    expect(limiter.check("a", 100).allowed).toBe(true);
    const blocked = limiter.check("a", 200);
    expect(blocked).toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.check("a", 1_001).allowed).toBe(true);
  });

  it("tracks keys independently and bounds memory", () => {
    const limiter = new SlidingWindowRateLimiter(1, 1_000, 3);
    for (let i = 0; i < 10; i++) expect(limiter.check(`k${i}`, i).allowed).toBe(true);
    expect(limiter.check("k9", 20).allowed).toBe(false);
  });
});

describe("logger", () => {
  const capture = () => {
    const lines: Array<{ level: LogLevel; entry: Record<string, unknown> }> = [];
    const log = createLogger({ level: "info", sink: (level, line) => lines.push({ level, entry: JSON.parse(line) }) });
    return { lines, log };
  };

  it("redacts sensitive keys, merges child bindings and honours levels", () => {
    const { lines, log } = capture();
    const child = log.child({ requestId: "r1" });
    child.debug("hidden");
    child.info("evt", { content: "private parent text", messages: [{ content: "x" }], turns: 3 });
    expect(lines).toHaveLength(1);
    expect(lines[0].entry).toMatchObject({ event: "evt", requestId: "r1", turns: 3, content: "[REDACTED]" });
    expect(JSON.stringify(lines[0].entry)).not.toContain("private parent text");
  });

  it("serialises errors with their cause chain", () => {
    const { lines, log } = capture();
    log.error("boom", { err: new Error("outer", { cause: new Error("inner") }) });
    expect(lines[0].entry.err).toMatchObject({ message: "outer", cause: { message: "inner" } });
  });
});

describe("errors and env", () => {
  it("collapses unknown errors to INTERNAL_ERROR without leaking details", () => {
    const err = toAppError(new Error("db password is hunter2"));
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.publicMessage).not.toContain("hunter2");
  });

  it("maps ZodError to ValidationError", () => {
    expect(toAppError(new ZodError([]))).toBeInstanceOf(ValidationError);
  });

  it("getLlmEnv names invalid variables but never their values", () => {
    try {
      getLlmEnv({ ANTHROPIC_API_KEY: "", LLM_TIMEOUT_MS: "nope" } as unknown as NodeJS.ProcessEnv);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as Error).message).toContain("ANTHROPIC_API_KEY");
      expect((error as Error).message).not.toContain("nope");
    }
  });

  it("requires the key and model for the selected provider only", () => {
    const run = (env: Record<string, string>) => () => getLlmEnv(env as unknown as NodeJS.ProcessEnv);
    expect(run({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "k" })).toThrow(/OPENAI_MODEL/);
    expect(run({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "k", OPENAI_MODEL: "m" })).not.toThrow();
    expect(run({ LLM_PROVIDER: "openai", OPENAI_MODEL: "m", ANTHROPIC_API_KEY: "k" })).toThrow(/OPENAI_API_KEY/);
    expect(run({ LLM_PROVIDER: "gemini", GEMINI_API_KEY: "k" })).toThrow(/GEMINI_MODEL/);
    expect(run({ LLM_PROVIDER: "gemini", GEMINI_API_KEY: "k", GEMINI_MODEL: "m" })).not.toThrow();
    expect(run({ LLM_PROVIDER: "claude" })).toThrow();
  });

  it("applies defaults", () => {
    const llm = getLlmEnv({ ANTHROPIC_API_KEY: "k" } as unknown as NodeJS.ProcessEnv);
    expect(llm.ANTHROPIC_MODEL).toBe("claude-sonnet-5-5");
    // Rate limiting must not require the LLM key.
    expect(getRateLimitEnv({} as NodeJS.ProcessEnv).RATE_LIMIT_MAX_REQUESTS).toBe(20);
  });
});
