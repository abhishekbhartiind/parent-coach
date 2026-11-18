import { afterEach, describe, expect, it, vi } from "vitest";
import { CoachApiError, requestCoachReply } from "@/features/coach/client/coach-api";
import type { CoachReply } from "@/features/coach/domain/schemas";

const reply: CoachReply = {
  language: "en",
  escalation: "none",
  acknowledgement: "Bedtime battles are exhausting.",
  steps: ["Keep a calm routine."],
  followUp: { kind: "question", text: "How old is your child?" },
  safetyNote: null,
};

const turn = [{ role: "user" as const, content: "bedtime is hard" }];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestCoachReply", () => {
  it("returns a reply that matches the shared schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ reply })),
    );

    await expect(requestCoachReply(turn)).resolves.toEqual(reply);
  });

  it("maps a structured API error onto CoachApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: { code: "RATE_LIMITED", message: "slow down", retryable: true, requestId: "req-1" },
          },
          { status: 429 },
        ),
      ),
    );

    await expect(requestCoachReply(turn)).rejects.toMatchObject({
      name: "CoachApiError",
      code: "RATE_LIMITED",
      retryable: true,
      status: 429,
      requestId: "req-1",
    });
  });

  it("maps a network failure to NETWORK_ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    const error = await requestCoachReply(turn).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CoachApiError);
    expect(error).toMatchObject({ code: "NETWORK_ERROR", retryable: true });
  });

  it("rejects a 200 body that does not match the reply schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ reply: { nope: true } })),
    );

    await expect(requestCoachReply(turn)).rejects.toMatchObject({ code: "BAD_RESPONSE" });
  });
});
