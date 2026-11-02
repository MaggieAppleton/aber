-- The single owner exists from the first migration, so a fresh database works
-- without the example seed (stances reference people). A fixed timestamp keeps
-- the migration deterministic; existing databases already have this row.
INSERT OR IGNORE INTO people (id, name, created_at, owner_id)
VALUES ('maggie', 'Maggie', '2026-11-02T00:00:00.000Z', 'maggie');
