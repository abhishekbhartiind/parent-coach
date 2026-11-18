"use client";

import { useEffect, useRef } from "react";
import type { CoachApiError } from "../client/coach-api";
import type { ChatMessage } from "../client/use-coach-chat";
import { CoachReplyCard } from "./coach-reply-card";
import { ErrorBanner } from "./error-banner";
import { ParentBubble } from "./parent-bubble";
import { TypingIndicator } from "./typing-indicator";

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  error: CoachApiError | null;
  onRetry: () => void;
}

export function MessageList({ messages, loading, error, onRetry }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading, error]);

  return (
    <div role="log" aria-live="polite" aria-busy={loading} className="flex flex-col gap-4">
      {messages.map((message) =>
        message.role === "parent" ? (
          <ParentBubble key={message.id} content={message.content} />
        ) : (
          <CoachReplyCard key={message.id} reply={message.reply} />
        ),
      )}
      {loading && <TypingIndicator />}
      {error && !loading && <ErrorBanner error={error} onRetry={onRetry} />}
      <div ref={endRef} />
    </div>
  );
}
