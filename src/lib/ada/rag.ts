/**
 * src/lib/ada/rag.ts — vault RAG over content collections.
 *
 * For v1, we use a "grep-grade" retrieval: scan the rendered Astro content
 * collection entries, score each chunk by keyword overlap with the query,
 * and return the top-N. We can swap to vector search later via sqlite-vec.
 *
 * The function is sync at the chunking layer (filesystem reads), and we
 * run the heavy lift inside the request so pages stay incremental.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export interface RagChunk {
  slug: string;
  category: string;
  kind: 'wiki' | 'marketplace' | 'news';
  title: string;
  snippet: string;
  url: string;
  score: number;
}

const STOPWORDS = new Set([
  'the','a','an','and','or','but','is','are','was','were','be','been','being','have','has','had','do','does','did','can','could','will','would','should','may','might','must','to','of','in','on','at','for','with','about','as','by','this','that','these','those','it','its','i','you','we','they','them','us','me','my','your','our','their','what','which','who','how','why','when','where','is','are','do','show','tell','give','find','use','using','please'
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
}

function makeSnippet(body: string | undefined, queryTokens: string[]): string {
  if (!body) return '';
  const text = body.replace(/```[^`]*```/g, ' ').replace(/[#*_]/g, ' ');
  // Find a window around the first matched query token
  for (const tok of queryTokens) {
    const idx = text.toLowerCase().indexOf(tok);
    if (idx >= 0) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(text.length, idx + 220);
      let snip = text.slice(start, end).trim();
      if (start > 0) snip = '… ' + snip;
      if (end < text.length) snip = snip + ' …';
      return collapse(snip);
    }
  }
  return collapse(text.slice(0, 200));
}

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').slice(0, 280);
}

function scoreEntry(entry: CollectionEntry<any>, qTokens: string[]): number {
  if (qTokens.length === 0) return 0;
  const title = entry.data.title?.toLowerCase() ?? '';
  const summary = (entry.data.summary ?? '').toLowerCase();
  const body = entry.body?.toLowerCase() ?? '';
  const tags = (entry.data.tags ?? []).join(' ').toLowerCase();
  const haystack = `${title} ${summary} ${body} ${tags}`;

  let score = 0;
  for (const tok of qTokens) {
    if (!tok) continue;
    if (title.includes(tok)) score += 5;
    if (tags.includes(tok)) score += 3;
    if (summary.includes(tok)) score += 2;
    // Count body matches, capped so a long page can't outscore a focused one
    const matches = (haystack.match(new RegExp(`\\b${escapeRe(tok)}\\b`, 'g')) ?? []).length;
    score += Math.min(matches, 4);
  }
  return score;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function urlFor(entry: CollectionEntry<any>, kind: RagChunk['kind']): string {
  const d = entry.data as any;
  if (kind === 'wiki') {
    return `/wiki/${d.category}/${entry.slug}`;
  }
  if (kind === 'news') {
    return `/news/${entry.slug}`;
  }
  // marketplace
  return `/marketplace/${entry.slug}`;
}

function kindFor(entry: CollectionEntry<any>): RagChunk['kind'] {
  const id = (entry as any).collectionId || (entry as any).id;
  if (typeof id === 'string') {
    if (id.includes('wiki')) return 'wiki';
    if (id.includes('marketplace')) return 'marketplace';
    if (id.includes('news')) return 'news';
  }
  return 'wiki';
}

export async function retrieve(query: string, limit = 5): Promise<RagChunk[]> {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  const wiki = await getCollection('wiki').catch(() => []);
  const mkt = await getCollection('marketplace').catch(() => []);
  const news = await getCollection('news').catch(() => []);

  const allEntries: CollectionEntry<any>[] = [...wiki, ...mkt, ...news];
  const scored = allEntries
    .map((e) => {
      const score = scoreEntry(e, qTokens);
      const d = e.data as any;
      const kind = kindFor(e);
      return {
        slug: e.slug ?? '',
        category: d.category ?? (kind === 'news' ? 'news' : 'marketplace'),
        kind,
        title: d.title ?? e.slug ?? '',
        snippet: makeSnippet(e.body, qTokens),
        url: urlFor(e, kind),
        score,
      } satisfies RagChunk;
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
