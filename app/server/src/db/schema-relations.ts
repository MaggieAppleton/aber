// Drizzle declarations mirror the STRICT SQL migration; checks and triggers live in migrations/.
import { sqliteTable, text, integer, real, blob, primaryKey } from 'drizzle-orm/sqlite-core';
export const theories = sqliteTable('theories', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  claim: text('claim').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull(),
  retire_reason: text('retire_reason'),
  authorship: text('authorship').notNull(),
  horizon: integer('horizon'),
  tripwire: text('tripwire').notNull(),
  tripwire_version: integer('tripwire_version').notNull(),
  merged_into_id: text('merged_into_id'),
  seen_at: text('seen_at'),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id'),
  discarded_at: text('discarded_at')
});

export const theoryVersions = sqliteTable('theory_versions', {
  id: text('id').primaryKey(),
  theory_id: text('theory_id').notNull(),
  claim: text('claim').notNull(),
  body: text('body').notNull(),
  tripwire: text('tripwire').notNull(),
  horizon: integer('horizon'),
  at: text('at').notNull(),
  actor: text('actor').notNull(),
  owner_id: text('owner_id').notNull(),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
});

export const stances = sqliteTable('stances', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  person_id: text('person_id').notNull(),
  theory_id: text('theory_id').notNull(),
  confidence: integer('confidence').notNull(),
  note: text('note').notNull(),
  cause: text('cause').notNull(),
  suggestion_id: text('suggestion_id'),
  at: text('at').notNull()
});

export const theoryThemes = sqliteTable('theory_themes', {
  theory_id: text('theory_id').notNull(),
  theme_id: text('theme_id').notNull(),
  created_by: text('created_by').notNull(),
  owner_id: text('owner_id').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
}, (t) => [primaryKey({ columns: [t.theory_id, t.theme_id] })]);

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(),
  signal_id: text('signal_id').notNull(),
  theory_id: text('theory_id').notNull(),
  stance: text('stance').notNull(),
  note: text('note').notNull(),
  owner_id: text('owner_id').notNull(),
  run_id: text('run_id'),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull()
});

export const rivals = sqliteTable('rivals', {
  a_id: text('a_id').notNull(),
  b_id: text('b_id').notNull(),
  created_by: text('created_by').notNull(),
  owner_id: text('owner_id').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
}, (t) => [primaryKey({ columns: [t.a_id, t.b_id] })]);

export const follows = sqliteTable('follows', {
  theory_id: text('theory_id').notNull(),
  from_id: text('from_id').notNull(),
  created_by: text('created_by').notNull(),
  owner_id: text('owner_id').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
}, (t) => [primaryKey({ columns: [t.theory_id, t.from_id] })]);

export const prototypes = sqliteTable('prototypes', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  name: text('name').notNull(),
  body: text('body').notNull(),
  draft: integer('draft').notNull(),
  status: text('status').notNull(),
  links_json: text('links_json').notNull(),
  seen_at: text('seen_at'),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id'),
  discarded_at: text('discarded_at')
});

export const prototypeTheories = sqliteTable('prototype_theories', {
  prototype_id: text('prototype_id').notNull(),
  theory_id: text('theory_id').notNull(),
  created_by: text('created_by').notNull(),
  owner_id: text('owner_id').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
}, (t) => [primaryKey({ columns: [t.prototype_id, t.theory_id] })]);

export const prototypeMedia = sqliteTable('prototype_media', {
  prototype_id: text('prototype_id').notNull(),
  media_id: text('media_id').notNull(),
  position: integer('position').notNull(),
  owner_id: text('owner_id').notNull(),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
}, (t) => [primaryKey({ columns: [t.prototype_id, t.media_id] })]);

export const suggestions = sqliteTable('suggestions', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  kind: text('kind').notNull(),
  target_kind: text('target_kind').notNull(),
  target_id: text('target_id').notNull(),
  payload_json: text('payload_json').notNull(),
  reasoning: text('reasoning').notNull(),
  status: text('status').notNull(),
  run_id: text('run_id').notNull(),
  dump_id: text('dump_id'),
  decided_at: text('decided_at'),
  seen_at: text('seen_at'),
  created_at: text('created_at').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  decision_json: text('decision_json')
});

export const merges = sqliteTable('merges', {
  id: text('id').primaryKey(),
  owner_id: text('owner_id').notNull(),
  object_kind: text('object_kind').notNull(),
  survivor_id: text('survivor_id').notNull(),
  absorbed_id: text('absorbed_id').notNull(),
  snapshot_json: text('snapshot_json').notNull(),
  reasoning: text('reasoning').notNull(),
  actor: text('actor').notNull(),
  dump_id: text('dump_id'),
  created_at: text('created_at').notNull(),
  undone_at: text('undone_at'),
  undone_by: text('undone_by'),
  seen_at: text('seen_at'),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
});

export const jobs = sqliteTable('jobs', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  payload_json: text('payload_json').notNull(),
  status: text('status').notNull(),
  attempts: integer('attempts').notNull(),
  run_after: text('run_after').notNull(),
  locked_at: text('locked_at'),
  error: text('error'),
  dedupe_key: text('dedupe_key'),
  created_at: text('created_at').notNull(),
  owner_id: text('owner_id').notNull(),
  created_by: text('created_by').notNull(),
  updated_at: text('updated_at').notNull(),
  updated_by: text('updated_by').notNull(),
  run_id: text('run_id')
});

export const agentRuns = sqliteTable('agent_runs', {
  id: text('id').primaryKey(),
  job_id: text('job_id'),
  job: text('job').notNull(),
  attempt: integer('attempt').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  prompt_version: text('prompt_version').notNull(),
  input_tokens: integer('input_tokens'),
  output_tokens: integer('output_tokens'),
  cached_input_tokens: integer('cached_input_tokens'),
  cost_usd: real('cost_usd'),
  status: text('status').notNull(),
  error: text('error'),
  trace_json: text('trace_json'),
  started_at: text('started_at').notNull(),
  finished_at: text('finished_at'),
  owner_id: text('owner_id').notNull()
});

export const toolCalls = sqliteTable('tool_calls', {
  owner_id: text('owner_id').notNull(),
  run_id: text('run_id').notNull(),
  tool: text('tool').notNull(),
  key: text('key').notNull(),
  result_json: text('result_json').notNull(),
  created_at: text('created_at').notNull()
}, (t) => [primaryKey({ columns: [t.owner_id, t.run_id, t.tool, t.key] })]);
