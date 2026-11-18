# Sukoon — calm parenting coach

A small Next.js app where a parent describes a concern in **English or Urdu** (script or Roman Urdu) and an LLM coach replies with a **short, structured, safe plan plus a follow-up** (a question or a time to check back). It does not diagnose, does not give medical or legal instructions, and escalates clearly on emergencies, abuse, or self-harm. No login, no database; history lives on the page.

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (new-york, copied-in components + `components.json`) · Zod · Anthropic + OpenAI + Gemini SDKs (switchable) · pnpm · ESLint · Prettier · Husky · Vitest · Playwright

## Run it

```bash
cp .env.example .env.local   # pick LLM_PROVIDER and set that provider's key
pnpm install
pnpm dev                     # http://localhost:3000 (landing), /chat (coach)
pnpm check                   # format, lint, typecheck, unit + integration
pnpm test:e2e                # Playwright (starts the dev server)
```

| Variable                                           | Default                                                  | Purpose                                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `LLM_PROVIDER`                                     | `anthropic`                                              | `anthropic`, `openai` (ChatGPT models) or `gemini`                                                          |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`            | key required if provider=anthropic / `claude-sonnet-5-5` | Anthropic settings                                                                                          |
| `OPENAI_API_KEY` / `OPENAI_MODEL`                  | **both required** if provider=openai (no default model)  | OpenAI settings: set the exact ChatGPT model id                                                             |
| `GEMINI_API_KEY` / `GEMINI_MODEL`                  | **both required** if provider=gemini (no default model)  | Gemini settings. Thinking models spend output tokens on reasoning, so consider `LLM_MAX_OUTPUT_TOKENS=2000` |
| `LLM_TIMEOUT_MS` / `LLM_MAX_OUTPUT_TOKENS`         | `20000` / `2000`                                         | Latency and cost guard-rails (apply to either provider)                                                     |
| `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS` | `20` / `60000`                                           | Per-IP sliding window                                                                                       |
| `LOG_LEVEL`                                        | `info`                                                   | `debug` \| `info` \| `warn` \| `error`                                                                      |

### Switching or adding a model provider

Set `LLM_PROVIDER` (`anthropic`, `openai` or `gemini`) plus that provider's key and model in `.env.local`; nothing else changes. To add another provider (a local model, Mistral...), write an adapter implementing `LlmClient` in `server/llm/` (reuse `tool-schema.ts` for the output contract), add it to `LLM_PROVIDERS` in `lib/env.ts`, and register it in `PROVIDERS` in `server/container.ts`. Other customisation points: the prompt (`server/prompt.ts`), escalation wording (`content/escalation.ts`), UI copy (`content/ui-copy.ts`), colours (`globals.css` tokens), reply limits (`domain/schemas.ts`).

## Architecture

```
src/
  app/                         Routing only: layout, page (landing), chat/page, api/coach/route.ts
  components/ui/               shadcn primitives (button, card, alert, badge, textarea)
  lib/                         Cross-cutting infra, no feature knowledge
    env.ts  errors.ts  logger.ts  rate-limit.ts  utils.ts  api/handler.ts
  features/coach/
    domain/                    Zod schemas (single source of truth), language, transcript
    content/                   Vetted escalation text + all UI copy (EN/UR)
    server/                    prompt, safety-screen, coach-service, container, llm/
    client/                    typed API client + useCoachChat hook
    components/                Presentational chat UI
  features/landing/            Static landing page (server component)
tests/
  unit/                        Vitest: domain, service, client, infra
  integration/                 Vitest: POST /api/coach with a fake LLM
  e2e/                         Playwright: chat journeys in the browser
```

**Request flow:** `POST /api/coach` → `withApiHandler` (request id, timing, logs, error mapping) → rate limit → body parse (streamed size cap + Zod) → `CoachService` → trim history → **deterministic safety screen** → LLM (forced tool call, schema derived from Zod) → validate (1 retry) → **safety floor** → `{ reply }`.

### Principles in practice

- **SOLID / DIP / OCP:** `CoachService` depends on the `LlmClient` port; `AnthropicLlmClient`, `OpenAiLlmClient` and `GeminiLlmClient` are adapters in a provider registry in `container.ts`. Tests inject fakes.
- **DRY:** one Zod schema drives request validation, the LLM tool JSON-schema, and client response validation. One `withApiHandler` owns all error JSON. Design tokens live only in `globals.css`.
- **KISS:** no DB, no auth, no state library, no custom logger dependency; ~6 UI primitives.
- **Errors:** an `AppError` hierarchy with `code`, `status`, `publicMessage`, `retryable`. Internal messages are logged, never returned; unknown errors collapse to `INTERNAL_ERROR`.
- **Logging:** structured JSON, request-scoped child loggers, `requestId` echoed to the client as `X-Request-Id`. **Parent message content is never logged** (and sensitive keys are redacted defensively).

## Safety design (defence in depth)

1. **System prompt** (`server/prompt.ts`, versioned): role, output contract, language rules, hard boundaries (no diagnosis, medical or legal instructions, physical punishment), escalation categories, two few-shot examples, prompt-injection stance.
2. **Keyword screen** (`server/safety-screen.ts`): recall-biased EN / Urdu-script / Roman-Urdu patterns. The model is told when it fires.
3. **Safety floor:** escalation can only go _up_: if either the screen or the model flags risk, the reply is escalated.
4. **Vetted static content** (`content/escalation.ts`): the red banner is rendered from reviewed text, not model output. If the model fails _or the API key is missing_ during a flagged message, the server returns this content instead of an error.

> **Before launch:** have a clinician / child-safety reviewer approve `content/escalation.ts` and the prompt, and add country-specific emergency and child-protection numbers (deliberately omitted — they vary by country and a wrong number is worse than none). Keyword lists are a floor, not a classifier; extend them with real-world phrasing.

## Trade-offs and next steps

- Rate limiting is **in-memory per instance**; for multiple instances swap `SlidingWindowRateLimiter` for a shared store behind the same `check()` contract.
- History is client-side only (sent each request, capped at 12 turns). Add persistence only if you add accounts.
- Streaming replies, an eval suite for prompt regressions, and error tracking (Sentry) are the natural next additions.
