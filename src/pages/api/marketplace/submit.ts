// POST /api/marketplace/submit — Public Creator Tool Submission API Endpoint
import type { APIRoute } from 'astro';
import { db } from '~/lib/db';
import { listings, listings_queue } from '~/lib/db/schema';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    let title = '';
    let description = '';
    let category = 'agents';
    let type = 'agent';
    let pricing = 'free';
    let priceCents = 0;
    let creatorEmail = '';
    let originalUrl = '';
    let author = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      title = body.title || '';
      description = body.description || '';
      category = body.category || 'agents';
      type = body.type || 'agent';
      pricing = body.pricing || 'free';
      priceCents = Math.round(Number(body.price || 0) * 100);
      creatorEmail = body.creator_email || '';
      originalUrl = body.original_url || '';
      author = body.author || '';
    } else {
      const formData = await request.formData();
      title = String(formData.get('title') || '');
      description = String(formData.get('description') || '');
      category = String(formData.get('category') || 'agents');
      type = String(formData.get('type') || 'agent');
      pricing = String(formData.get('pricing') || 'free');
      priceCents = Math.round(Number(formData.get('price') || 0) * 100);
      creatorEmail = String(formData.get('creator_email') || '');
      originalUrl = String(formData.get('original_url') || '');
      author = String(formData.get('author') || '');
    }

    if (!title.trim() || !creatorEmail.trim()) {
      return new Response(JSON.stringify({ error: 'Title and creator email are required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    // 1. Insert new listing into SQLite `listings` table
    const [inserted] = await db
      .insert(listings)
      .values({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        type: type.trim(),
        pricing: pricing.trim(),
        price: priceCents,
        creator_email: creatorEmail.trim(),
        original_url: originalUrl.trim() || null,
        original_author: author.trim() || null,
        status: 'pending',
      })
      .returning();

    // 2. Add to `listings_queue`
    if (inserted?.id) {
      await db.insert(listings_queue).values({
        listing_id: inserted.id,
        submitted_by: creatorEmail.trim(),
        action: 'submit',
        notes: 'Submitted via creator publish portal',
      });
    }

    if (contentType.includes('application/json')) {
      return new Response(JSON.stringify({ success: true, listing_id: inserted?.id }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Redirect for HTML form submit
    return Response.redirect(new URL('/marketplace/publish?submitted=true', request.url), 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `Submission failed: ${msg}` }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
