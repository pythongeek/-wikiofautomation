/**
 * src/lib/ada/router.ts — cheap intent classifier.
 *
 * Given a user message, returns which "pillar" the question belongs to
 * and what to focus the RAG retrieval on. Uses MiniMax M3 with JSON mode
 * to keep the call deterministic + small.
 */
import { adaChat } from './client.ts';

export type Intent = 'wiki' | 'marketplace' | 'news' | 'general';

const ROUTER_SYSTEM = `
You are the intent router for "wiki of automation" — the encyclopedia of the automation economy.
Classify the user's message into exactly one of these intents and return strict JSON:

- "wiki" — if the user is asking about a concept, framework, protocol, model, company, agent, or pattern
- "marketplace" — if the user is looking for a tool, workflow, or template to use
- "news" — if the user is asking about recent launches, releases, benchmarks, or industry news
- "general" — anything else (greetings, feedback, off-topic)

Return JSON only: {"intent": "wiki" | "marketplace" | "news" | "general", "confidence": 0.0-1.0}.
No markdown, no commentary.
`.trim();

export async function classifyIntent(message: string): Promise<{ intent: Intent; confidence: number; ms: number }> {
  const t0 = Date.now();
  const res = await adaChat(
    [
      { role: 'system', content: ROUTER_SYSTEM },
      { role: 'user', content: message },
    ],
    { temperature: 0, maxTokens: 80 },
  );
  // Strip code fences if the model wraps the JSON anyway.
  const raw = res.content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed: { intent: Intent; confidence: number } = { intent: 'general', confidence: 0 };
  try {
    const obj = JSON.parse(raw) as { intent?: Intent; confidence?: number };
    if (obj.intent && ['wiki', 'marketplace', 'news', 'general'].includes(obj.intent)) {
      parsed = { intent: obj.intent, confidence: typeof obj.confidence === 'number' ? obj.confidence : 0 };
    }
  } catch {
    // Heuristic fallback when JSON parse fails
    const lower = message.toLowerCase();
    if (/(find|recommend|suggest|show me|looking for|need a|tool|workflow|template|app)/.test(lower)) {
      parsed.intent = 'marketplace';
    } else if (/(when|release|launched|announce|news|today|this week|benchmark)/.test(lower)) {
      parsed.intent = 'news';
    } else if (/(what is|how does|explain|define|compare|vs|protocol|framework|model|agent)/.test(lower)) {
      parsed.intent = 'wiki';
    }
  }
  return { ...parsed, ms: Date.now() - t0 };
}
