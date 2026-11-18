"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIMITS, type ChatTurn, type CoachReply } from "../domain/schemas";
import { replyToTranscript } from "../domain/transcript";
import { CoachApiError, requestCoachReply } from "./coach-api";

export type ChatMessage =
  { id: string; role: "parent"; content: string } | { id: string; role: "coach"; reply: CoachReply };

export type ChatStatus = "idle" | "loading";

/** Map UI messages to API turns, keeping only what the server accepts. */
export function toTurns(messages: ChatMessage[]): ChatTurn[] {
  return messages
    .map<ChatTurn>((m) =>
      m.role === "parent"
        ? { role: "user", content: m.content }
        : { role: "assistant", content: replyToTranscript(m.reply) },
    )
    .slice(-LIMITS.historyTurns);
}

/**
 * Conversation state for the page. History lives in memory only (no login,
 * no storage). Handles cancellation, stale responses and retry.
 */
export function useCoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<CoachApiError | null>(null);

  const messagesRef = useRef<ChatMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(async (history: ChatMessage[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const reply = await requestCoachReply(toTurns(history), controller.signal);
      if (controller.signal.aborted) return;
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "coach", reply }]);
    } catch (thrown) {
      if (controller.signal.aborted) return;
      const apiError =
        thrown instanceof CoachApiError ? thrown : new CoachApiError("INTERNAL_ERROR", "Unexpected client error", true);
      // Metadata only: never log what the parent wrote.
      console.error("[coach] request failed", {
        code: apiError.code,
        status: apiError.status,
        requestId: apiError.requestId,
      });
      setError(apiError);
    } finally {
      if (!controller.signal.aborted) setStatus("idle");
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || status === "loading") return;
      const next: ChatMessage[] = [...messagesRef.current, { id: crypto.randomUUID(), role: "parent", content }];
      messagesRef.current = next;
      setMessages(next);
      void run(next);
    },
    [run, status],
  );

  const retry = useCallback(() => {
    if (status === "loading" || messagesRef.current.length === 0) return;
    void run(messagesRef.current);
  }, [run, status]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    setStatus("idle");
  }, []);

  return { messages, status, error, send, retry, reset };
}
