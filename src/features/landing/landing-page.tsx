import Link from "next/link";
import {
  ArrowRight,
  HeartHandshake,
  Languages,
  ListChecks,
  LockKeyhole,
  MessageCircleQuestionMark,
  ShieldAlert,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_COPY } from "@/features/coach/content/ui-copy";

const CHAT_HREF = "/chat";

const STEPS = [
  {
    icon: MessageCircleQuestionMark,
    title: "Describe what's happening",
    body: "In your own words, in English, Urdu or Roman Urdu. Bedtime battles, tantrums, school refusal, screen time.",
  },
  {
    icon: ListChecks,
    title: "Get a short, calm plan",
    body: "A warm acknowledgement and 2–4 concrete steps you can try tonight. No lectures, no jargon.",
  },
  {
    icon: HeartHandshake,
    title: "Come back with an update",
    body: "Every reply ends with one question or a time to check back, so the plan adapts to your child.",
  },
] as const;

const BOUNDARIES = [
  "No diagnoses, and no medical or legal instructions.",
  "Never suggests physical punishment.",
  "Emergencies, abuse or self-harm get a clear, reviewed safety message telling you to reach real help now.",
] as const;

const SAMPLE_STEPS = [
  "Same short routine every night: bath, book, lights out.",
  "Offer two small choices.",
  "Give a 10-minute warning in a soft voice.",
] as const;

function SampleReply() {
  return (
    <figure
      aria-label="Example coach reply"
      className="rounded-3xl border bg-card p-5 text-card-foreground shadow-xl sm:p-6"
    >
      <p className="ms-auto mb-4 w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        My 4-year-old screams every night at bedtime.
      </p>
      <div className="space-y-3 text-sm">
        <p className="leading-relaxed">
          Nightly screaming is draining, and very common at this age. You can work on it step by step.
        </p>
        <ol className="space-y-2">
          {SAMPLE_STEPS.map((step, index) => (
            <li key={step} className="flex gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                {index + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <p className="rounded-xl bg-accent/70 p-3 text-accent-foreground">
          What time does bedtime start, and does she nap during the day?
        </p>
      </div>
    </figure>
  );
}

export function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sprout className="size-5" aria-hidden />
          </div>
          <p className="flex items-baseline gap-2 font-semibold">
            {APP_COPY.name}
            <span lang="ur" className="text-sm font-normal text-muted-foreground">
              {APP_COPY.nameUrdu}
            </span>
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={CHAT_HREF}>Open coach</Link>
        </Button>
      </header>

      <main className="flex-1 space-y-20 py-10 sm:space-y-28 sm:py-16">
        <section className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Languages className="size-3.5" aria-hidden /> English · اردو · Roman Urdu
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              A calm voice for the hard parenting moments.
            </h1>
            <p lang="ur" dir="rtl" className="text-xl text-muted-foreground">
              مشکل لمحوں میں ایک پرسکون ساتھی
            </p>
            <p className="max-w-md text-lg text-pretty text-muted-foreground">
              Tell {APP_COPY.name} what&apos;s going on. Get a short, practical plan and a gentle follow-up, in the
              language you think in.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-xl">
                <Link href={CHAT_HREF}>
                  Start a conversation <ArrowRight aria-hidden />
                </Link>
              </Button>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <LockKeyhole className="size-4" aria-hidden /> No sign-up. Nothing is stored.
              </p>
            </div>
          </div>
          <SampleReply />
        </section>

        <section aria-labelledby="how-heading" className="space-y-8">
          <h2 id="how-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="space-y-3 rounded-2xl border bg-background/70 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">Step {index + 1}</span>
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-pretty text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="safety-heading"
          className="grid gap-6 rounded-3xl bg-accent/60 p-6 text-accent-foreground sm:p-10 md:grid-cols-[auto_1fr]"
        >
          <ShieldAlert className="size-10" aria-hidden />
          <div className="space-y-4">
            <h2 id="safety-heading" className="text-2xl font-semibold tracking-tight">
              Safe by design
            </h2>
            <ul className="list-disc space-y-2 ps-5">
              {BOUNDARIES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-5 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{APP_COPY.emptyTitle}</h2>
          <Button asChild size="lg" className="rounded-xl">
            <Link href={CHAT_HREF}>
              Talk to {APP_COPY.name} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="space-y-1 border-t py-6 text-center text-xs text-muted-foreground">
        <p>{APP_COPY.disclaimer}</p>
        <p lang="ur" dir="rtl">
          {APP_COPY.disclaimerUrdu}
        </p>
      </footer>
    </div>
  );
}
