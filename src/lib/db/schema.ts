import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Use unix-timestamp integers (Astro/Vite-compatible, no sqlite driver quirks)
const ts = (name: string) => integer(name, { mode: 'timestamp' });

// Users table for admin auth
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: ts('created_at').$defaultFn(() => new Date()),
  updated_at: ts('updated_at').$defaultFn(() => new Date()),
});

// Session table for JWT-based auth
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  session_token: text('session_token').notNull().unique(),
  expires_at: ts('expires_at').notNull(),
  created_at: ts('created_at').$defaultFn(() => new Date()),
});

// Wiki entries metadata (for admin UI)
export const wiki_entries = sqliteTable('wiki_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  category: text('category'),
  status: text('status').default('draft'),
  last_updated: ts('last_updated').$defaultFn(() => new Date()),
  created_at: ts('created_at').$defaultFn(() => new Date()),
});

// Marketplace listings
export const listings = sqliteTable('listings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category'),
  type: text('type'),
  pricing: text('pricing'),
  original_author: text('original_author'),
  original_url: text('original_url'),
  attribution: text('attribution'),
  price: integer('price'),
  creator_email: text('creator_email'),
  status: text('status').default('pending'),
  published_at: ts('published_at'),
  created_at: ts('created_at').$defaultFn(() => new Date()),
});

// Marketplace queue (pending submissions)
export const listings_queue = sqliteTable('listings_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  listing_id: integer('listing_id').notNull().references(() => listings.id),
  submitted_by: text('submitted_by').notNull(),
  submitted_at: ts('submitted_at').$defaultFn(() => new Date()),
  reviewed_at: ts('reviewed_at'),
  reviewer_email: text('reviewer_email'),
  action: text('action'),
  notes: text('notes'),
});

// Ada query log
export const ada_queries = sqliteTable('ada_queries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  query: text('query').notNull(),
  intent: text('intent'),
  response: text('response'),
  cost_cents: integer('cost_cents'),
  latency_ms: integer('latency_ms'),
  user_email: text('user_email'),
  created_at: ts('created_at').$defaultFn(() => new Date()),
});

// Audit log for admin actions
export const audit_log = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_email: text('user_email').notNull(),
  action: text('action').notNull(),
  target_type: text('target_type'),
  target_id: text('target_id'),
  details: text('details'),
  ip_address: text('ip_address'),
  created_at: ts('created_at').$defaultFn(() => new Date()),
});