/**
 * Runtime env access for admin/backend code.
 *
 * Astro inlines `import.meta.env.PUBLIC_*` at build time. For server-only
 * secrets (ADMIN_PASSWORD_HASH, DB paths, LLM keys), we MUST read from
 * process.env so Hostinger Web App env vars are honored at request time.
 *
 * Build-time defaults can be checked via import.meta.env for compile-time
 * validation, but runtime values come from process.env on the Node server.
 */
export const env = {
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH || '',
  DB_PATH: process.env.DB_PATH || '',
  LLM_MODEL: process.env.LLM_MODEL || 'minimax/MiniMax-M3',
  LLM_API_URL: process.env.LLM_API_URL || '',
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  SITE_URL: process.env.SITE_URL || '',
  PUBLIC_SITE_URL: import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || 'https://wikiofautomation.com',
};

export function isAdminAuthConfigured(): boolean {
  return !!(env.ADMIN_EMAIL && env.ADMIN_PASSWORD_HASH);
}