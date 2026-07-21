import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
export const prerender = false;
import path from 'node:path';
import matter from 'gray-matter';
import { db } from '@/lib/db';
import { audit_log } from '@/lib/db/schema';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const { getSession } = await import('@/lib/auth/session');
  const session = await getSession(cookies);
  if (!session) return redirect('/admin/login');

  const formData = await request.formData();
  const originalSlug = String(formData.get('originalSlug') || '');
  const title = String(formData.get('title') || '');
  const slug = String(formData.get('slug') || originalSlug);
  const category = String(formData.get('category') || '');
  const tagsStr = String(formData.get('tags') || '');
  const summary = String(formData.get('summary') || '');
  const body = String(formData.get('body') || '');

  if (!originalSlug || !title || !slug) {
    return redirect('/admin/wiki?error=Missing+required+fields');
  }

  const tags = tagsStr
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const frontmatter: Record<string, any> = {
    title,
    category: category || undefined,
    tags,
    summary: summary || undefined,
    updated: new Date().toISOString().slice(0, 10),
  };

  // Preserve created date if slug unchanged
  if (originalSlug === slug) {
    try {
      const oldPath = path.join(process.cwd(), 'src/content/wiki', `${originalSlug}.md`);
      const oldRaw = await fs.readFile(oldPath, 'utf-8');
      const parsed = matter(oldRaw);
      if (parsed.data.created) frontmatter.created = parsed.data.created;
    } catch {}
  } else {
    frontmatter.created = new Date().toISOString().slice(0, 10);
  }

  const newContent = matter.stringify(body, frontmatter);

  // Write new file
  const newPath = path.join(process.cwd(), 'src/content/wiki', `${slug}.md`);
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  await fs.writeFile(newPath, newContent, 'utf-8');

  // Delete old file if slug changed
  if (originalSlug !== slug) {
    const oldPath = path.join(process.cwd(), 'src/content/wiki', `${originalSlug}.md`);
    try {
      await fs.unlink(oldPath);
    } catch {}
  }

  // Queue embed regeneration (delete cache + signal)
  // TODO: invalidate RAG index for this slug

  // Audit log
  try {
    await db.insert(audit_log).values({
      user_email: session.email,
      action: 'update',
      target_type: 'wiki_entry',
      target_id: slug,
      ip_address: request.headers.get('x-forwarded-for') || '',
    });
  } catch (e) {
    console.error('audit log failed:', e);
  }

  return redirect(`/admin/wiki/${slug}?saved=1`);
};
