// Drizzle declarations mirror the STRICT SQL migration; checks and triggers live in migrations/.
import { sqliteTable, text, integer, real, blob, primaryKey } from 'drizzle-orm/sqlite-core';
export const people = sqliteTable('people', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  created_at: text('created_at').notNull(),
  owner_id: text('owner_id').notNull()
});

export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  at: text('at').notNull(),
  actor: text('actor').notNull(),
  tool: text('tool').notNull(),
  object_kind: text('object_kind').notNull(),
  object_id: text('object_id').notNull(),
  before_json: text('before_json'),
  after_json: text('after_json'),
  dump_id: text('dump_id'),
  run_id: text('run_id')
});

export const dumps = sqliteTable('dumps', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  text: text('text').notNull(),
  captured_at: text('captured_at').notNull(),
  captured_from: text('captured_from').notNull(),
  context_json: text('context_json'),
  is_ask: integer('is_ask').notNull(),
  status: text('status').notNull(),
  error: text('error'),
  idempotency_key: text('idempotency_key'),
  deleted_at: text('deleted_at'),
  purge_after: text('purge_after'),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull()
});

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  path: text('path').notNull(),
  mime: text('mime').notNull(),
  bytes: integer('bytes').notNull(),
  sha256: text('sha256').notNull(),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull()
});

export const dumpAttachments = sqliteTable('dump_attachments', {
  id: text('id').primaryKey(),
  dump_id: text('dump_id').notNull(),
  kind: text('kind').notNull(),
  url: text('url'),
  url_normalised: text('url_normalised'),
  title: text('title'),
  media_id: text('media_id'),
  position: integer('position').notNull(),
  owner_id: text('owner_id').notNull(),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull()
});

export const transcripts = sqliteTable('transcripts', {
  dump_id: text('dump_id').notNull(),
  media_id: text('media_id').notNull(),
  text: text('text').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  created_at: text('created_at').notNull(),
  owner_id: text('owner_id').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
}, (t) => [primaryKey({ columns: [t.dump_id, t.media_id] })]);

export const replies = sqliteTable('replies', {
  id: text('id').primaryKey(),
  dump_id: text('dump_id').notNull(),
  parts_json: text('parts_json').notNull(),
  run_id: text('run_id').notNull(),
  created_at: text('created_at').notNull(),
  owner_id: text('owner_id').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull()
});

export const signals = sqliteTable('signals', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  gist: text('gist').notNull(),
  note: text('note').notNull(),
  fetched_json: text('fetched_json'),
  embedding: blob('embedding'),
  seen_at: text('seen_at'),
  discarded_at: text('discarded_at'),
  merged_into_id: text('merged_into_id'),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id'),
  deleted_by_dump_id: text('deleted_by_dump_id')
});

export const signalSources = sqliteTable('signal_sources', {
  id: text('id').primaryKey(),
  signal_id: text('signal_id').notNull(),
  url: text('url'),
  url_normalised: text('url_normalised'),
  author: text('author'),
  published_at: text('published_at'),
  title: text('title'),
  own_observation: integer('own_observation').notNull(),
  position: integer('position').notNull(),
  owner_id: text('owner_id').notNull(),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
});

export const signalOrigins = sqliteTable('signal_origins', {
  signal_id: text('signal_id').notNull(),
  dump_id: text('dump_id').notNull(),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  owner_id: text('owner_id').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
}, (t) => [primaryKey({ columns: [t.signal_id, t.dump_id] })]);

export const tombstones = sqliteTable('tombstones', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  signal_id: text('signal_id').notNull(),
  gist: text('gist').notNull(),
  url_normalised: text('url_normalised'),
  embedding: blob('embedding'),
  created_at: text('created_at').notNull()
});

export const mentions = sqliteTable('mentions', {
  id: text('id').primaryKey(),
  object_kind: text('object_kind').notNull(),
  object_id: text('object_id').notNull(),
  dump_id: text('dump_id').notNull(),
  at: text('at').notNull(),
  created_by: text('created_by').notNull(),
  owner_id: text('owner_id').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
});

export const themes = sqliteTable('themes', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull(),
  retire_reason: text('retire_reason'),
  merged_into_id: text('merged_into_id'),
  seen_at: text('seen_at'),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id'),
  discarded_at: text('discarded_at')
});

export const signalThemes = sqliteTable('signal_themes', {
  signal_id: text('signal_id').notNull(),
  theme_id: text('theme_id').notNull(),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  owner_id: text('owner_id').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
}, (t) => [primaryKey({ columns: [t.signal_id, t.theme_id] })]);
