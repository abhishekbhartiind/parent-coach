import { detectLanguage } from "../domain/language";

export function ParentBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <p
        dir="auto"
        lang={detectLanguage(content)}
        className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap text-primary-foreground shadow-sm"
      >
        {content}
      </p>
    </div>
  );
}
