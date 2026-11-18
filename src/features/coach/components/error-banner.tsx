import { RefreshCw, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { APP_COPY, errorCopy } from "../content/ui-copy";
import type { CoachApiError } from "../client/coach-api";

interface ErrorBannerProps {
  error: CoachApiError;
  onRetry: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps) {
  const message = errorCopy(error.code);
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden />
      <AlertTitle>{message.en}</AlertTitle>
      <AlertDescription>
        <p lang="ur" dir="rtl" className="w-full text-foreground">
          {message.ur}
        </p>
        {error.retryable && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw aria-hidden />
            {APP_COPY.retry}
          </Button>
        )}
        {error.requestId && <p className="text-xs text-muted-foreground">Ref: {error.requestId.slice(0, 8)}</p>}
      </AlertDescription>
    </Alert>
  );
}
