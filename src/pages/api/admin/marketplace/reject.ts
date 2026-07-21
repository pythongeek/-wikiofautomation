import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
export const prerender = false;
import { listings, listings_queue, audit_log } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = await getSession(cookies);
  if (!session) return redirect('/admin/login');

  const formData = await request.formData();
  const id = Number(formData.get('id'));
  if (!id) return redirect('/admin/marketplace?status=pending&error=Invalid+id');

  await db.update(listings).set({ status: 'rejected' }).where(eq(listings.id, id));
  await db.insert(listings_queue).values({
    listing_id: id,
    submitted_by: session.email,
    reviewer_email: session.email,
    action: 'reject',
    reviewed_at: new Date(),
  });
  await db.insert(audit_log).values({
    user_email: session.email,
    action: 'reject',
    target_type: 'listing',
    target_id: String(id),
    ip_address: request.headers.get('x-forwarded-for') || '',
  });

  return redirect('/admin/marketplace?status=pending');
};

export const GET = POST;
