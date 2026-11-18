"use client";

import { useLayoutEffect, type KeyboardEvent, type RefObject } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { APP_COPY } from "../content/ui-copy";
import { LIMITS } from "../domain/schemas";

const MAX_HEIGHT_PX = 160;

interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}

export function Composer({ value, onChange, onSubmit, disabled, inputRef }: ComposerProps) {
  // Auto-grow up to MAX_HEIGHT_PX, then scroll.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value, inputRef]);

  const canSend = !disabled && value.trim().length > 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't hijack Enter while an IME (e.g. Urdu keyboards) is composing.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) onSubmit();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSubmit();
      }}
      className="space-y-1.5"
    >
      <div className="flex items-end gap-2">
        <Textarea
          ref={inputRef}
          dir="auto"
          rows={1}
          value={value}
          maxLength={LIMITS.parentMessageChars}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={APP_COPY.composerPlaceholder}
          aria-label={APP_COPY.composerLabel}
          enterKeyHint="send"
        />
        <Button type="submit" size="icon" className="size-12 rounded-xl" disabled={!canSend} aria-label={APP_COPY.send}>
          <SendHorizontal aria-hidden className="rtl:-scale-x-100" />
        </Button>
      </div>
      <div className="flex justify-between px-1 text-xs text-muted-foreground">
        <span className="hidden sm:inline">{APP_COPY.sendHint}</span>
        <span className="ms-auto tabular-nums" aria-hidden>
          {value.length}/{LIMITS.parentMessageChars}
        </span>
      </div>
    </form>
  );
}
