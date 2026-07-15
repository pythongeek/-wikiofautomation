// POST /api/ada — Ada AI assistant endpoint
// Stub for T004 wiring; full implementation lands in T010 (MiniMax M3 + vault RAG).

import type { APIRoute } from 'astro';
export const prerender = false;

interface AdaRequest {
  message: string;
  context?: string;
}

function safe(s: unknown, max = 500): string {
  return String(s ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, max);
}

async function adaStub(query: string): Promise<{ reply: string; links: { url: string; anchor: string }[] }> {
  const trimmed = query.trim();
  return {
    reply:
      trimmed.length === 0
        ? "Type a question above and press Enter."
        : `Got it — I'm not fully wired up yet (this is the placeholder response while the MiniMax M3 backend lands). You asked: "${trimmed.slice(0, 120)}". Soon I'll search the wiki, cite a specific entry, and link you to it.`,
    links: [
      { url: '/', anchor: 'Back to home' },
      { url: '/wiki/', anchor: 'Browse the wiki' },
    ],
  };
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

  const message = safe(body?.message ?? '', 1000);
  if (!message) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const result = await adaStub(message);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
