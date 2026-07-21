import type { APIRoute } from 'astro';
import { destroySession } from '@/lib/auth/session';
export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  await destroySession(cookies);
  return redirect('/admin/login');
};
