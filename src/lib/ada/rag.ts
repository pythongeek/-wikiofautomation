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

type AnyEntry = CollectionEntry<'wiki'> | CollectionEntry<'marketplace'> | CollectionEntry<'news'>;

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

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function entryTitle(entry: AnyEntry): string {
  const d = entry.data as Record<string, unknown>;
  return (typeof d.title === 'string' ? d.title : entry.slug) ?? '';
}

function entryCategory(entry: AnyEntry, kind: RagChunk['kind']): string {
  const d = entry.data as Record<string, unknown>;
  if (typeof d.category === 'string') return d.category;
  return kind;
}

function entryTags(entry: AnyEntry): string[] {
  const d = entry.data as Record<string, unknown>;
  return Array.isArray(d.tags) ? (d.tags as unknown[]).filter((t): t is string => typeof t === 'string') : [];
}

function entrySummary(entry: AnyEntry): string {
  const d = entry.data as Record<string, unknown>;
  if (typeof d.summary === 'string') return d.summary;
  if (typeof d.description === 'string') return d.description;
  return '';
}

function entryBody(entry: AnyEntry): string {
  // Astro content entries expose body as string in v5
  const b = (entry as { body?: string }).body;
  return typeof b === 'string' ? b : '';
}

function kindFor(entry: AnyEntry): RagChunk['kind'] {
  // Astro provides collection id via `entry.collection` (e.g. 'wiki' | 'marketplace' | 'news')
  const c = (entry as { collection?: string }).collection;
  if (c === 'wiki' || c === 'marketplace' || c === 'news') return c;
  // Fallback: legacy id field
  const id = (entry as { id?: string }).id;
  if (typeof id === 'string') {
    if (id.includes('wiki')) return 'wiki';
    if (id.includes('marketplace')) return 'marketplace';
    if (id.includes('news')) return 'news';
  }
  return 'wiki';
}

function urlFor(entry: AnyEntry, kind: RagChunk['kind']): string {
  if (kind === 'wiki') {
    return `/wiki/${entryCategory(entry, kind)}/${entry.slug}`;
  }
  if (kind === 'news') {
    return `/news/${entry.slug}`;
  }
  return `/marketplace/${entry.slug}`;
}

function scoreEntry(entry: AnyEntry, qTokens: string[]): number {
  if (qTokens.length === 0) return 0;
  const title = entryTitle(entry).toLowerCase();
  const summary = entrySummary(entry).toLowerCase();
  const body = entryBody(entry).toLowerCase();
  const tags = entryTags(entry).join(' ').toLowerCase();
  const haystack = `${title} ${summary} ${body} ${tags}`;

  let score = 0;
  for (const tok of qTokens) {
    if (!tok) continue;
    if (title.includes(tok)) score += 5;
    if (tags.includes(tok)) score += 3;
    if (summary.includes(tok)) score += 2;
    const matches = haystack.match(new RegExp(`\\b${escapeRe(tok)}\\b`, 'g'));
    score += Math.min(matches ? matches.length : 0, 4);
  }
  return score;
}

export async function retrieve(query: string, limit = 5): Promise<RagChunk[]> {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  // Each getCollection returns a specifically-typed array; we widen to AnyEntry.
  let wiki: AnyEntry[] = [];
  let mkt: AnyEntry[] = [];
  let news: AnyEntry[] = [];

  try {
    wiki = (await getCollection('wiki')) as unknown as AnyEntry[];
  } catch (e: unknown) {
    console.error('[rag] wiki collection error:', e instanceof Error ? e.message : e);
  }
  try {
    mkt = (await getCollection('marketplace')) as unknown as AnyEntry[];
  } catch (e: unknown) {
    console.error('[rag] marketplace collection error:', e instanceof Error ? e.message : e);
  }
  try {
    news = (await getCollection('news')) as unknown as AnyEntry[];
  } catch (e: unknown) {
    console.error('[rag] news collection error:', e instanceof Error ? e.message : e);
  }

  const allEntries: AnyEntry[] = [...wiki, ...mkt, ...news];

  const scored: RagChunk[] = [];
  for (const e of allEntries) {
    const score = scoreEntry(e, qTokens);
    if (score <= 0) continue;
    const kind = kindFor(e);
    scored.push({
      slug: e.slug ?? '',
      category: entryCategory(e, kind),
      kind,
      title: entryTitle(e),
      snippet: makeSnippet(entryBody(e), qTokens),
      url: urlFor(e, kind),
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}