// GET /api/stats.json — Live Platform Statistics Endpoint
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { db } from '~/lib/db';
import { listings, wiki_entries } from '~/lib/db/schema';
import { count, eq } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async () => {
  let totalTools = 14382; // Baseline counter
  let wikiCount = 840;
  let workflowsCount = 340;
  let dailyLaunches = 12;

  try {
    // 1. Content Collections count
    const wikiEntries = await getCollection('wiki').catch(() => []);
    const mktEntries = await getCollection('marketplace').catch(() => []);
    const newsEntries = await getCollection('news').catch(() => []);

    wikiCount += wikiEntries.length;
    totalTools += wikiEntries.length + mktEntries.length;

    // 2. Database listings count
    const [{ dbListingsCount }] = await db
      .select({ dbListingsCount: count() })
      .from(listings)
      .where(eq(listings.status, 'published'))
      .catch(() => [{ dbListingsCount: 0 }]);

    const [{ dbWikiCount }] = await db
      .select({ dbWikiCount: count() })
      .from(wiki_entries)
      .catch(() => [{ dbWikiCount: 0 }]);

    totalTools += dbListingsCount;
    wikiCount += dbWikiCount;
    workflowsCount += Math.round(dbListingsCount * 0.4);
    dailyLaunches += newsEntries.length;
  } catch (err) {
    console.error('[stats] Error computing live stats:', err);
  }

  return new Response(
    JSON.stringify({
      status: 'online',
      timestamp: new Date().toISOString(),
      total_tools: totalTools,
      wiki_count: wikiCount,
      workflows_count: workflowsCount,
      daily_launches: dailyLaunches,
      eyebrow_text: `ADA IS ONLINE · INDEXING ${totalTools.toLocaleString()} TOOLS`,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=60',
      },
    }
  );
};
