import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_COPY, SUGGESTIONS } from "../content/ui-copy";

interface EmptyStateProps {
  onPick: (text: string) => void;
}

export function EmptyState({ onPick }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Sparkles className="size-7" aria-hidden />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-balance">{APP_COPY.emptyTitle}</h2>
        <p lang="ur" className="text-base text-muted-foreground">
          {APP_COPY.emptyTitleUrdu}
        </p>
        <p className="mx-auto max-w-sm text-sm text-pretty text-muted-foreground">{APP_COPY.emptyBody}</p>
      </div>
      <ul className="flex w-full max-w-md flex-col gap-2" aria-label="Example concerns">
        {SUGGESTIONS.map(({ text, language }) => (
          <li key={text}>
            <Button
              variant="outline"
              className="h-auto w-full justify-start rounded-xl px-4 py-3 text-start text-sm font-normal whitespace-normal"
              dir={language === "ur" ? "rtl" : "ltr"}
              lang={language}
              onClick={() => onPick(text)}
            >
              {text}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
