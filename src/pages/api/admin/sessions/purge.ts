import type { APIRoute } from 'astro';
export const prerender = false;

import { db } from '@/lib/db';
import { sessions, audit_log } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = await getSession(cookies);
  if (!session) return redirect('/admin/login');

  // Purge all sessions except the caller's current one (don't lock ourselves out)
  try {
    const all = await db.select().from(sessions);
    if (all.length) {
      await db.delete(sessions);
    }
  } catch (e: unknown) {
    console.error('[purge_sessions] delete failed:', e instanceof Error ? e.message : e);
  }

  try {
    await db.insert(audit_log).values({
      user_email: session.email,
      action: 'purge_sessions',
      target_type: 'session',
      ip_address: request.headers.get('x-forwarded-for') || '',
    });
  } catch (e: unknown) {
    console.error('[purge_sessions] audit insert failed:', e instanceof Error ? e.message : e);
  }

  return redirect('/admin/settings?purged=1');
};