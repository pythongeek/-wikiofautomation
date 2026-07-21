import type { AstroCookies } from 'astro';
import { getSession, type Session } from './session';

/**
 * For use in Astro pages. Returns the session or null.
 * Throws a Response redirect to /admin/login if not authenticated.
 */
export async function requireAuth(
  cookies: AstroCookies,
  redirectFn: (path: string) => Response
): Promise<Session> {
  const session = await getSession(cookies);
  if (!session) {
    throw redirectFn('/admin/login');
  }
  return session;
}

export async function requireAdmin(
  cookies: AstroCookies,
  redirectFn: (path: string) => Response
): Promise<Session> {
  // v1: single-admin model. Phase 1: check role === 'admin'
  return requireAuth(cookies, redirectFn);
}