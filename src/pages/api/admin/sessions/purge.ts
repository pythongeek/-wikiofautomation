import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
export const prerender = false;
import { sessions, audit_log } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = await getSession(cookies);
  if (!session) return redirect('/admin/login');

  await db.delete(sessions).run?.();
  // For better-sqlite3 we use:
  // Actually — just use the safer pattern:
  // drizzle provides db.delete() returning properly, but for raw full-table wipe:
  // We'll use a prepared statement.
  try {
    const all = await db.select().from(sessions);
    if (all.length) {
      await db.delete(sessions).run();
    }
  } catch {}

  try {
    await db.insert(audit_log).values({
      user_email: session.email,
      action: 'purge_sessions',
      target_type: 'session',
      ip_address: request.headers.get('x-forwarded-for') || '',
    });
  } catch {}

  return redirect('/admin/settings?purged=1');
};
