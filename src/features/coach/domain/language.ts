import type { Language } from "./schemas";

/** Arabic/Urdu script blocks (covers Urdu letters, Arabic-Indic digits, presentation forms). */
const URDU_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

export function containsUrduScript(text: string): boolean {
  return URDU_SCRIPT.test(text);
}

/**
 * Cheap, deterministic language hint used for UI direction and for safe
 * fallbacks. Roman Urdu is intentionally left to the LLM, which reports its
 * own `language` in every reply.
 */
export function detectLanguage(text: string): Language {
  return containsUrduScript(text) ? "ur" : "en";
}
