import { Card } from "@/components/ui/card";
import { APP_COPY } from "../content/ui-copy";
import { CoachAvatar } from "./coach-avatar";

export function TypingIndicator() {
  return (
    <div className="flex gap-3" role="status">
      <CoachAvatar />
      <Card className="flex-row items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3.5">
        <span className="sr-only">{APP_COPY.thinking}</span>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className="size-2 animate-bounce rounded-full bg-primary/60"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </Card>
    </div>
  );
}
