// GET /api/health — basic liveness probe used by Hostinger Web App + smoke tests
import type { APIRoute } from 'astro';
export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'wikiofautomation-site',
      time: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    },
  );
};
