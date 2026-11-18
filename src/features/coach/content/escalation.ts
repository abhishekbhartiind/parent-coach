/**
 * Static, human-reviewed escalation guidance (English + Urdu).
 *
 * This content is intentionally NOT LLM-generated: when a conversation is
 * flagged, these words are shown (and used as the offline fallback reply)
 * regardless of model behaviour or availability.
 *
 * Phone numbers are deliberately omitted — they differ by country and a wrong
 * number is worse than none. To localise, add region lines to `actions`.
 */
import type { ActiveEscalation, Language } from "../domain/schemas";

export interface EscalationContent {
  title: string;
  body: string;
  actions: readonly string[];
  checkIn: string;
}

export const ESCALATION_CONTENT: Record<ActiveEscalation, Record<Language, EscalationContent>> = {
  emergency: {
    en: {
      title: "This sounds urgent",
      body: "Please get help right now. This is beyond what a parenting tip can safely handle.",
      actions: [
        "Call your local emergency number or go to the nearest hospital now.",
        "Stay with your child and keep them safe until help arrives.",
        "If you can, ask another adult nearby to help you.",
      ],
      checkIn: "Once your child is safe and help is on the way, come back and tell me.",
    },
    ur: {
      title: "یہ معاملہ فوری توجہ چاہتا ہے",
      body: "براہِ کرم ابھی مدد حاصل کریں۔ یہ صورتحال کسی عام مشورے سے حل نہیں ہو سکتی۔",
      actions: [
        "ابھی اپنے علاقے کا ہنگامی نمبر ملائیں یا قریبی ہسپتال پہنچیں۔",
        "مدد آنے تک اپنے بچے کے ساتھ رہیں اور اسے محفوظ رکھیں۔",
        "اگر ممکن ہو تو قریب موجود کسی دوسرے بالغ سے مدد لیں۔",
      ],
      checkIn: "جب بچہ محفوظ ہو اور مدد پہنچ جائے تو واپس آ کر مجھے بتائیں۔",
    },
  },
  abuse: {
    en: {
      title: "A child's safety comes first",
      body: "If a child is being hurt or is at risk, they need protection from trained people.",
      actions: [
        "If the child is in danger right now, call your local emergency number.",
        "Move the child to a safe place, away from whoever is causing harm.",
        "Contact your local child-protection service, the police, or a trusted professional such as a doctor or school counsellor.",
        "If you are afraid you might hurt your child, step away and reach out to someone for support today.",
      ],
      checkIn: "When the child is safe and you have spoken to someone, come back and tell me.",
    },
    ur: {
      title: "بچے کی حفاظت سب سے پہلے",
      body: "اگر کسی بچے کو نقصان پہنچ رہا ہے یا اسے خطرہ ہے تو اسے تربیت یافتہ لوگوں کی مدد اور تحفظ چاہیے۔",
      actions: [
        "اگر بچہ ابھی خطرے میں ہے تو فوراً اپنے علاقے کا ہنگامی نمبر ملائیں۔",
        "بچے کو نقصان پہنچانے والے شخص سے دور کسی محفوظ جگہ لے جائیں۔",
        "اپنے علاقے کی چائلڈ پروٹیکشن سروس، پولیس یا کسی قابلِ اعتماد ماہر (ڈاکٹر، اسکول کونسلر) سے رابطہ کریں۔",
        "اگر آپ کو ڈر ہے کہ آپ خود بچے کو نقصان پہنچا سکتے ہیں تو وہاں سے ہٹ جائیں اور آج ہی کسی سے مدد لیں۔",
      ],
      checkIn: "جب بچہ محفوظ ہو اور آپ کسی سے بات کر لیں تو واپس آ کر مجھے بتائیں۔",
    },
  },
  self_harm: {
    en: {
      title: "You're not alone. Please reach out now",
      body: "Thoughts of self-harm or suicide, in you or in your child, need real-time support from a person.",
      actions: [
        "If there is immediate danger, call your local emergency number now.",
        "Stay with the person and don't leave them alone. Calmly move away anything they could use to hurt themselves.",
        "Contact a crisis helpline, a doctor, or someone you trust right away.",
      ],
      checkIn: "When you have reached someone, or the person is safe, come back and tell me.",
    },
    ur: {
      title: "آپ اکیلے نہیں ہیں۔ ابھی مدد لیں",
      body: "خود کو نقصان پہنچانے یا خودکشی کے خیالات، چاہے آپ کے ہوں یا آپ کے بچے کے، فوری طور پر کسی انسان سے مدد لینے کے متقاضی ہیں۔",
      actions: [
        "اگر فوری خطرہ ہے تو ابھی اپنے علاقے کا ہنگامی نمبر ملائیں۔",
        "اس شخص کے ساتھ رہیں، اسے اکیلا نہ چھوڑیں، اور خود کو نقصان پہنچانے والی چیزیں پُرسکون انداز میں ہٹا دیں۔",
        "کسی کرائسس ہیلپ لائن، ڈاکٹر یا کسی قابلِ اعتماد شخص سے فوراً رابطہ کریں۔",
      ],
      checkIn: "جب آپ کسی سے رابطہ کر لیں یا وہ شخص محفوظ ہو تو واپس آ کر مجھے بتائیں۔",
    },
  },
};
