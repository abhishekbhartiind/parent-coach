import { Sprout } from "lucide-react";

export function CoachAvatar() {
  return (
    <div
      className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
      aria-hidden
    >
      <Sprout className="size-4" />
    </div>
  );
}
