import { describe, expect, it, vi } from "vitest";
import { LlmUnavailableError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import type { ChatTurn, CoachReply } from "@/features/coach/domain/schemas";
import { applySafetyFloor, buildFallbackReply, CoachService, trimHistory } from "@/features/coach/server/coach-service";
import type { LlmClient } from "@/features/coach/server/llm/llm-client";

const silentLog = createLogger({ level: "error", sink: () => {} });

const plan: CoachReply = {
  language: "en",
  escalation: "none",
  acknowledgement: "Bedtime battles are exhausting.",
  steps: ["Keep a calm routine.", "Offer two choices."],
  followUp: { kind: "question", text: "How old is your child?" },
  safetyNote: null,
};

const fakeLlm = (impl: LlmClient["generateCoachReply"]): LlmClient => ({ generateCoachReply: vi.fn(impl) });
const ok = (output: unknown) => ({ output, model: "test-model" });
const user = (content: string): ChatTurn => ({ role: "user", content });

describe("CoachService.respond", () => {
  it("returns a validated reply for ordinary concerns", async () => {
    const service = new CoachService(fakeLlm(async () => ok(plan)));
    await expect(service.respond([user("bedtime is hard")], { log: silentLog })).resolves.toEqual(plan);
  });

  it("retries once when the model output fails schema validation", async () => {
    const llm = fakeLlm(
      vi
        .fn()
        .mockResolvedValueOnce(ok({ nope: true }))
        .mockResolvedValueOnce(ok(plan)),
    );
    const service = new CoachService(llm);
    await expect(service.respond([user("bedtime is hard")], { log: silentLog })).resolves.toEqual(plan);
    expect(llm.generateCoachReply).toHaveBeenCalledTimes(2);
  });

  it("throws LLM_BAD_RESPONSE after repeated invalid output on ordinary concerns", async () => {
    const service = new CoachService(fakeLlm(async () => ok({ nope: true })));
    await expect(service.respond([user("bedtime is hard")], { log: silentLog })).rejects.toMatchObject({
      code: "LLM_BAD_RESPONSE",
    });
  });

  it("propagates LLM outages for ordinary concerns", async () => {
    const service = new CoachService(
      fakeLlm(async () => {
        throw new LlmUnavailableError("down");
      }),
    );
    await expect(service.respond([user("bedtime is hard")], { log: silentLog })).rejects.toMatchObject({
      code: "LLM_UNAVAILABLE",
    });
  });

  it("never lets the model downgrade a screened emergency", async () => {
    const service = new CoachService(fakeLlm(async () => ok(plan)));
    const reply = await service.respond([user("my son swallowed pills")], { log: silentLog });
    expect(reply.escalation).toBe("emergency");
  });

  it("serves vetted static guidance when the model is down during an emergency", async () => {
    const service = new CoachService(
      fakeLlm(async () => {
        throw new LlmUnavailableError("down");
      }),
    );
    const reply = await service.respond([user("my son swallowed pills")], { log: silentLog });
    expect(reply.escalation).toBe("emergency");
    expect(reply.steps.length).toBeGreaterThan(0);
    expect(reply.followUp.kind).toBe("check_in");
  });

  it("passes the screen flag into the system prompt", async () => {
    const llm = fakeLlm(async () => ok({ ...plan, escalation: "self_harm" }));
    await new CoachService(llm).respond([user("he wants to die")], { log: silentLog });
    const call = vi.mocked(llm.generateCoachReply).mock.calls[0][0];
    expect(call.system).toContain("Automated safety flag");
  });
});

describe("helpers", () => {
  it("applySafetyFloor only escalates, never downgrades", () => {
    expect(applySafetyFloor(plan, "abuse").escalation).toBe("abuse");
    expect(applySafetyFloor({ ...plan, escalation: "emergency" }, "none").escalation).toBe("emergency");
    expect(applySafetyFloor({ ...plan, escalation: "self_harm" }, "abuse").escalation).toBe("self_harm");
  });

  it("buildFallbackReply picks Urdu for Urdu-script input", () => {
    expect(buildFallbackReply("emergency", "میرا بچہ بے ہوش ہے").language).toBe("ur");
    expect(buildFallbackReply("emergency", "child unconscious").language).toBe("en");
  });

  it("trimHistory keeps the most recent turns and starts on a parent turn", () => {
    const turns: ChatTurn[] = Array.from({ length: 20 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `turn ${i}`,
    }));
    turns.push(user("latest"));
    const trimmed = trimHistory(turns, 6);
    expect(trimmed[0].role).toBe("user");
    expect(trimmed[trimmed.length - 1].content).toBe("latest");
    expect(trimmed.length).toBeLessThanOrEqual(6);
  });
});
