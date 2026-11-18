/**
 * Deterministic first-line safety screen (English, Urdu script, Roman Urdu).
 *
 * It is a *safety floor*, not the classifier: the LLM makes the contextual
 * call, and the service escalates if EITHER the screen or the model flags
 * risk. Patterns therefore favour recall; a false positive costs a calmer
 * "please check in with a professional" banner, a false negative can cost far
 * more. Pure function — trivially unit-testable.
 */
import type { ActiveEscalation, EscalationType } from "../domain/schemas";

const RULES: ReadonlyArray<{ type: ActiveEscalation; patterns: readonly RegExp[] }> = [
  {
    type: "emergency",
    patterns: [
      /\b(not breathing|stopped breathing|can'?t breathe|cannot breathe|choking|unconscious|unresponsive|passed out|seizure|convulsing|overdos(e|ed)|poison(ed|ing)?|severe bleeding|bleeding (heavily|badly|a lot)|drown(ed|ing)|on fire|head injury|fell from (the )?(roof|balcony|stairs|window)|missing child|child is missing|can'?t find (my|our) (child|son|daughter|baby)|(has|have|with) a (gun|knife|weapon)|kidnap(ped|ping)?|(swallow(ed|ing)?|took too many) .{0,20}\b(bleach|poison|pills?|tablets?|medicine|medication|batter(y|ies)|magnets?|detergent|chemicals?|cleaner)|(drank|ate|eaten) .{0,20}\b(bleach|poison|pills|batter(y|ies)|detergent|chemicals?|cleaner))\b/i,
      /(سانس نہیں|سانس رک|بے ہوش|بیہوش|زہر|خون بہہ|ڈوب|آگ لگ|اغوا|گم ہو گیا|گم ہو گئی|دورہ پڑ|نگل لی|نگل لیا|(گولیاں|گولی|دوائی|دوا|بیٹری|صاف کرنے والا).{0,25}(کھا|نگل|پی لی|پی لیا))/,
      /\b(saans nahi|saans ruk|behosh|zeher|khoon beh|doob raha|doob rahi|agwa|gum ho gaya|gum ho gayi|daura par|(goli|goliyan|dawai|dawa|battery).{0,25}(kha li|kha liya|nigal|pi li|pi liya))/i,
    ],
  },
  {
    type: "self_harm",
    patterns: [
      /\b(kill (myself|himself|herself|themselves)|suicid(e|al)|want(s)? to die|wish(es)? (i|he|she) (was|were) dead|end (my|his|her) life|take (my|his|her) own life|self[- ]?harm(ing)?|cut(ting)? (myself|himself|herself|my wrists)|hurt(ing)? (myself|himself|herself)|don'?t want to (live|be alive)|better off dead)\b/i,
      /(خودکشی|مرنا چاہتا|مرنا چاہتی|جان دینا چاہ|اپنی جان لے|خود کو نقصان|خود کو مار|زندہ نہیں رہنا)/,
      /\b(khudkushi|khudkashi|marna chahta|marna chahti|jaan de(na|ne)|apni jaan le|khud ko nuqsan|khud ko maar)/i,
    ],
  },
  {
    type: "abuse",
    patterns: [
      /\b(abus(e|ed|ing|ive)|molest(ed|ing)?|sexual(ly)? (assault|abus|touch)|touched (him|her|my child|my son|my daughter) (inappropriately|sexually)|(hit|beat|beating|hits|beats|slap|slapped|kick|kicked|burn|burned|burnt) (him|her|my (child|son|daughter|baby|kid)|the (child|kid))( \w+)? (hard|badly|until|with a)|(beat|beats|beating|burn|burns|burned|burnt|kicks|kicked) (my|our) (child|son|daughter|baby|kid)|i (hit|beat|hurt) (my|our) (child|son|daughter|baby|kid)|someone is hurting (my|the|our) (child|son|daughter|kid)|being hurt at home|bruises? on (him|her|my (child|son|daughter))|marks? on (his|her) (body|back|arms?|legs?))\b/i,
      /(زیادتی|جنسی (ہراس|استحصال|تشدد)|بچے پر تشدد|بچے کو مار|مار پیٹ|تشدد کا نشانہ|نیل کے نشان)/,
      /\b(zyadti|ziyadti|bachay ko maar|bachay par tashaddud|tashaddud|maar peet|jinsi (haraasaan|istehsal))/i,
    ],
  },
];

/** Returns the first (highest-priority) escalation category found, else "none". */
export function screenForRisk(text: string): EscalationType {
  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) return rule.type;
  }
  return "none";
}
