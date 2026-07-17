// POST /api/ada — Ada AI assistant
// Production endpoint (T010). Uses MiniMax M3 + vault RAG.

import type { APIRoute } from 'astro';
import { adaChat } from '~/lib/ada/client.ts';
import { classifyIntent } from '~/lib/ada/router.ts';
import { retrieve } from '~/lib/ada/rag.ts';
import { ADA_SYSTEM_PROMPT } from '~/lib/ada/prompts.ts';

export const prerender = false;

interface AdaRequest {
  message: string;
  context?: string;
}

interface AdaLink {
  url: string;
  anchor: string;
  source?: string;
}

interface AdaResponse {
  reply: string;
  links: AdaLink[];
  intent?: string;
  cost_cents?: number;
  ms?: number;
}

function safe(s: unknown, max = 1000): string {
  return String(s ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, max);
}

function buildContext(chunks: Awaited<ReturnType<typeof retrieve>>, intent: string): string {
  if (!chunks.length) return '';
  const labels: Record<string, string> = {
    wiki: 'wiki entry',
    marketplace: 'marketplace listing',
    news: 'news item',
  };
  return chunks
    .map((c, i) => `[#${i + 1} ${labels[c.kind] ?? c.kind}] ${c.title}\nURL: ${c.url}\nSnippet: ${c.snippet}`)
    .join('\n\n');
}

function deriveLinks(chunks: Awaited<ReturnType<typeof retrieve>>): AdaLink[] {
  return chunks
    .filter((c) => !!c.url)
    .map((c) => ({
      url: c.url,
      anchor: c.title,
      source: `${c.kind}/${c.category}`,
    }));
}

function extractMarkdownLinks(reply: string): AdaLink[] {
  // Pull any inline markdown links the model produced so we can surface them as chips too.
  const out: AdaLink[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply)) !== null) {
    const anchor = safe(m[1], 80);
    const url = m[2] ?? '';
    if (url.startsWith('/')) {
      out.push({ url, anchor });
    }
  }
  return out;
}

export const POST: APIRoute = async ({ request }) => {
  let body: AdaRequest;
  try {
    body = (await request.json()) as AdaRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const message = safe(body?.message ?? '', 1000).trim();
  if (!message) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const t0 = Date.now();
  const result: AdaResponse = { reply: '', links: [] };

  try {
    // 1) Cheap intent classification
    const intentInfo = await classifyIntent(message);
    result.intent = intentInfo.intent;

    // 2) RAG: top chunks from the most relevant collections
    const candidatesCollections =
      intentInfo.intent === 'marketplace' ? ['marketplace']
      : intentInfo.intent === 'news' ? ['news']
      : intentInfo.intent === 'wiki' ? ['wiki']
      : ['wiki', 'marketplace']; // "general" = wiki-leaning fallback

    const chunks = await retrieve(message, 5);
    const context = buildContext(chunks, intentInfo.intent);

    // 3) Compose final answer with system prompt + retrieved context + user message
    const userWithContext = context
      ? `Context from wiki of automation (use these to ground your answer; cite with [N] and link to the URL):\n\n${context}\n\n---\n\nUser question: ${message}\n\nAnswer concisely. Prefer the canonical one-line answer first; then add 1–2 sentences of context. End with at least one link to wikiofautomation.com drawn from the context. Do not invent URLs.`
      : `User question: ${message}\n\nAnswer concisely. If our wiki doesn't cover this topic, say so and suggest what to search next.`;

    const answer = await adaChat(
      [
        { role: 'system', content: ADA_SYSTEM_PROMPT },
        { role: 'user', content: userWithContext },
      ],
      { temperature: 0.3, maxTokens: 600 },
    );

    result.reply = answer.content;
    result.links = [...deriveLinks(chunks), ...extractMarkdownLinks(answer.content)];
    // Cost (rough): MiniMax M3 pricing not in hand — use prompt+completion token estimate
    result.cost_cents = Math.max(1, Math.round(answer.totalTokens * 0.0008 * 100));
    result.ms = Date.now() - t0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Ada backend error: ${msg.slice(0, 200)}` }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
