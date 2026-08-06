/**
 * src/lib/ada/knowledge.ts — Dynamic Knowledge Engine for Ada AI.
 *
 * Aggregates knowledge across:
 * 1. SQLite Database: `listings` (published & pending tools/agents/workflows) and `wiki_entries`
 * 2. Site Route & Capability Index (all public pages, features, and endpoints)
 * 3. System capabilities & site statistics
 */
import { db } from '~/lib/db';
import { listings, wiki_entries } from '~/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RagChunk } from './rag';

export interface SiteRouteInfo {
  path: string;
  title: string;
  description: string;
  category: string;
}

export const SITE_ROUTES: SiteRouteInfo[] = [
  { path: '/', title: 'Homepage', description: 'Central hub with Ada AI search, live stats, marketplace spotlight, and daily news.', category: 'navigation' },
  { path: '/wiki', title: 'Encyclopedia of Automation', description: 'Reference entries on agent frameworks, n8n nodes, LLMs, protocols (MCP, A2A), and automation patterns.', category: 'wiki' },
  { path: '/wiki/compare', title: 'Automation Comparisons', description: 'Side-by-side comparison pages for automation tools, protocols, and agent frameworks.', category: 'wiki' },
  { path: '/marketplace', title: 'Automation Marketplace', description: 'Discover free and paid AI agents, n8n/Zapier workflows, AI OS templates, and prompts.', category: 'marketplace' },
  { path: '/marketplace/agents', title: 'AI Agents', description: 'Autonomous agents ready to deploy for lead-gen, sales, research, and support.', category: 'marketplace' },
  { path: '/marketplace/workflows', title: 'n8n & Zapier Workflows', description: 'Production-ready workflow templates and automation nodes.', category: 'marketplace' },
  { path: '/marketplace/publish', title: 'Submit & Monetize Tools', description: 'Publish your agent or workflow to the marketplace and earn revenue.', category: 'marketplace' },
  { path: '/news', title: 'Automation Newsroom', description: 'Daily launches, model benchmarks, protocol releases, and deep dives.', category: 'news' },
  { path: '/admin', title: 'Admin Control Center', description: 'Site management dashboard for wiki entries, marketplace queue, Ada logs, and homepage settings.', category: 'admin' },
];

/**
 * Fetches dynamic knowledge chunks from the SQLite Database (tools, listings, wiki entries).
 */
export async function getDbKnowledgeChunks(): Promise<RagChunk[]> {
  const chunks: RagChunk[] = [];

  try {
    // 1. Fetch published marketplace listings from SQLite DB
    const dbListings = await db
      .select()
      .from(listings)
      .where(eq(listings.status, 'published'))
      .orderBy(desc(listings.created_at))
      .limit(50);

    for (const item of dbListings) {
      const cat = item.category || 'general';
      const pricing = item.pricing ? `[${item.pricing.toUpperCase()}]` : '';
      const priceText = item.price ? `$${(item.price / 100).toFixed(2)}` : '';
      const authorText = item.original_author ? `by ${item.original_author}` : '';

      chunks.push({
        slug: `db-listing-${item.id}`,
        category: cat,
        kind: 'marketplace',
        title: item.title,
        snippet: `${pricing} ${priceText} ${authorText} ${item.description || ''} (Attribution: ${item.attribution || 'Open'}).`.trim(),
        url: item.original_url || `/marketplace/${item.id}`,
        score: 0,
      });
    }
  } catch (err) {
    console.error('[knowledge] Failed to query SQLite listings:', err instanceof Error ? err.message : err);
  }

  try {
    // 2. Fetch database wiki entries
    const dbWikiEntries = await db
      .select()
      .from(wiki_entries)
      .orderBy(desc(wiki_entries.last_updated))
      .limit(50);

    for (const entry of dbWikiEntries) {
      chunks.push({
        slug: entry.slug,
        category: entry.category || 'general',
        kind: 'wiki',
        title: entry.title,
        snippet: `Wiki entry on ${entry.title}. Status: ${entry.status}. Category: ${entry.category || 'general'}.`,
        url: `/wiki/${entry.category || 'general'}/${entry.slug}`,
        score: 0,
      });
    }
  } catch (err) {
    console.error('[knowledge] Failed to query SQLite wiki entries:', err instanceof Error ? err.message : err);
  }

  // 3. Add Site Route Knowledge Chunks
  for (const route of SITE_ROUTES) {
    chunks.push({
      slug: `route-${route.path.replace(/\//g, '-') || 'home'}`,
      category: route.category,
      kind: 'wiki',
      title: route.title,
      snippet: `Website route ${route.path}: ${route.description}`,
      url: route.path,
      score: 0,
    });
  }

  return chunks;
}
