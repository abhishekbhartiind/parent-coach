import { Siren } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ESCALATION_CONTENT } from "../content/escalation";
import type { ActiveEscalation, Language } from "../domain/schemas";

interface EscalationAlertProps {
  type: ActiveEscalation;
  language: Language;
}

/**
 * Vetted, static safety guidance. Rendered from code, never from model text,
 * so it is identical whether or not the LLM behaved.
 */
export function EscalationAlert({ type, language }: EscalationAlertProps) {
  const content = ESCALATION_CONTENT[type][language];
  return (
    <Alert variant="destructive" dir={language === "ur" ? "rtl" : "ltr"} lang={language}>
      <Siren aria-hidden />
      <AlertTitle className="text-base">{content.title}</AlertTitle>
      <AlertDescription>
        <p className="text-foreground">{content.body}</p>
        <ul className="grid gap-1.5 ps-5 text-foreground marker:text-destructive list-disc">
          {content.actions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
