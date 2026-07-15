// Content Collections — Zod schemas for typed content
// Master plan §3 + §5: wiki entries, marketplace listings, news posts.
// Each collection maps to a folder under src/content/<name>/ (or symlink to
// ../vault/06-knowledge/...). Astro validates frontmatter on build.

import { defineCollection, z } from 'astro:content';

// ─── Wiki entries ──────────────────────────────────────────────────────────
// Categories per master plan §3
const wikiCategories = ['agents', 'frameworks', 'protocols', 'models', 'companies', 'concepts'] as const;

const wiki = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(wikiCategories),
    tags: z.array(z.string()).default([]),
    created: z.string(),
    updated: z.string(),
    summary: z.string().max(280).optional(),     // AEO: first-line-as-answer; ≤ 280 chars (Twitter-card friendly)
    sources: z.array(z.object({
      title: z.string(),
      url: z.string().url(),
    })).default([]),
    infobox: z.object({
      kind: z.string().optional(),               // e.g. "Open protocol", "Agent framework", "LLM"
      license: z.string().optional(),
      first_release: z.string().optional(),
      language: z.string().optional(),
      repo: z.string().url().optional(),
      site: z.string().url().optional(),
    }).default({}),
  }),
});

// ─── Marketplace listings ──────────────────────────────────────────────────
const marketplaceTypes = ['agent', 'workflow', 'ai-os', 'app', 'prompt'] as const;
const marketplacePricing = ['free', 'paid', 'freemium'] as const;

const marketplace = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.enum(marketplaceTypes),
    pricing: z.enum(marketplacePricing),
    icon: z.string().optional(),                  // emoji or short text
    uses: z.number().int().nonnegative().default(0),
    rating: z.number().min(0).max(5).default(0),
    tags: z.array(z.string()).default([]),
    license: z.string().optional(),
    original_author: z.string(),
    original_url: z.string().url(),
    attribution: z.string().optional(),           // override attribution line if non-standard
    status: z.enum(['draft', 'queued', 'live', 'rejected']).default('live'),
    created: z.string(),
    updated: z.string(),
  }),
});

// ─── News posts ────────────────────────────────────────────────────────────
const newsKinds = ['launch', 'deep-dive', 'benchmark', 'digest', 'industry'] as const;

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    kind: z.enum(newsKinds),
    published: z.string(),
    excerpt: z.string().optional(),
    sources: z.array(z.string().url()).default([]),
    hero_image: z.string().optional(),
    author: z.string().optional(),
  }),
});

export const collections = { wiki, marketplace, news };
