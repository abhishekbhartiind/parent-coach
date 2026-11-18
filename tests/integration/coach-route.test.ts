import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/coach/route";
import type { CoachReply } from "@/features/coach/domain/schemas";
import { CoachService } from "@/features/coach/server/coach-service";
import type { LlmClient } from "@/features/coach/server/llm/llm-client";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

process.env.LOG_LEVEL = "error";

const doubles = vi.hoisted(() => ({
  service: undefined as CoachService | undefined,
  limiter: undefined as SlidingWindowRateLimiter | undefined,
}));

vi.mock("@/features/coach/server/container", () => ({
  getCoachService: () => {
    if (!doubles.service) throw new Error("CoachService test double was not set");
    return doubles.service;
  },
  getRateLimiter: () => {
    if (!doubles.limiter) throw new Error("Rate limiter test double was not set");
    return doubles.limiter;
  },
}));

const plan: CoachReply = {
  language: "en",
  escalation: "none",
  acknowledgement: "Bedtime battles are exhausting.",
  steps: ["Keep a calm routine.", "Offer two choices."],
  followUp: { kind: "question", text: "How old is your child?" },
  safetyNote: null,
};

function fakeLlm(output: CoachReply): LlmClient {
  return { generateCoachReply: vi.fn(async () => ({ output, model: "test-model" })) };
}

function post(body: unknown, headers?: HeadersInit): Promise<Response> {
  return POST(
    new Request("http://localhost/api/coach", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/coach", () => {
  beforeEach(() => {
    doubles.limiter = new SlidingWindowRateLimiter(2, 60_000);
    doubles.service = new CoachService(fakeLlm(plan));
  });

  it("returns a validated reply and echoes the request id", async () => {
    const response = await post(
      { messages: [{ role: "user", content: "bedtime is hard" }] },
      { "x-request-id": "req-integration-1" },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req-integration-1");
    await expect(response.json()).resolves.toEqual({ reply: plan });
  });

  it("rejects invalid JSON and a body that fails the request schema", async () => {
    const invalidJson = await post("{");
    expect(invalidJson.status).toBe(400);
    await expect(invalidJson.json()).resolves.toMatchObject({ error: { code: "INVALID_JSON" } });

    const invalidBody = await post({ messages: [] });
    expect(invalidBody.status).toBe(400);
    await expect(invalidBody.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("rate limits the third request from the same client", async () => {
    const body = { messages: [{ role: "user", content: "bedtime is hard" }] };
    expect((await post(body)).status).toBe(200);
    expect((await post(body)).status).toBe(200);

    const blocked = await post(body);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    await expect(blocked.json()).resolves.toMatchObject({
      error: { code: "RATE_LIMITED", retryable: true },
    });
  });

  it("keeps a screened emergency escalated even when the model does not", async () => {
    const response = await post({ messages: [{ role: "user", content: "my son swallowed pills" }] });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { reply: CoachReply };
    expect(payload.reply.escalation).toBe("emergency");
    expect(payload.reply.steps.length).toBeGreaterThan(0);
  });
});
