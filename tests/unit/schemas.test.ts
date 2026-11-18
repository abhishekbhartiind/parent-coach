import { describe, expect, it } from "vitest";
import { coachReplySchema, coachRequestSchema, LIMITS } from "@/features/coach/domain/schemas";
import { toTurns } from "@/features/coach/client/use-coach-chat";

describe("coachRequestSchema", () => {
  it("accepts a conversation ending with a parent turn", () => {
    const result = coachRequestSchema.safeParse({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
        { role: "user", content: "help" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ["empty history", { messages: [] }],
    ["ends with assistant", { messages: [{ role: "assistant", content: "x" }] }],
    ["too long", { messages: [{ role: "user", content: "a".repeat(LIMITS.parentMessageChars + 1) }] }],
    ["blank content", { messages: [{ role: "user", content: "   " }] }],
    ["unknown role", { messages: [{ role: "system", content: "x" }] }],
  ])("rejects %s", (_name, body) => {
    expect(coachRequestSchema.safeParse(body).success).toBe(false);
  });
});

describe("coachReplySchema", () => {
  const valid = {
    language: "en",
    escalation: "none",
    acknowledgement: "ok",
    steps: ["one"],
    followUp: { kind: "question", text: "why?" },
  };

  it("accepts a valid reply with optional safetyNote omitted", () => {
    expect(coachReplySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects more than four steps and unknown escalation types", () => {
    expect(coachReplySchema.safeParse({ ...valid, steps: ["1", "2", "3", "4", "5"] }).success).toBe(false);
    expect(coachReplySchema.safeParse({ ...valid, escalation: "panic" }).success).toBe(false);
  });
});

describe("toTurns", () => {
  it("caps history at the API limit", () => {
    const messages = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      role: "parent" as const,
      content: `m${i}`,
    }));
    expect(toTurns(messages)).toHaveLength(LIMITS.historyTurns);
  });
});
