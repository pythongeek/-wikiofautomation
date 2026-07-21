import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
export const prerender = false;
import path from 'node:path';
import matter from 'gray-matter';
import { db } from '@/lib/db';
import { listings, audit_log } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = await getSession(cookies);
  if (!session) return redirect('/admin/login');

  const formData = await request.formData();
  const id = Number(formData.get('id'));
  if (!id) return redirect('/admin/marketplace?status=approved&error=Invalid+id');

  const listing = await db.select().from(listings).where(eq(listings.id, id)).then(r => r[0]);
  if (!listing) return redirect('/admin/marketplace?status=approved&error=Not+found');

  // Generate a slug from title
  const slug = listing.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `listing-${id}`;

  // Match the marketplace Zod schema (type, pricing, original_author, original_url required)
  const frontmatter: Record<string, any> = {
    title: listing.title,
    type: (listing.type || 'workflow') as 'agent' | 'workflow' | 'ai-os' | 'app' | 'prompt',
    pricing: (listing.pricing || 'free') as 'free' | 'paid' | 'freemium',
    original_author: listing.creator_email || listing.original_author || 'unknown',
    original_url: listing.original_url || `https://wikiofautomation.com/marketplace/${slug}`,
    attribution: listing.attribution || undefined,
    status: 'live',
    uses: 0,
    rating: 0,
    tags: [],
    created: new Date().toISOString().slice(0, 10),
    updated: new Date().toISOString().slice(0, 10),
  };

  if (listing.description) {
    frontmatter.summary = listing.description.slice(0, 280);
  }

  const md = matter.stringify(listing.description || '', frontmatter);
  const outPath = path.join(process.cwd(), 'src/content/marketplace', `${slug}.md`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, md, 'utf-8');

  await db.update(listings).set({ status: 'published', published_at: new Date() }).where(eq(listings.id, id));

  try {
    await db.insert(audit_log).values({
      user_email: session.email,
      action: 'publish',
      target_type: 'listing',
      target_id: String(id),
      ip_address: request.headers.get('x-forwarded-for') || '',
    });
  } catch (e) {
    console.error('audit log failed', e);
  }

  return redirect('/admin/marketplace?status=published');
};
