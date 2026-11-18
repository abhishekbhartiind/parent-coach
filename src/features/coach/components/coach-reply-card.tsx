import { CalendarClock, MessageCircleQuestionMark, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SECTION_COPY } from "../content/ui-copy";
import type { CoachReply, Language } from "../domain/schemas";
import { CoachAvatar } from "./coach-avatar";
import { EscalationAlert } from "./escalation-alert";

function SectionLabel({ language, children }: { language: Language; children: React.ReactNode }) {
  return (
    <h3
      className={cn(
        "font-semibold text-muted-foreground",
        // Latin small-caps style does not apply to Urdu script.
        language === "ur" ? "text-sm" : "text-xs tracking-wide uppercase",
      )}
    >
      {children}
    </h3>
  );
}

export function CoachReplyCard({ reply }: { reply: CoachReply }) {
  const { language, escalation } = reply;
  const copy = SECTION_COPY[language];
  const isEscalation = escalation !== "none";
  const FollowUpIcon = reply.followUp.kind === "question" ? MessageCircleQuestionMark : CalendarClock;

  return (
    <div className="flex gap-3">
      <CoachAvatar />
      <div className="min-w-0 flex-1 space-y-3">
        {isEscalation && <EscalationAlert type={escalation} language={language} />}

        <Card dir={language === "ur" ? "rtl" : "ltr"} lang={language} className="gap-4 rounded-2xl rounded-tl-md py-4">
          <CardContent className="space-y-4">
            <p className="text-[15px] leading-relaxed text-pretty">{reply.acknowledgement}</p>

            {/* For escalations the vetted banner above carries the action list. */}
            {!isEscalation && (
              <section className="space-y-2">
                <SectionLabel language={language}>{copy.plan}</SectionLabel>
                <ol className="space-y-2.5">
                  {reply.steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span
                        className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
                        aria-hidden
                      >
                        {new Intl.NumberFormat(language === "ur" ? "ur-PK" : "en").format(index + 1)}
                      </span>
                      <span className="text-[15px] leading-relaxed text-pretty">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="flex gap-3 rounded-xl bg-accent/70 p-3.5 text-accent-foreground">
              <FollowUpIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="space-y-0.5">
                <SectionLabel language={language}>
                  {reply.followUp.kind === "question" ? copy.question : copy.checkIn}
                </SectionLabel>
                <p className="text-[15px] leading-relaxed text-pretty">{reply.followUp.text}</p>
              </div>
            </section>

            {reply.safetyNote && (
              <p className="flex gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-pretty">
                  <span className="sr-only">{copy.note}: </span>
                  {reply.safetyNote}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
