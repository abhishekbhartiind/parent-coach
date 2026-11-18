import { describe, expect, it } from "vitest";
import { toStrictToolSchema } from "@/features/coach/server/llm/anthropic-llm-client";
import { buildCoachToolJsonSchema } from "@/features/coach/server/llm/tool-schema";

describe("toStrictToolSchema", () => {
  it("removes length keywords that Anthropic strict mode rejects, keeping the structure", () => {
    const strict = JSON.stringify(toStrictToolSchema(buildCoachToolJsonSchema()));

    expect(strict).not.toMatch(/"(maxItems|minItems|maxLength|minLength)"/);
    expect(strict).toContain('"followUp"');
    expect(strict).toContain('"required"');
  });
});
