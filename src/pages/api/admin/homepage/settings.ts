// POST & GET /api/admin/homepage/settings — Homepage Admin Settings API
import type { APIRoute } from 'astro';

export const prerender = false;

// In-memory / persistent config store fallback
let homepageSettings = {
  eyebrow_text: 'ADA IS ONLINE · INDEXING 14,382 TOOLS',
  hero_headline_line1: 'The encyclopedia',
  hero_headline_line2: 'of automation is alive.',
  sub_headline: "Ask Ada anything — she reads the whole wiki, the marketplace, and today's launches so you don't have to.",
  announcement_banner: '',
  show_live_stats: true,
  spotlight_default_category: 'all',
  last_updated: new Date().toISOString(),
};

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  return new Response(JSON.stringify(homepageSettings), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    homepageSettings = {
      ...homepageSettings,
      ...body,
      last_updated: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ success: true, settings: homepageSettings }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid settings payload' }), { status: 400 });
  }
};
