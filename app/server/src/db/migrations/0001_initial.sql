
CREATE TABLE people (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL,
 owner_id TEXT NOT NULL DEFAULT 'maggie'
) STRICT;


CREATE TABLE events (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, at TEXT NOT NULL,
  actor TEXT NOT NULL,
  tool TEXT NOT NULL,
  object_kind TEXT NOT NULL, object_id TEXT NOT NULL,
  before_json TEXT, after_json TEXT,
  dump_id TEXT,
 run_id TEXT REFERENCES agent_runs(id)
) STRICT;
CREATE INDEX events_object ON events(object_kind, object_id);
CREATE INDEX events_dump ON events(dump_id);


CREATE TABLE dumps (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  captured_at TEXT NOT NULL,
  captured_from TEXT NOT NULL CHECK (captured_from IN ('shortcut','web','column')),
  context_json TEXT,
  is_ask INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('received','transcribing','processing','done','failed')),
  error TEXT,
  idempotency_key TEXT UNIQUE,
  deleted_at TEXT, purge_after TEXT
  , created_at TEXT NOT NULL, created_by TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL
) STRICT;

CREATE TABLE media (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  path TEXT NOT NULL,
  mime TEXT NOT NULL, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, created_at TEXT NOT NULL,
 created_by TEXT NOT NULL DEFAULT 'person:maggie',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_by TEXT NOT NULL DEFAULT 'person:maggie'
) STRICT;

CREATE TABLE dump_attachments (
  id TEXT PRIMARY KEY, dump_id TEXT NOT NULL REFERENCES dumps(id),
  kind TEXT NOT NULL CHECK (kind IN ('link','image','audio','file')),
  url TEXT, url_normalised TEXT, title TEXT, media_id TEXT REFERENCES media(id),
  position INTEGER NOT NULL,
 owner_id TEXT NOT NULL DEFAULT 'maggie',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 created_by TEXT NOT NULL DEFAULT 'person:maggie',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_by TEXT NOT NULL DEFAULT 'person:maggie'
) STRICT;

CREATE TABLE transcripts (
  dump_id TEXT NOT NULL REFERENCES dumps(id), media_id TEXT NOT NULL REFERENCES media(id),
  text TEXT NOT NULL, provider TEXT NOT NULL, model TEXT NOT NULL, created_at TEXT NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'maggie', created_by TEXT NOT NULL DEFAULT 'person:maggie', updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_by TEXT NOT NULL DEFAULT 'person:maggie',
 run_id TEXT REFERENCES agent_runs(id),
 PRIMARY KEY (dump_id, media_id)
) STRICT;


CREATE TABLE replies (
  id TEXT PRIMARY KEY, dump_id TEXT NOT NULL REFERENCES dumps(id),
  parts_json TEXT NOT NULL DEFAULT '[]',
  run_id TEXT NOT NULL REFERENCES agent_runs(id), created_at TEXT NOT NULL,
 owner_id TEXT NOT NULL DEFAULT 'maggie',
 created_by TEXT NOT NULL DEFAULT 'person:maggie',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_by TEXT NOT NULL DEFAULT 'person:maggie'
) STRICT;


CREATE TABLE signals (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  gist TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
  fetched_json TEXT,
  embedding BLOB,
  seen_at TEXT,
  discarded_at TEXT,
  merged_into_id TEXT REFERENCES signals(id)
  , created_at TEXT NOT NULL, created_by TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
 run_id TEXT REFERENCES agent_runs(id),
 deleted_by_dump_id TEXT REFERENCES dumps(id)
) STRICT;

CREATE TABLE signal_sources (
  id TEXT PRIMARY KEY, signal_id TEXT NOT NULL REFERENCES signals(id),
  url TEXT, url_normalised TEXT, author TEXT, published_at TEXT, title TEXT,
  own_observation INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL,
 owner_id TEXT NOT NULL DEFAULT 'maggie',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 created_by TEXT NOT NULL DEFAULT 'person:maggie',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_by TEXT NOT NULL DEFAULT 'person:maggie',
 run_id TEXT REFERENCES agent_runs(id)
) STRICT;
CREATE INDEX signal_sources_url ON signal_sources(url_normalised);

CREATE TABLE signal_origins (
  signal_id TEXT NOT NULL REFERENCES signals(id), dump_id TEXT NOT NULL REFERENCES dumps(id),
  created_at TEXT NOT NULL, created_by TEXT NOT NULL, owner_id TEXT NOT NULL DEFAULT 'maggie', updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_by TEXT NOT NULL DEFAULT 'person:maggie', run_id TEXT REFERENCES agent_runs(id),
 PRIMARY KEY (signal_id, dump_id)
) STRICT;

CREATE TABLE tombstones (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, signal_id TEXT NOT NULL,
  gist TEXT NOT NULL, url_normalised TEXT, embedding BLOB, created_at TEXT NOT NULL
) STRICT;
CREATE INDEX tombstones_url ON tombstones(url_normalised);

CREATE TABLE mentions (
  id TEXT PRIMARY KEY, object_kind TEXT NOT NULL CHECK (object_kind IN ('signal','theme','theory')),
  object_id TEXT NOT NULL, dump_id TEXT NOT NULL REFERENCES dumps(id), at TEXT NOT NULL, created_by TEXT NOT NULL,
 owner_id TEXT NOT NULL DEFAULT 'maggie',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_by TEXT NOT NULL DEFAULT 'person:maggie',
 run_id TEXT REFERENCES agent_runs(id)
) STRICT;


CREATE TABLE themes (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','mine','retired')),
  retire_reason TEXT CHECK (retire_reason IN ('disproven','superseded','abandoned')),
  merged_into_id TEXT REFERENCES themes(id), seen_at TEXT
  , created_at TEXT NOT NULL, created_by TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
 run_id TEXT REFERENCES agent_runs(id),
 discarded_at TEXT
) STRICT;

CREATE TABLE signal_themes (
  signal_id TEXT NOT NULL REFERENCES signals(id), theme_id TEXT NOT NULL REFERENCES themes(id),
  created_at TEXT NOT NULL, created_by TEXT NOT NULL, owner_id TEXT NOT NULL DEFAULT 'maggie', updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_by TEXT NOT NULL DEFAULT 'person:maggie', run_id TEXT REFERENCES agent_runs(id),
 PRIMARY KEY (signal_id, theme_id)
) STRICT;


CREATE TABLE theories (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  claim TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft','held','retired')),
  retire_reason TEXT CHECK (retire_reason IN ('disproven','superseded','abandoned')),
  authorship TEXT NOT NULL CHECK (authorship IN ('agent','rephrased','mine')),
  horizon INTEGER,
  tripwire TEXT NOT NULL DEFAULT '',
  tripwire_version INTEGER NOT NULL DEFAULT 0,
  merged_into_id TEXT REFERENCES theories(id), seen_at TEXT
  , created_at TEXT NOT NULL, created_by TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
 run_id TEXT REFERENCES agent_runs(id),
 discarded_at TEXT
) STRICT;

CREATE TABLE theory_versions (
  id TEXT PRIMARY KEY, theory_id TEXT NOT NULL REFERENCES theories(id),
  claim TEXT NOT NULL, body TEXT NOT NULL, tripwire TEXT NOT NULL, horizon INTEGER,
  at TEXT NOT NULL, actor TEXT NOT NULL,
 owner_id TEXT NOT NULL DEFAULT 'maggie',
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 created_by TEXT NOT NULL DEFAULT 'person:maggie',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_by TEXT NOT NULL DEFAULT 'person:maggie',
 run_id TEXT REFERENCES agent_runs(id)
) STRICT;


CREATE TABLE stances (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, person_id TEXT NOT NULL REFERENCES people(id),
  theory_id TEXT NOT NULL REFERENCES theories(id),
  confidence INTEGER NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  note TEXT NOT NULL DEFAULT '',
  cause TEXT NOT NULL CHECK (cause IN ('set','accepted_draft','challenge_accepted','undo')),
  suggestion_id TEXT REFERENCES suggestions(id),
  at TEXT NOT NULL
) STRICT;
CREATE TRIGGER stances_no_update BEFORE UPDATE ON stances BEGIN SELECT RAISE(ABORT, 'stances are append-only'); END;
CREATE TRIGGER stances_no_delete BEFORE DELETE ON stances BEGIN SELECT RAISE(ABORT, 'stances are append-only'); END;

CREATE TABLE theory_themes (
  theory_id TEXT NOT NULL REFERENCES theories(id), theme_id TEXT NOT NULL REFERENCES themes(id),
  created_by TEXT NOT NULL, owner_id TEXT NOT NULL DEFAULT 'maggie', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_by TEXT NOT NULL DEFAULT 'person:maggie', run_id TEXT REFERENCES agent_runs(id),
 PRIMARY KEY (theory_id, theme_id)
) STRICT;

CREATE TABLE evidence (
  id TEXT PRIMARY KEY, signal_id TEXT NOT NULL REFERENCES signals(id), theory_id TEXT NOT NULL REFERENCES theories(id),
  stance TEXT NOT NULL CHECK (stance IN ('supports','undermines')), note TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL DEFAULT 'maggie', run_id TEXT REFERENCES agent_runs(id),
 created_at TEXT NOT NULL, created_by TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
 UNIQUE (signal_id, theory_id)
) STRICT;

CREATE TABLE rivals (a_id TEXT NOT NULL, b_id TEXT NOT NULL, created_by TEXT NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'maggie', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_by TEXT NOT NULL DEFAULT 'person:maggie',
 run_id TEXT REFERENCES agent_runs(id),
 PRIMARY KEY (a_id, b_id), CHECK (a_id < b_id)) STRICT;
CREATE TABLE follows (theory_id TEXT NOT NULL, from_id TEXT NOT NULL, created_by TEXT NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'maggie', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_by TEXT NOT NULL DEFAULT 'person:maggie', run_id TEXT REFERENCES agent_runs(id),
 PRIMARY KEY (theory_id, from_id)) STRICT;


CREATE TABLE prototypes (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, name TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
  draft INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('idea','building','built','shelved')),
  links_json TEXT NOT NULL DEFAULT '[]', seen_at TEXT
  , created_at TEXT NOT NULL, created_by TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL,
 run_id TEXT REFERENCES agent_runs(id),
 discarded_at TEXT
) STRICT;
CREATE TABLE prototype_theories (prototype_id TEXT NOT NULL, theory_id TEXT NOT NULL, created_by TEXT NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'maggie', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_by TEXT NOT NULL DEFAULT 'person:maggie', run_id TEXT REFERENCES agent_runs(id),
 PRIMARY KEY (prototype_id, theory_id)) STRICT;
CREATE TABLE prototype_media (prototype_id TEXT NOT NULL, media_id TEXT NOT NULL, position INTEGER NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'maggie', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), created_by TEXT NOT NULL DEFAULT 'person:maggie', updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_by TEXT NOT NULL DEFAULT 'person:maggie',
 run_id TEXT REFERENCES agent_runs(id),
 PRIMARY KEY (prototype_id, media_id)) STRICT;


CREATE TABLE suggestions (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('evidence','revision','merge','challenge')),
  target_kind TEXT NOT NULL, target_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,

  reasoning TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','discarded')),
  run_id TEXT NOT NULL REFERENCES agent_runs(id), dump_id TEXT,
  decided_at TEXT, seen_at TEXT, created_at TEXT NOT NULL,
 created_by TEXT NOT NULL DEFAULT 'person:maggie',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_by TEXT NOT NULL DEFAULT 'person:maggie',
 decision_json TEXT
) STRICT;
CREATE INDEX suggestions_target ON suggestions(target_kind, target_id, status);


CREATE TABLE merges (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL,
  object_kind TEXT NOT NULL CHECK (object_kind = 'signal'),
  survivor_id TEXT NOT NULL, absorbed_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  reasoning TEXT NOT NULL, actor TEXT NOT NULL, dump_id TEXT,
  created_at TEXT NOT NULL, undone_at TEXT, undone_by TEXT, seen_at TEXT,
 created_by TEXT NOT NULL DEFAULT 'person:maggie',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_by TEXT NOT NULL DEFAULT 'person:maggie',
 run_id TEXT REFERENCES agent_runs(id)
) STRICT;


CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('transcribe','process_dump','link_evidence','tripwire','purge_bin',
                                     'cluster','red_team','extrapolate','diagnosticity','dedupe')),
  payload_json TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('queued','running','done','failed')),
  attempts INTEGER NOT NULL DEFAULT 0, run_after TEXT NOT NULL, locked_at TEXT, error TEXT,
  dedupe_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
 owner_id TEXT NOT NULL DEFAULT 'maggie',
 created_by TEXT NOT NULL DEFAULT 'person:maggie',
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_by TEXT NOT NULL DEFAULT 'person:maggie',
 run_id TEXT REFERENCES agent_runs(id)
) STRICT;



CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY, job_id TEXT REFERENCES jobs(id),
  job TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  provider TEXT NOT NULL, model TEXT NOT NULL, prompt_version TEXT NOT NULL,
  input_tokens INTEGER, output_tokens INTEGER, cached_input_tokens INTEGER, cost_usd REAL,
  status TEXT NOT NULL CHECK (status IN ('running','done','failed','cleared')),
  error TEXT, trace_json TEXT,
  started_at TEXT NOT NULL, finished_at TEXT,
 owner_id TEXT NOT NULL DEFAULT 'maggie'
) STRICT;

CREATE TABLE tool_calls (owner_id TEXT NOT NULL, run_id TEXT NOT NULL REFERENCES agent_runs(id), tool TEXT NOT NULL, key TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(owner_id, run_id, tool, key)) STRICT;
CREATE INDEX jobs_ready ON jobs(status,run_after,created_at);
CREATE INDEX signals_live ON signals(owner_id,discarded_at,merged_into_id);
CREATE INDEX stances_latest ON stances(theory_id,at DESC);
CREATE INDEX signal_origins_dump ON signal_origins(dump_id);
CREATE INDEX events_run ON events(run_id);
