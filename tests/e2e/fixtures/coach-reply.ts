/** Browser mock of a successful coach reply. Imported by tests/e2e/chat.spec.ts. */
export const ordinaryReply = {
  language: "en",
  escalation: "none",
  acknowledgement: "Leaving the park is a hard stop for a four-year-old.",
  steps: ["Give a two-minute warning.", "Offer one small choice on the way out."],
  followUp: { kind: "question", text: "What usually happens in the minute before you leave?" },
  safetyNote: null,
} as const;
