"use client";

import { useRef, useState } from "react";
import { useCoachChat } from "../client/use-coach-chat";
import { APP_COPY } from "../content/ui-copy";
import { AppHeader } from "./app-header";
import { Composer } from "./composer";
import { EmptyState } from "./empty-state";
import { MessageList } from "./message-list";

/** Page-level composition: wires the chat hook to presentational components. */
export function ChatShell() {
  const { messages, status, error, send, retry, reset } = useCoachChat();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loading = status === "loading";
  const isEmpty = messages.length === 0;

  const submit = () => {
    send(draft);
    setDraft("");
  };

  const pickSuggestion = (text: string) => {
    setDraft(text);
    inputRef.current?.focus();
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col overflow-hidden bg-background/70 backdrop-blur-sm md:my-4 md:h-[calc(100dvh-2rem)] md:rounded-3xl md:border md:shadow-xl">
      <AppHeader canReset={!isEmpty} onReset={reset} />

      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {isEmpty && !loading ? (
          <EmptyState onPick={pickSuggestion} />
        ) : (
          <MessageList messages={messages} loading={loading} error={error} onRetry={retry} />
        )}
      </main>

      <footer className="space-y-2 border-t bg-background/80 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-6">
        <Composer value={draft} onChange={setDraft} onSubmit={submit} disabled={loading} inputRef={inputRef} />
        <div className="space-y-0.5 text-center text-[11px] leading-snug text-muted-foreground">
          <p>{APP_COPY.disclaimer}</p>
          <p lang="ur" dir="rtl">
            {APP_COPY.disclaimerUrdu}
          </p>
        </div>
      </footer>
    </div>
  );
}
