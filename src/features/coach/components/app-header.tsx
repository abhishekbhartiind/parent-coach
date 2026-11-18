import { RotateCcw, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_COPY } from "../content/ui-copy";

interface AppHeaderProps {
  canReset: boolean;
  onReset: () => void;
}

export function AppHeader({ canReset, onReset }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sprout className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="flex items-baseline gap-2 text-base leading-tight font-semibold">
            {APP_COPY.name}
            <span lang="ur" className="text-sm font-normal text-muted-foreground">
              {APP_COPY.nameUrdu}
            </span>
          </h1>
          <p className="truncate text-xs text-muted-foreground">{APP_COPY.tagline}</p>
        </div>
      </div>
      {canReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw aria-hidden />
          {APP_COPY.newChat}
        </Button>
      )}
    </header>
  );
}
