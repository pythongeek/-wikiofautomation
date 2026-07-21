import type { APIRoute } from 'astro';
export const prerender = false;

import { db } from '@/lib/db';
import { users, audit_log } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/argon';
import { createSession } from '@/lib/auth/session';
import { env, isAdminAuthConfigured } from '@/lib/env';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!isAdminAuthConfigured()) {
    return redirect('/admin/login?error=Admin+credentials+not+configured+at+runtime');
  }

  if (!email || !password) {
    return redirect('/admin/login?error=Email+and+password+are+required');
  }

  if (email !== env.ADMIN_EMAIL) {
    return redirect('/admin/login?error=Invalid+credentials');
  }

  const ok = await verifyPassword(env.ADMIN_PASSWORD_HASH, password);
  if (!ok) {
    return redirect('/admin/login?error=Invalid+credentials');
  }

  // Find or create user record
  let user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .then((rows) => rows[0]);

  if (!user) {
    const inserted = await db
      .insert(users)
      .values({ email, password_hash: env.ADMIN_PASSWORD_HASH })
      .returning();
    user = inserted[0];
  }

  await createSession(user.id, cookies);

  try {
    await db.insert(audit_log).values({
      user_email: email,
      action: 'login',
      target_type: 'session',
      ip_address: request.headers.get('x-forwarded-for') || '',
    });
  } catch (e) {
    console.error('audit log insert failed:', e);
  }

  return redirect('/admin/');
};