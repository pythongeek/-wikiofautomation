// GET /api/search.json — Global Cross-Site Search Endpoint
import type { APIRoute } from 'astro';
import { retrieve } from '~/lib/ada/rag';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const limitParam = Number(url.searchParams.get('limit')) || 10;
  const limit = Math.min(Math.max(1, limitParam), 50);

  if (!q.trim()) {
    return new Response(JSON.stringify({ query: '', results: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const chunks = await retrieve(q, limit);
    return new Response(
      JSON.stringify({
        query: q,
        total: chunks.length,
        results: chunks,
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=30',
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Search failure: ${msg}` }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
