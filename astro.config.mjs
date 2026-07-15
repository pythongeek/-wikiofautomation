// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';

const SITE = 'https://wikiofautomation.com';

// docs-researched options (2026-07-15, Astro 5.x):
//   output: default ('static') — pages prerender by default; individual pages
//             opt into SSR with `export const prerender = false`.
//   adapter: node, mode 'standalone' — Hostinger Node Web App runs `node
//             ./dist/server/entry.mjs` directly.
//   i18n: defaultLocale en, locales en/bn/hi per master plan §2.6 (multi-language differentiation).
//   integrations: mdx for wiki entries, sitemap for SEO, astro-pagefind for search.
//   prefetch: hover — instant navigation between wiki entries.
//   vite ssr.noExternal: better-sqlite3, sqlite-vec — they're native modules; don't try to externalize.

export default defineConfig({
  site: SITE,
  adapter: node({ mode: 'standalone' }),
  prefetch: { defaultStrategy: 'hover' },
  trailingSlash: 'ignore',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'bn', 'hi'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    mdx(),
    sitemap({
      i18n: {
        defaultLocale: 'en-US',
        locales: { 'en-US': 'en', 'bn': 'bn', 'hi': 'hi' },
      },
    }),
    pagefind(),
  ],
  vite: {
    ssr: {
      noExternal: ['better-sqlite3'],
    },
    optimizeDeps: {
      exclude: ['better-sqlite3'],
    },
  },
});
