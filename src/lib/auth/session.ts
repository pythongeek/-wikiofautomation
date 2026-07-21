import type { AstroCookies } from 'astro';
import { db } from '@/lib/db';
import { sessions } from '@/lib/db/schema';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

export interface Session {
  userId: number;
  email: string;
  expiresAt: Date;
}

const SESSION_COOKIE = 'session_token';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getSession(cookies: AstroCookies): Promise<Session | null> {
  const sessionToken = cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.session_token, sessionToken))
    .then((rows) => rows[0]);

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  const user = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, session.user_id))
    .then((rows) => rows[0]);

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    expiresAt: new Date(session.expires_at),
  };
}

export async function createSession(
  userId: number,
  cookies: AstroCookies
): Promise<string> {
  const sessionToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    user_id: userId,
    session_token: sessionToken,
    expires_at: expiresAt,
  });

  cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
    sameSite: 'strict',
  });

  return sessionToken;
}

export async function destroySession(cookies: AstroCookies): Promise<void> {
  const sessionToken = cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return;

  await db.delete(sessions).where(eq(sessions.session_token, sessionToken));
  cookies.delete(SESSION_COOKIE, { path: '/' });
}