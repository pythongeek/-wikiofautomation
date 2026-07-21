import type { APIRoute } from 'astro';
export const prerender = false;

import { hashPassword, verifyPassword } from '@/lib/auth/argon';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { audit_log, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = await getSession(cookies);
  if (!session) return redirect('/admin/login?error=Not+authenticated');

  const formData = await request.formData();
  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!current || !next || !confirm) {
    return redirect('/admin/settings?error=All+fields+required');
  }
  if (next !== confirm) {
    return redirect('/admin/settings?error=New+password+mismatch');
  }
  if (next.length < 12) {
    return redirect('/admin/settings?error=New+password+must+be+≥+12+chars');
  }
  if (next === current) {
    return redirect('/admin/settings?error=New+password+must+differ+from+current');
  }

  // Verify current password against ADMIN_PASSWORD_HASH env (we never store plaintext)
  const adminHash = process.env.ADMIN_PASSWORD_HASH || '';
  const ok = await verifyPassword(adminHash, current);
  if (!ok) return redirect('/admin/settings?error=Current+password+incorrect');

  // Compute new hash
  const newHash = await hashPassword(next);

  // Update users table row for this admin
  try {
    await db.update(users)
      .set({ password_hash: newHash, updated_at: new Date() })
      .where(eq(users.email, session.email));
  } catch (e) {
    console.error('password update failed', e);
    return redirect('/admin/settings?error=Update+failed');
  }

  // Audit
  try {
    await db.insert(audit_log).values({
      user_email: session.email,
      action: 'change_password',
      target_type: 'user',
      target_id: session.email,
      ip_address: request.headers.get('x-forwarded-for') || '',
    });
  } catch {}

  // ⚠️ The runtime env var ADMIN_PASSWORD_HASH still has the OLD value.
  // Until we ship an env-var hot-reload (or move password to DB-only),
  // the password change is effective only after a process restart with
  // a freshly-updated ADMIN_PASSWORD_HASH.
  return redirect('/admin/settings?msg=Password+updated+in+DB.+Note:+env+var+ADMIN_PASSWORD_HASH+still+holds+the+old+hash+until+restart.+Update+env+and+restart+for+full+effect.');
};