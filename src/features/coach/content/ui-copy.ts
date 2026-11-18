/** All user-facing strings live here (no copy inside components). English + Urdu. */
import type { Language } from "../domain/schemas";

export const SECTION_COPY: Record<
  Language,
  { plan: string; safetySteps: string; question: string; checkIn: string; note: string }
> = {
  en: {
    plan: "Try this",
    safetySteps: "Right now",
    question: "A question for you",
    checkIn: "Check-in",
    note: "Good to know",
  },
  ur: {
    plan: "یہ آزمائیں",
    safetySteps: "ابھی کریں",
    question: "آپ سے ایک سوال",
    checkIn: "دوبارہ رابطہ",
    note: "جاننا ضروری ہے",
  },
};

export const APP_COPY = {
  name: "Sukoon",
  nameUrdu: "سکون",
  tagline: "Calm parenting coach",
  newChat: "New chat",
  emptyTitle: "What's on your mind today?",
  emptyTitleUrdu: "آج آپ کس بارے میں بات کرنا چاہیں گے؟",
  emptyBody: "Share a parenting worry in English or اردو. You'll get a short, practical plan and a check-in.",
  composerPlaceholder: "Tell me what's going on…",
  composerLabel: "Describe your parenting concern",
  send: "Send message",
  sendHint: "Enter to send · Shift+Enter for a new line",
  thinking: "Sukoon is thinking",
  retry: "Try again",
  disclaimer:
    "Sukoon gives general guidance, not medical, legal or mental-health advice. In an emergency, call your local emergency number.",
  disclaimerUrdu:
    "سکون عمومی رہنمائی دیتا ہے، طبی، قانونی یا ذہنی صحت کا مشورہ نہیں۔ ہنگامی صورت میں اپنے علاقے کا ہنگامی نمبر ملائیں۔",
} as const;

export const SUGGESTIONS: ReadonlyArray<{ text: string; language: Language }> = [
  { text: "My 4-year-old has a meltdown every time we leave the park.", language: "en" },
  { text: "My 8-year-old refuses to start homework without a fight.", language: "en" },
  { text: "میرا چھ سالہ بیٹا رات کو اکیلے سونے سے انکار کرتا ہے۔", language: "ur" },
];

export interface BilingualMessage {
  en: string;
  ur: string;
}

const ERROR_COPY: Record<string, BilingualMessage> = {
  RATE_LIMITED: {
    en: "You're sending messages quickly. Please wait a moment and try again.",
    ur: "آپ بہت جلدی پیغامات بھیج رہے ہیں۔ براہِ کرم تھوڑا انتظار کر کے دوبارہ کوشش کریں۔",
  },
  LLM_UNAVAILABLE: {
    en: "The coach is temporarily unavailable. Please try again in a moment.",
    ur: "کوچ اس وقت دستیاب نہیں ہے۔ براہِ کرم کچھ دیر بعد دوبارہ کوشش کریں۔",
  },
  NETWORK_ERROR: {
    en: "Couldn't reach the server. Check your connection and try again.",
    ur: "سرور تک رسائی نہیں ہو سکی۔ اپنا انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔",
  },
  PAYLOAD_TOO_LARGE: {
    en: "Your message is too long. Please shorten it.",
    ur: "آپ کا پیغام بہت لمبا ہے۔ براہِ کرم اسے مختصر کریں۔",
  },
};

const GENERIC_ERROR: BilingualMessage = {
  en: "Something went wrong. Please try again.",
  ur: "کچھ غلط ہو گیا۔ براہِ کرم دوبارہ کوشش کریں۔",
};

export function errorCopy(code: string): BilingualMessage {
  return ERROR_COPY[code] ?? GENERIC_ERROR;
}
