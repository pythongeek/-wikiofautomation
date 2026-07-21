import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
export const prerender = false;
import path from 'node:path';
import matter from 'gray-matter';
import { db } from '@/lib/db';
import { audit_log } from '@/lib/db/schema';
import { getSession } from '@/lib/auth/session';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = await getSession(cookies);
  if (!session) return redirect('/admin/login');

  const formData = await request.formData();
  const originalSlug = String(formData.get('originalSlug') || '');
  const title = String(formData.get('title') || '');
  const slug = String(formData.get('slug') || originalSlug);
  const excerpt = String(formData.get('excerpt') || '');
  const published = String(formData.get('published') || new Date().toISOString().slice(0, 10));
  const body = String(formData.get('body') || '');

  if (!originalSlug || !title || !slug) return redirect('/admin/news?error=Missing+fields');

  const frontmatter: Record<string, any> = {
    title,
    excerpt: excerpt || undefined,
    published,
    kind: 'digest',
  };

  // Preserve any existing kind if we can read it
  if (originalSlug === slug) {
    try {
      const oldPath = path.join(process.cwd(), 'src/content/news', `${originalSlug}.md`);
      const oldRaw = await fs.readFile(oldPath, 'utf-8');
      const parsed = matter(oldRaw);
      if (parsed.data.kind) frontmatter.kind = parsed.data.kind;
      if (parsed.data.author) frontmatter.author = parsed.data.author;
      if (parsed.data.sources) frontmatter.sources = parsed.data.sources;
    } catch {}
  }

  const md = matter.stringify(body, frontmatter);
  const newPath = path.join(process.cwd(), 'src/content/news', `${slug}.md`);
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  await fs.writeFile(newPath, md, 'utf-8');

  if (originalSlug !== slug) {
    try {
      const oldPath = path.join(process.cwd(), 'src/content/news', `${originalSlug}.md`);
      await fs.unlink(oldPath);
    } catch {}
  }

  try {
    await db.insert(audit_log).values({
      user_email: session.email,
      action: 'update',
      target_type: 'news_post',
      target_id: slug,
      ip_address: request.headers.get('x-forwarded-for') || '',
    });
  } catch (e) {
    console.error('audit log failed', e);
  }

  return redirect(`/admin/news/${slug}?saved=1`);
};
